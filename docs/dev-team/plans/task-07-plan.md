# Task 07 Plan: Tool Controller and Maintenance Feature Tests

**Task ID:** TASK-07
**Group:** 3 (Tests)
**Agent:** backend-laravel
**Depends on:** TASK-01, TASK-02, TASK-03
**Estimated complexity:** medium

---

## 1. Approach

Fully replace `tests/Feature/ToolControllerTest.php` with ~25 comprehensive tests. The
existing file contains 4 minimal stub tests that lack setUp, use incorrect naming conventions
(`test_` prefix rather than `#[Test]` attribute), and make no meaningful assertions.

The new test class follows the exact structural pattern from `MaterialControllerTest.php`:

- `RefreshDatabase` trait
- `private User $user` field
- `setUp()` calling `User::factory()->create()`
- All test methods use `#[Test]` attribute (not `@test` docblock, not `test_` prefix)
- All requests use `$this->actingAs($this->user)`
- Factories for all test data; no manual DB seeding

The test suite covers six concern groups:
1. Auth / access gate
2. Resource controller actions (index, create, store, show, edit, update, destroy)
3. Maintenance log creation and validation
4. Schedule management (create, validate, hard delete)
5. Schedule-driven next_due_at recalculation
6. MaintenanceSchedule model scopes and boolean helpers (no HTTP; direct model assertions)

---

## 2. Files to Modify

| Action | Path |
|--------|------|
| Full replacement | `tests/Feature/ToolControllerTest.php` |

No other files are modified by this task.

---

## 3. Dependencies on Prior Tasks

TASK-07 tests the code produced by three backend tasks. The table below lists what each
dependency provides and which tests rely on it.

| Dependency | What It Provides | Tests That Rely On It |
|------------|-----------------|----------------------|
| TASK-01 | ToolController: index, create, store, show, edit, update, destroy; destroy route registered | All controller action tests |
| TASK-02 | ToolController: logMaintenance, storeSchedule, destroySchedule; schedule sub-resource routes; StoreMaintenanceScheduleRequest | Log maintenance tests; schedule CRUD tests |
| TASK-03 | MaintenanceSchedule: scopeOverdue, scopeDueSoon, isOverdue(), isDueSoon(), is_overdue/is_due_soon accessors | Model scope tests |

---

## 4. Route Reference

All routes exercised by the tests, with the HTTP method and URI each test will hit:

| Named Route | Method | URI | Tests Using It |
|-------------|--------|-----|----------------|
| `tools.index` | GET | `/tools` | guest_is_redirected, view_tools_index, index_filters_by_category, index_search_returns_tools |
| `tools.create` | GET | `/tools/create` | create_page_returns_categories_and_maintenance_types |
| `tools.store` | POST | `/tools` | store_creates_tool, store_requires_name, store_rejects_invalid_category_id, store_rejects_invalid_manual_url |
| `tools.show` | GET | `/tools/{tool}` | show_returns_tool_with_maintenance_data |
| `tools.edit` | GET | `/tools/{tool}/edit` | edit_returns_tool_with_categories |
| `tools.update` | PATCH | `/tools/{tool}` | update_saves_changes, update_with_invalid_purchase_price |
| `tools.destroy` | DELETE | `/tools/{tool}` | destroy_soft_deletes_tool |
| `tools.log-maintenance` | POST | `/tools/{tool}/maintenance` | log_maintenance_creates_log_entry, log_maintenance_requires_* (3 tests), log_maintenance_updates_schedule_next_due_at |
| `tools.schedules.store` | POST | `/tools/{tool}/schedules` | store_schedule_creates_maintenance_schedule, store_schedule_requires_task, store_schedule_requires_at_least_one_interval |
| `tools.schedules.destroy` | DELETE | `/tools/{tool}/schedules/{schedule}` | destroy_schedule_hard_deletes_schedule |

---

## 5. Complete Test Inventory (25 tests)

### 5.1 Auth / Access (1 test)

**`guest_is_redirected_from_tools`**
- Request: `$this->get('/tools')` (no actingAs)
- Assert: `assertRedirect('/login')`
- Rationale: confirms the `auth` + `verified` middleware is on the tools route group

---

### 5.2 Index (3 tests)

**`authenticated_user_can_view_tools_index`**
- Request: `$this->actingAs($this->user)->get('/tools')`
- Assert: `assertOk()`
- Assert: `assertInertia(fn ($page) => $page->component('Tools/Index')->has('tools')->has('filters')->has('categories'))`
- Rationale: verifies the three required props are passed (from TASK-01 controller spec)

**`index_filters_by_category`**
- Setup: `ToolCategory::factory()->create()` twice (categoryA, categoryB); `Tool::factory()->create(['category_id' => $categoryA->id])` and one for categoryB
- Request: `$this->actingAs($this->user)->get('/tools?category=' . $categoryA->id)`
- Assert: `assertOk()`
- Assert: `assertInertia(fn ($page) => $page->has('tools.data', 1))`
- Rationale: the `when()` filter on `category_id` must narrow the paginated result to exactly one record

**`index_search_returns_tools`**
- Setup: `Tool::factory()->create(['name' => 'UniqueToolName99999'])`
- Request: `$this->actingAs($this->user)->get('/tools?search=UniqueToolName99999')`
- Assert: `assertOk()`
- Rationale: confirms the Scout database driver executes without error; Scout integration is lightweight so we check status only (same approach as MaterialControllerTest)

---

### 5.3 Create (1 test)

**`create_page_returns_categories_and_maintenance_types`**
- Request: `$this->actingAs($this->user)->get('/tools/create')`
- Assert: `assertOk()`
- Assert: `assertInertia(fn ($page) => $page->component('Tools/Create')->has('categories')->has('maintenanceTypes'))`
- Rationale: create page must supply both lookup datasets to the frontend form (from TASK-01 create spec)

---

### 5.4 Store (4 tests)

**`store_creates_tool_and_redirects_to_show`**
- Request: `$this->actingAs($this->user)->post('/tools', ['name' => 'Test Tool'])`
- Assert: `assertDatabaseHas('tools', ['name' => 'Test Tool'])`
- Assert: `assertRedirect(route('tools.show', Tool::where('name', 'Test Tool')->first()))`
- Rationale: happy path — minimum valid payload (name only); confirms record creation and correct redirect

**`store_requires_name`**
- Request: `$this->actingAs($this->user)->post('/tools', [])` (empty body)
- Assert: `assertSessionHasErrors(['name'])`
- Rationale: StoreToolRequest has `name` as `required`

**`store_rejects_invalid_category_id`**
- Request: post with `['name' => 'Test Tool', 'category_id' => 'not-a-valid-ulid']`
- Assert: `assertSessionHasErrors(['category_id'])`
- Rationale: StoreToolRequest validates `category_id` as `ulid` + `Rule::exists('tool_categories', 'id')`; a non-ULID string should fail the `ulid` rule before `exists` is even evaluated

**`store_rejects_invalid_manual_url`**
- Request: post with `['name' => 'Test Tool', 'manual_url' => 'not-a-url']`
- Assert: `assertSessionHasErrors(['manual_url'])`
- Rationale: StoreToolRequest validates `manual_url` as `url`

---

### 5.5 Show (1 test)

**`show_returns_tool_with_maintenance_data`**
- Setup: `Tool::factory()->create()`
- Request: `$this->actingAs($this->user)->get('/tools/' . $tool->id)`
- Assert: `assertOk()`
- Assert: `assertInertia(fn ($page) => $page->component('Tools/Show')->has('tool')->has('maintenanceTypes'))`
- Rationale: show must return both props; maintenanceTypes powers the log form on the frontend

---

### 5.6 Edit (1 test)

**`edit_returns_tool_with_categories`**
- Setup: `Tool::factory()->create()`
- Request: `$this->actingAs($this->user)->get('/tools/' . $tool->id . '/edit')`
- Assert: `assertOk()`
- Assert: `assertInertia(fn ($page) => $page->component('Tools/Edit')->has('tool')->has('categories'))`
- Rationale: edit form needs the existing tool data and the categories lookup for the select field

---

### 5.7 Update (2 tests)

**`update_saves_changes_and_redirects_to_show`**
- Setup: `Tool::factory()->create(['name' => 'Original Name'])`
- Request: `$this->actingAs($this->user)->patch('/tools/' . $tool->id, ['name' => 'Updated Name'])`
- Assert: `assertDatabaseHas('tools', ['id' => $tool->id, 'name' => 'Updated Name'])`
- Assert: `assertRedirect(route('tools.show', $tool))`
- Rationale: happy path update; `sometimes` prefixed rules allow partial updates

**`update_with_invalid_purchase_price_returns_error`**
- Setup: `Tool::factory()->create()`
- Request: `$this->actingAs($this->user)->patch('/tools/' . $tool->id, ['purchase_price' => 'not-a-number'])`
- Assert: `assertSessionHasErrors(['purchase_price'])`
- Rationale: UpdateToolRequest validates `purchase_price` as `numeric`; arbitrary strings must fail

---

### 5.8 Destroy (1 test)

**`destroy_soft_deletes_tool`**
- Setup: `Tool::factory()->create()`
- Request: `$this->actingAs($this->user)->delete('/tools/' . $tool->id)`
- Assert: `assertRedirect(route('tools.index'))`
- Assert: `assertSoftDeleted('tools', ['id' => $tool->id])`
- Rationale: Tool uses `SoftDeletes`; the record must remain in the table with a non-null `deleted_at`; route is registered after TASK-01 removes `.except(['destroy'])`

---

### 5.9 Log Maintenance (5 tests)

**`log_maintenance_creates_log_entry`**
- Setup: `Tool::factory()->create()`
- Request: post to `/tools/{tool->id}/maintenance` with:
  ```
  maintenance_type = 'cleaning'
  description      = 'Test maintenance'
  performed_at     = '2026-03-01'
  ```
- Assert: `assertDatabaseHas('maintenance_logs', ['tool_id' => $tool->id, 'description' => 'Test maintenance'])`
- Assert: `assertRedirect(route('tools.show', $tool))`
- Rationale: happy path — confirms log row is created and controller redirects correctly

**`log_maintenance_requires_maintenance_type`**
- Setup: `Tool::factory()->create()`
- Request: post without `maintenance_type` (description and performed_at present)
- Assert: `assertSessionHasErrors(['maintenance_type'])`
- Rationale: LogMaintenanceRequest has `maintenance_type` as `required` with `Rule::enum(MaintenanceType::class)`

**`log_maintenance_requires_description`**
- Setup: `Tool::factory()->create()`
- Request: post without `description` (maintenance_type and performed_at present)
- Assert: `assertSessionHasErrors(['description'])`
- Rationale: LogMaintenanceRequest has `description` as `required`

**`log_maintenance_requires_performed_at`**
- Setup: `Tool::factory()->create()`
- Request: post without `performed_at` (maintenance_type and description present)
- Assert: `assertSessionHasErrors(['performed_at'])`
- Rationale: LogMaintenanceRequest has `performed_at` as `required`

**`log_maintenance_updates_schedule_next_due_at`**
- Setup:
  ```php
  $tool = Tool::factory()->create();
  $schedule = MaintenanceSchedule::factory()->create([
      'tool_id'       => $tool->id,
      'interval_days' => 30,
      'next_due_at'   => null,
  ]);
  ```
- Request: post to `/tools/{tool->id}/maintenance` with:
  ```
  maintenance_type = 'cleaning'
  description      = 'Scheduled cleaning'
  performed_at     = '2026-03-01'
  schedule_id      = {schedule->id}
  ```
- Assert: reload schedule from DB (`$schedule->fresh()`)
- Assert: `$schedule->last_performed_at->toDateString() === '2026-03-01'`
- Assert: `$schedule->next_due_at->toDateString() === '2026-03-31'` (30 days after performed_at)
- Rationale: the logMaintenance controller method must update the linked schedule's `last_performed_at` and recompute `next_due_at` using `interval_days`

---

### 5.10 Schedule Management (4 tests)

**`store_schedule_creates_maintenance_schedule`**
- Setup: `Tool::factory()->create()`
- Request: post to `/tools/{tool->id}/schedules` with:
  ```
  maintenance_type = 'cleaning'
  task             = 'Sharpen blade'
  interval_days    = 30
  ```
- Assert: `assertDatabaseHas('maintenance_schedules', ['tool_id' => $tool->id, 'task' => 'Sharpen blade'])`
- Assert: `assertRedirect(route('tools.show', $tool))`
- Rationale: happy path schedule creation

**`store_schedule_requires_task`**
- Setup: `Tool::factory()->create()`
- Request: post to `/tools/{tool->id}/schedules` without `task` field (maintenance_type and interval_days present)
- Assert: `assertSessionHasErrors(['task'])`
- Rationale: StoreMaintenanceScheduleRequest validates `task` as `required`

**`store_schedule_requires_at_least_one_interval`**
- Setup: `Tool::factory()->create()`
- Request: post to `/tools/{tool->id}/schedules` with:
  ```
  maintenance_type = 'cleaning'
  task             = 'Some task'
  ```
  (no `interval_days`, no `interval_hours`)
- Assert: `assertSessionHasErrors(['interval_days'])`
- Rationale: StoreMaintenanceScheduleRequest uses `withValidator` to add an `after` rule that requires at least one interval; the error key added is `interval_days`

**`destroy_schedule_hard_deletes_schedule`**
- Setup: `$tool = Tool::factory()->create()`, then `$schedule = MaintenanceSchedule::factory()->create(['tool_id' => $tool->id])`
- Request: `$this->actingAs($this->user)->delete('/tools/' . $tool->id . '/schedules/' . $schedule->id)`
- Assert: `assertDatabaseMissing('maintenance_schedules', ['id' => $schedule->id])`
- Assert: `assertRedirect(route('tools.show', $tool))`
- Rationale: MaintenanceSchedule has no SoftDeletes; per CLAUDE.md "hard delete everything else"; uses `assertDatabaseMissing` (not `assertSoftDeleted`)

---

### 5.11 MaintenanceSchedule Model Scopes (4 tests)

These tests make no HTTP requests. They create model instances directly and assert scope query results and boolean helper return values.

**`overdue_scope_returns_schedules_with_past_next_due_at`**
- Setup:
  ```php
  MaintenanceSchedule::factory()->create(['next_due_at' => now()->subDay()]);   // overdue
  MaintenanceSchedule::factory()->create(['next_due_at' => now()->addDays(14)]); // future, not overdue
  MaintenanceSchedule::factory()->create(['next_due_at' => null]);               // excluded
  ```
- Assert: `MaintenanceSchedule::overdue()->count() === 1`
- Rationale: scopeOverdue must filter on `next_due_at < now()` and exclude nulls

**`due_soon_scope_returns_schedules_within_seven_days`**
- Setup:
  ```php
  MaintenanceSchedule::factory()->create(['next_due_at' => now()->addDays(3)]);  // due soon
  MaintenanceSchedule::factory()->create(['next_due_at' => now()->addDays(14)]); // too far out
  MaintenanceSchedule::factory()->create(['next_due_at' => now()->subDay()]);    // overdue
  MaintenanceSchedule::factory()->create(['next_due_at' => null]);               // excluded
  ```
- Assert: `MaintenanceSchedule::dueSoon()->count() === 1`
- Rationale: scopeDueSoon must bound both sides: `next_due_at >= now()` AND `next_due_at <= now()->addDays(7)`

**`is_overdue_returns_correct_boolean`**
- Setup: `$schedule = MaintenanceSchedule::factory()->create()`; manually assign `next_due_at`; call `$schedule->isOverdue()`
- Assertions:
  - `next_due_at = now()->subDay()` → `isOverdue() === true`
  - `next_due_at = now()->addDay()` → `isOverdue() === false`
  - `next_due_at = null` → `isOverdue() === false`
- Rationale: the `next_due_at` cast is `datetime`, so `isPast()` works directly; null guard must return false

**`is_due_soon_returns_correct_boolean`**
- Setup: same pattern; manually assign `next_due_at` and call `$schedule->isDueSoon()`
- Assertions:
  - `next_due_at = now()->addDays(3)` → `isDueSoon() === true`
  - `next_due_at = now()->addDays(14)` → `isDueSoon() === false`
  - `next_due_at = now()->subDay()` → `isDueSoon() === false` (overdue, not due soon)
  - `next_due_at = null` → `isDueSoon() === false`
- Rationale: isDueSoon() must combine the `!isPast()` guard and the `lte(now()->addDays(7))` check

---

## 6. Test Class Skeleton

```php
<?php

namespace Tests\Feature;

use App\Enums\MaintenanceType;
use App\Models\MaintenanceSchedule;
use App\Models\Tool;
use App\Models\ToolCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ToolControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ── Auth ─────────────────────────────────────────────────────────────────

    #[Test]
    public function guest_is_redirected_from_tools(): void { ... }

    // ── Index ─────────────────────────────────────────────────────────────────

    #[Test]
    public function authenticated_user_can_view_tools_index(): void { ... }

    #[Test]
    public function index_filters_by_category(): void { ... }

    #[Test]
    public function index_search_returns_tools(): void { ... }

    // ── Create ────────────────────────────────────────────────────────────────

    #[Test]
    public function create_page_returns_categories_and_maintenance_types(): void { ... }

    // ── Store ─────────────────────────────────────────────────────────────────

    #[Test]
    public function store_creates_tool_and_redirects_to_show(): void { ... }

    #[Test]
    public function store_requires_name(): void { ... }

    #[Test]
    public function store_rejects_invalid_category_id(): void { ... }

    #[Test]
    public function store_rejects_invalid_manual_url(): void { ... }

    // ── Show ──────────────────────────────────────────────────────────────────

    #[Test]
    public function show_returns_tool_with_maintenance_data(): void { ... }

    // ── Edit ──────────────────────────────────────────────────────────────────

    #[Test]
    public function edit_returns_tool_with_categories(): void { ... }

    // ── Update ────────────────────────────────────────────────────────────────

    #[Test]
    public function update_saves_changes_and_redirects_to_show(): void { ... }

    #[Test]
    public function update_with_invalid_purchase_price_returns_error(): void { ... }

    // ── Destroy ───────────────────────────────────────────────────────────────

    #[Test]
    public function destroy_soft_deletes_tool(): void { ... }

    // ── Log Maintenance ───────────────────────────────────────────────────────

    #[Test]
    public function log_maintenance_creates_log_entry(): void { ... }

    #[Test]
    public function log_maintenance_requires_maintenance_type(): void { ... }

    #[Test]
    public function log_maintenance_requires_description(): void { ... }

    #[Test]
    public function log_maintenance_requires_performed_at(): void { ... }

    #[Test]
    public function log_maintenance_updates_schedule_next_due_at(): void { ... }

    // ── Schedule Management ───────────────────────────────────────────────────

    #[Test]
    public function store_schedule_creates_maintenance_schedule(): void { ... }

    #[Test]
    public function store_schedule_requires_task(): void { ... }

    #[Test]
    public function store_schedule_requires_at_least_one_interval(): void { ... }

    #[Test]
    public function destroy_schedule_hard_deletes_schedule(): void { ... }

    // ── MaintenanceSchedule Model Scopes ──────────────────────────────────────

    #[Test]
    public function overdue_scope_returns_schedules_with_past_next_due_at(): void { ... }

    #[Test]
    public function due_soon_scope_returns_schedules_within_seven_days(): void { ... }

    #[Test]
    public function is_overdue_returns_correct_boolean(): void { ... }

    #[Test]
    public function is_due_soon_returns_correct_boolean(): void { ... }
}
```

---

## 7. Key Implementation Notes

### 7.1 Destroy route availability

The `tools.destroy` route only exists after TASK-01 removes `.except(['destroy'])` from
`routes/web.php`. If TASK-07 runs before TASK-01, the destroy test will produce a 405 Method
Not Allowed rather than a 302 redirect. Run TASK-01 first.

### 7.2 Schedule sub-resource routes

The `tools.schedules.store` and `tools.schedules.destroy` routes only exist after TASK-02
adds them to `routes/web.php`. The route pattern is:
```
POST   /tools/{tool}/schedules                    → tools.schedules.store
DELETE /tools/{tool}/schedules/{schedule}         → tools.schedules.destroy
```
Use these literal URI strings in the test requests if named route helpers are not yet
available. Prefer `route('tools.schedules.store', $tool->id)` once routes exist.

### 7.3 Model scope tests do not use HTTP

The four scope/helper tests (`overdue_scope_*`, `due_soon_scope_*`, `is_overdue_*`,
`is_due_soon_*`) create `MaintenanceSchedule` factory instances and call model methods
directly. They do not exercise any HTTP endpoints. Use `RefreshDatabase` to guarantee a
clean slate (the trait is on the class, covering all tests).

### 7.4 Date arithmetic in `log_maintenance_updates_schedule_next_due_at`

The `next_due_at` column is cast to `datetime` (Carbon) on `MaintenanceSchedule`. After
the request, reload the schedule with `$schedule->fresh()`. Compare using
`->toDateString()` to avoid timezone/time-of-day discrepancies:
```php
$this->assertEquals('2026-03-31', $schedule->next_due_at->toDateString());
```

### 7.5 assertSessionHasErrors for schedule interval validation

`StoreMaintenanceScheduleRequest::withValidator()` adds the cross-field error to the
`interval_days` key (per TASK-02 spec). Assert:
```php
$response->assertSessionHasErrors(['interval_days']);
```

### 7.6 assertSoftDeleted vs assertDatabaseMissing

| Model | Delete type | Correct assertion |
|-------|-------------|-------------------|
| `Tool` | Soft delete (has `deleted_at`) | `assertSoftDeleted('tools', ['id' => $tool->id])` |
| `MaintenanceSchedule` | Hard delete (no `SoftDeletes`) | `assertDatabaseMissing('maintenance_schedules', ['id' => $schedule->id])` |

### 7.7 MaintenanceType enum values for test payloads

Use a concrete enum value string as the `maintenance_type` payload, not the PHP enum case
directly. The safe general-purpose value for tests is `'cleaning'`:
```php
'maintenance_type' => 'cleaning'
```
Alternatively import `MaintenanceType` and use `MaintenanceType::Cleaning->value`.

---

## 8. Assertion Style Reference

```php
// Inertia component + props
$response->assertInertia(fn ($page) => $page
    ->component('Tools/Index')
    ->has('tools')
    ->has('filters')
    ->has('categories')
);

// Inertia paginated count
$response->assertInertia(fn ($page) => $page
    ->has('tools.data', 1)
);

// Redirect to named route
$response->assertRedirect(route('tools.show', $tool));
$response->assertRedirect(route('tools.index'));

// Validation errors
$response->assertSessionHasErrors(['name']);
$response->assertSessionHasErrors(['category_id']);

// DB assertions
$this->assertDatabaseHas('tools', ['name' => 'Test Tool']);
$this->assertSoftDeleted('tools', ['id' => $tool->id]);
$this->assertDatabaseMissing('maintenance_schedules', ['id' => $schedule->id]);
```

---

## 9. Acceptance Criteria Coverage

| Criterion (from task manifest) | Covered By |
|-------------------------------|------------|
| Auth: guest_is_redirected_from_tools | Section 5.1 |
| Index: view index (3 props) | Section 5.2 — authenticated_user_can_view_tools_index |
| Index: filter by category | Section 5.2 — index_filters_by_category |
| Index: search | Section 5.2 — index_search_returns_tools |
| Create: returns categories + maintenance types | Section 5.3 |
| Store: creates tool + redirect | Section 5.4 — store_creates_tool_and_redirects_to_show |
| Store: requires name | Section 5.4 — store_requires_name |
| Store: rejects invalid category_id | Section 5.4 — store_rejects_invalid_category_id |
| Store: rejects invalid manual_url | Section 5.4 — store_rejects_invalid_manual_url |
| Show: returns tool with maintenance data | Section 5.5 |
| Edit: returns tool with categories | Section 5.6 |
| Update: saves changes + redirect | Section 5.7 — update_saves_changes_and_redirects_to_show |
| Update: rejects invalid purchase_price | Section 5.7 — update_with_invalid_purchase_price_returns_error |
| Destroy: soft deletes tool | Section 5.8 |
| Log Maintenance: creates log entry | Section 5.9 — log_maintenance_creates_log_entry |
| Log Maintenance: requires maintenance_type | Section 5.9 — log_maintenance_requires_maintenance_type |
| Log Maintenance: requires description | Section 5.9 — log_maintenance_requires_description |
| Log Maintenance: requires performed_at | Section 5.9 — log_maintenance_requires_performed_at |
| Log Maintenance: updates schedule next_due_at | Section 5.9 — log_maintenance_updates_schedule_next_due_at |
| Schedule: store creates schedule | Section 5.10 — store_schedule_creates_maintenance_schedule |
| Schedule: requires task | Section 5.10 — store_schedule_requires_task |
| Schedule: requires at least one interval | Section 5.10 — store_schedule_requires_at_least_one_interval |
| Schedule: destroy hard-deletes | Section 5.10 — destroy_schedule_hard_deletes_schedule |
| Model Scopes: overdue scope | Section 5.11 — overdue_scope_returns_schedules_with_past_next_due_at |
| Model Scopes: due_soon scope | Section 5.11 — due_soon_scope_returns_schedules_within_seven_days |
| Model Scopes: isOverdue boolean | Section 5.11 — is_overdue_returns_correct_boolean |
| Model Scopes: isDueSoon boolean | Section 5.11 — is_due_soon_returns_correct_boolean |

**Total tests: 25** — all required tests from the task manifest are covered.

---

## 10. Running the Tests

```bash
./vendor/bin/sail artisan test --filter=ToolControllerTest
```

All 25 tests must pass. No tests from other test files may be broken by this task (the only
file modified is `tests/Feature/ToolControllerTest.php`).
