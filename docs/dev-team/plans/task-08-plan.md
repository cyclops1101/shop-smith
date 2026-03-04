# Task 08 Plan: Material Controller Feature Tests

**Task ID:** TASK-08
**Domain:** backend-laravel
**Parallel Group:** 3 (depends on TASK-01 and TASK-02)
**Complexity:** Medium
**Status:** pending

---

## 1. Approach

Replace the four placeholder tests in `tests/Feature/MaterialControllerTest.php` with a complete 20-test suite that exercises every MaterialController action plus the `Material::lowStock()` model scope. The file is a full replacement — no existing test methods are kept.

The implementation follows the exact patterns established in `ProjectControllerTest.php`:

- `#[Test]` attributes on every method (PHPUnit 11 style, no docblock annotations)
- `RefreshDatabase` trait on the class
- A `private User $user` property populated in `setUp()` so individual tests do not repeat `User::factory()->create()`
- Factory-only test data — no hardcoded IDs or raw database inserts
- `assertInertia()` for all page assertions (component name + presence of prop keys)
- `assertSessionHasErrors(['field'])` for all validation failure tests
- `assertSoftDeleted('materials', ['id' => $material->id])` for the destroy test
- Arithmetic verified directly with `assertDatabaseHas` after stock adjustment calls

The 20 tests are organized into eight groups matching controller method boundaries, plus one model-level scope test that performs no HTTP request.

---

## 2. Files to Modify

| Action | Path |
|--------|------|
| Full replacement | `tests/Feature/MaterialControllerTest.php` |

No other files change. TASK-01 and TASK-02 must be complete before this test file can pass (they implement the actual controller logic and model methods being tested).

---

## 3. Prerequisite State (post TASK-01 + TASK-02)

Before these tests can pass, the following must be in place:

**From TASK-01 (`MaterialController`):**
- `index()` — returns `Inertia::render('Materials/Index', ['materials', 'filters', 'categories', 'suppliers'])` with Scout search + category/supplier `when()` filters
- `create()` — returns `Inertia::render('Materials/Create', ['units', 'categories', 'suppliers'])`
- `store(StoreMaterialRequest)` — creates record, redirects to `materials.show`
- `show(Material)` — returns `Inertia::render('Materials/Show', ['material'])`
- `edit(Material)` — returns `Inertia::render('Materials/Edit', ['material', 'units', 'categories', 'suppliers'])`
- `update(UpdateMaterialRequest, Material)` — updates record, redirects to `materials.show`
- `destroy(Material)` — soft-deletes, redirects to `materials.index`
- `routes/web.php`: `Route::resource('materials', MaterialController::class)` (destroy route added, `.except(['destroy'])` removed)

**From TASK-02 (`Material` model + `adjustStock` method):**
- `adjustQuantity(float $delta): void` — updates `quantity_on_hand`, never below 0, auto-saves
- `adjustStock(AdjustStockRequest, Material)` controller method — calls `$material->adjustQuantity($delta)`, redirects to `materials.show`
- `scopeLowStock(Builder $query): Builder` — `whereNotNull('low_stock_threshold')->whereColumn('quantity_on_hand', '<=', 'low_stock_threshold')`

**Current stub state (must NOT be tested against):** The current `MaterialController` stubs return `redirect()->back()` and pass no data to Inertia views. Running these tests against the current code will produce failures — that is expected and correct.

---

## 4. Class Structure

```php
<?php

namespace Tests\Feature;

use App\Enums\MaterialUnit;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MaterialControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ... 20 #[Test] methods
}
```

---

## 5. Test-by-Test Specification

### 5.1 Auth / Access

**Test 1: `guest_is_redirected_from_materials`**

```php
#[Test]
public function guest_is_redirected_from_materials(): void
{
    $response = $this->get('/materials');

    $response->assertRedirect('/login');
}
```

No `actingAs` — the unauthenticated hit must redirect to `/login`. The existing placeholder used `assertRedirect()` without a target; the replacement pins it to `/login` to match the governance rule and the pattern in `ProjectControllerTest`.

---

### 5.2 Index

**Test 2: `authenticated_user_can_view_materials_index`**

```php
#[Test]
public function authenticated_user_can_view_materials_index(): void
{
    $response = $this->actingAs($this->user)->get('/materials');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Materials/Index')
        ->has('materials')
        ->has('filters')
        ->has('categories')
        ->has('suppliers')
    );
}
```

Checks all four props promised by the TASK-01 spec. No materials need to be created — the paginator can be empty.

---

**Test 3: `index_filters_by_category`**

```php
#[Test]
public function index_filters_by_category(): void
{
    $catA = MaterialCategory::factory()->create();
    $catB = MaterialCategory::factory()->create();

    Material::factory()->create(['category_id' => $catA->id, 'name' => 'Oak Board']);
    Material::factory()->create(['category_id' => $catB->id, 'name' => 'Pine Plank']);

    $response = $this->actingAs($this->user)
        ->get('/materials?category=' . $catA->id);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Materials/Index')
        ->has('materials.data', 1)
        ->where('materials.data.0.name', 'Oak Board')
    );
}
```

Creates two materials in different categories. Filters by `$catA->id`. The Inertia assertion confirms exactly one result is returned and it is the correct record. This pattern mirrors `projects_index_filters_by_status` in `ProjectControllerTest`.

---

**Test 4: `index_filters_by_supplier`**

```php
#[Test]
public function index_filters_by_supplier(): void
{
    $supplierA = Supplier::factory()->create();
    $supplierB = Supplier::factory()->create();

    Material::factory()->create(['supplier_id' => $supplierA->id, 'name' => 'Red Oak']);
    Material::factory()->create(['supplier_id' => $supplierB->id, 'name' => 'White Oak']);

    $response = $this->actingAs($this->user)
        ->get('/materials?supplier=' . $supplierA->id);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Materials/Index')
        ->has('materials.data', 1)
        ->where('materials.data.0.name', 'Red Oak')
    );
}
```

Same two-record pattern as Test 3, filtering on `supplier_id`.

---

**Test 5: `index_search_returns_materials`**

```php
#[Test]
public function index_search_returns_materials(): void
{
    Material::factory()->create(['name' => 'Baltic Birch Plywood']);
    Material::factory()->create(['name' => 'Red Oak Board']);

    $response = $this->actingAs($this->user)
        ->get('/materials?search=Baltic');

    $response->assertOk();
}
```

Scout with the database driver performs a SQL `LIKE` search. The test confirms a 200 response when a `search` param is passed. A deeper assertion (count) is avoided here because Scout's database driver behavior with `RefreshDatabase` and the `LIKE` matching on the `name` column is implementation-dependent — asserting `assertOk()` confirms the search code path does not throw. This aligns with the `projects_index_filters_by_search` pattern in `ProjectControllerTest`.

---

### 5.3 Create

**Test 6: `create_page_returns_units_categories_and_suppliers`**

```php
#[Test]
public function create_page_returns_units_categories_and_suppliers(): void
{
    $response = $this->actingAs($this->user)->get('/materials/create');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Materials/Create')
        ->has('units')
        ->has('categories')
        ->has('suppliers')
    );
}
```

Confirms all three option arrays are passed. The `units` array comes from `MaterialUnit::cases()` mapped to `[value, label]` pairs.

---

### 5.4 Store

**Test 7: `store_creates_material_and_redirects_to_show`**

```php
#[Test]
public function store_creates_material_and_redirects_to_show(): void
{
    $response = $this->actingAs($this->user)->post('/materials', [
        'name'             => 'Walnut Lumber',
        'unit'             => 'board_foot',
        'quantity_on_hand' => 10.00,
    ]);

    $this->assertDatabaseHas('materials', ['name' => 'Walnut Lumber']);

    $material = Material::where('name', 'Walnut Lumber')->first();
    $response->assertRedirect(route('materials.show', $material));
}
```

Uses the minimum required fields per `StoreMaterialRequest` rules (`name` required, `unit` required with `Rule::enum(MaterialUnit::class)`, `quantity_on_hand` required). Checks the DB record exists and the redirect goes to `materials.show`.

---

**Test 8: `store_requires_name`**

```php
#[Test]
public function store_requires_name(): void
{
    $response = $this->actingAs($this->user)->post('/materials', [
        'unit'             => 'piece',
        'quantity_on_hand' => 0,
    ]);

    $response->assertSessionHasErrors(['name']);
}
```

Omits `name`; confirms validation fires on `name`. No `assertStatus(422)` per governance rules.

---

**Test 9: `store_requires_unit`**

```php
#[Test]
public function store_requires_unit(): void
{
    $response = $this->actingAs($this->user)->post('/materials', [
        'name'             => 'Some Wood',
        'quantity_on_hand' => 0,
    ]);

    $response->assertSessionHasErrors(['unit']);
}
```

Omits `unit`; confirms `unit` is required.

---

**Test 10: `store_rejects_invalid_unit_value`**

```php
#[Test]
public function store_rejects_invalid_unit_value(): void
{
    $response = $this->actingAs($this->user)->post('/materials', [
        'name'             => 'Some Wood',
        'unit'             => 'invalid',
        'quantity_on_hand' => 0,
    ]);

    $response->assertSessionHasErrors(['unit']);
}
```

The `unit` field uses `Rule::enum(MaterialUnit::class)` which rejects any value not in the enum's string values. `'invalid'` is not a valid `MaterialUnit` case.

---

### 5.5 Show

**Test 11: `show_returns_material_with_component`**

```php
#[Test]
public function show_returns_material_with_component(): void
{
    $material = Material::factory()->create();

    $response = $this->actingAs($this->user)
        ->get('/materials/' . $material->id);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Materials/Show')
        ->has('material')
    );
}
```

Route model binding uses ULID (not slug — Materials use ULID binding per CLAUDE.md). The test accesses `/materials/{material->id}` which resolves via the `HasUlids` trait.

---

### 5.6 Edit

**Test 12: `edit_returns_material_with_options`**

```php
#[Test]
public function edit_returns_material_with_options(): void
{
    $material = Material::factory()->create();

    $response = $this->actingAs($this->user)
        ->get('/materials/' . $material->id . '/edit');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Materials/Edit')
        ->has('material')
        ->has('units')
        ->has('categories')
        ->has('suppliers')
    );
}
```

Confirms all four props (`material`, `units`, `categories`, `suppliers`) are present.

---

### 5.7 Update

**Test 13: `update_saves_changes_and_redirects_to_show`**

```php
#[Test]
public function update_saves_changes_and_redirects_to_show(): void
{
    $material = Material::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($this->user)
        ->patch('/materials/' . $material->id, [
            'name' => 'Updated Name',
        ]);

    $response->assertRedirect(route('materials.show', $material));
    $this->assertDatabaseHas('materials', [
        'id'   => $material->id,
        'name' => 'Updated Name',
    ]);
}
```

`UpdateMaterialRequest` uses `'sometimes'` on all fields, so a partial payload with only `name` is valid. Checks both the redirect and the database state.

---

**Test 14: `update_with_invalid_unit_returns_error`**

```php
#[Test]
public function update_with_invalid_unit_returns_error(): void
{
    $material = Material::factory()->create();

    $response = $this->actingAs($this->user)
        ->patch('/materials/' . $material->id, [
            'unit' => 'bad',
        ]);

    $response->assertSessionHasErrors(['unit']);
}
```

`UpdateMaterialRequest` applies `Rule::enum(MaterialUnit::class)` when `unit` is present. `'bad'` is not a valid enum value.

---

### 5.8 Destroy

**Test 15: `destroy_soft_deletes_material`**

```php
#[Test]
public function destroy_soft_deletes_material(): void
{
    $material = Material::factory()->create();

    $response = $this->actingAs($this->user)
        ->delete('/materials/' . $material->id);

    $response->assertRedirect(route('materials.index'));
    $this->assertSoftDeleted('materials', ['id' => $material->id]);
}
```

`Material` uses `SoftDeletes` (confirmed in model). Uses `assertSoftDeleted` not `assertDatabaseMissing`. The destroy route requires TASK-01 to remove `.except(['destroy'])` from `routes/web.php`.

---

### 5.9 Adjust Stock

**Test 16: `adjust_stock_increments_quantity`**

```php
#[Test]
public function adjust_stock_increments_quantity(): void
{
    $material = Material::factory()->create([
        'unit'             => 'piece',
        'quantity_on_hand' => 10.00,
    ]);

    $this->actingAs($this->user)
        ->post('/materials/' . $material->id . '/adjust', [
            'quantity' => 5,
        ]);

    $this->assertDatabaseHas('materials', [
        'id'               => $material->id,
        'quantity_on_hand' => 15.00,
    ]);
}
```

The route is `POST /materials/{material}/adjust` named `materials.adjust-stock` (confirmed in `routes/web.php` line 45). A positive `quantity` increments `quantity_on_hand`.

---

**Test 17: `adjust_stock_decrements_quantity`**

```php
#[Test]
public function adjust_stock_decrements_quantity(): void
{
    $material = Material::factory()->create([
        'unit'             => 'piece',
        'quantity_on_hand' => 10.00,
    ]);

    $this->actingAs($this->user)
        ->post('/materials/' . $material->id . '/adjust', [
            'quantity' => -3,
        ]);

    $this->assertDatabaseHas('materials', [
        'id'               => $material->id,
        'quantity_on_hand' => 7.00,
    ]);
}
```

A negative `quantity` decrements. `AdjustStockRequest` allows any numeric value (positive or negative) per its rules: `'numeric'` with no `min`.

---

**Test 18: `adjust_stock_cannot_go_below_zero`**

```php
#[Test]
public function adjust_stock_cannot_go_below_zero(): void
{
    $material = Material::factory()->create([
        'unit'             => 'piece',
        'quantity_on_hand' => 5.00,
    ]);

    $this->actingAs($this->user)
        ->post('/materials/' . $material->id . '/adjust', [
            'quantity' => -100,
        ]);

    $this->assertDatabaseHas('materials', [
        'id'               => $material->id,
        'quantity_on_hand' => 0.00,
    ]);
}
```

The `adjustQuantity(float $delta)` model method uses `max(0, $this->quantity_on_hand + $delta)` to clamp the result. This test validates that clamping behavior at the database level.

---

**Test 19: `adjust_stock_requires_quantity`**

```php
#[Test]
public function adjust_stock_requires_quantity(): void
{
    $material = Material::factory()->create();

    $response = $this->actingAs($this->user)
        ->post('/materials/' . $material->id . '/adjust', []);

    $response->assertSessionHasErrors(['quantity']);
}
```

`AdjustStockRequest` rules: `'quantity' => ['required', 'numeric']`. An empty payload must trigger `assertSessionHasErrors(['quantity'])`.

---

### 5.10 Low Stock Scope (model-level)

**Test 20: `low_stock_scope_returns_only_materials_at_or_below_threshold`**

```php
#[Test]
public function low_stock_scope_returns_only_materials_at_or_below_threshold(): void
{
    // LOW: qty 2, threshold 5 — should be returned
    $lowMaterial = Material::factory()->create([
        'quantity_on_hand'    => 2.00,
        'low_stock_threshold' => 5.00,
    ]);

    // OK: qty 10, threshold 5 — above threshold, should not be returned
    Material::factory()->create([
        'quantity_on_hand'    => 10.00,
        'low_stock_threshold' => 5.00,
    ]);

    // NO THRESHOLD: qty 1, no threshold set — should not be returned
    Material::factory()->create([
        'quantity_on_hand'    => 1.00,
        'low_stock_threshold' => null,
    ]);

    $results = Material::lowStock()->get();

    $this->assertCount(1, $results);
    $this->assertEquals($lowMaterial->id, $results->first()->id);
}
```

This is a direct model/scope test with no HTTP call. The scope uses `whereNotNull('low_stock_threshold')->whereColumn('quantity_on_hand', '<=', 'low_stock_threshold')`. Three materials are created to test each of the three cases. No `actingAs` is needed.

---

## 6. Decisions with Rationale

### Decision 1: Full file replacement (not append)

The task spec explicitly requires "Replace existing 4 placeholder tests with comprehensive suite." The existing tests have stale naming (`test_guest_is_redirected_from_materials` with `test_` prefix, `test_authenticated_user_can_view_materials_index` etc.) and weaker assertions. Full replacement avoids merge ambiguity and ensures all tests follow governance conventions from the start.

### Decision 2: `setUp()` creates `$this->user` once per test

The `ProjectControllerTest` pattern creates `$user = User::factory()->create()` at the top of each test method. The task spec requires upgrading to `setUp()` with `private User $user`. This removes ~20 lines of boilerplate across the suite and ensures consistent user state. The single `User` is sufficient — this application has no multi-tenancy or per-user data isolation that would require unique users per test.

### Decision 3: Filter tests assert `has('materials.data', 1)` rather than just `assertOk()`

Tests 3 and 4 (category/supplier filter) verify that the filter actually narrows results, not just that the page returns 200. The Inertia `assertInertia` closure supports dot-notation counting (`has('materials.data', 1)`), which confirms exactly one record matches. This gives real coverage without needing to inspect raw JSON. Tests 3 and 4 also name their materials distinctly (`Oak Board` vs `Pine Plank`) so the `where('materials.data.0.name', ...)` assertion is unambiguous.

### Decision 4: Search test only asserts `assertOk()`, not record count

Scout with the database driver performs full-text search via SQL. In test environments with `RefreshDatabase`, the search index state is identical to the database state (no separate index to sync). However, the column subset in `toSearchableArray()` (`id`, `name`, `description`, `sku`, `location`) and the Scout query behavior may return different result counts depending on the driver's internal LIKE matching. To avoid a brittle test that breaks if Scout's database driver behavior changes, the search test only confirms a 200 response, matching the `projects_index_filters_by_search` precedent in `ProjectControllerTest`.

### Decision 5: Destroy test asserts `assertRedirect(route('materials.index'))` not `assertRedirect('/materials')`

Using the named route helper is more robust — it stays correct if the route prefix changes. `ProjectControllerTest` uses `route('projects.index')` for the same reason.

### Decision 6: Adjust stock tests use a fixed `unit => 'piece'` in the factory state

The `MaterialFactory` picks a random `MaterialUnit` case by default. Tests 16–18 explicitly set `'unit' => 'piece'` to ensure the `$material->unit->label()` call in the flash message construction (from TASK-02's `adjustStock` method) is deterministic. This prevents an obscure failure if a random unit value causes an unexpected flash message or if `label()` has a branch that does not handle a case.

### Decision 7: `quantity_on_hand` comparison in `assertDatabaseHas` uses PHP floats

MySQL `decimal(10,2)` columns are compared as strings in PDO — the stored value `15.00` will match a PHP comparison of `15.00`. This is consistent with how `ProjectControllerTest` uses `assertDatabaseHas` for numeric fields. If the database stores `15` (no decimal), the assertion `15.00` will still pass because PDO casts decimal columns as string `"15.00"` and PHP's loose comparison handles the match. No casting in the test is needed.

### Decision 8: Low stock scope test uses `assertCount` + `assertEquals` not an HTTP assertion

Test 20 exercises `Material::lowStock()` as a database query scope, not an HTTP endpoint. This is explicit in the task spec: "model-level test." Using `actingAs` and an HTTP call would make the test dependent on the index route's filter implementation rather than the scope itself. Direct model testing isolates the scope behavior.

---

## 7. Verified Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `PHPUnit\Framework\Attributes\Test` | Available | PHPUnit 11.5.55 installed |
| `Illuminate\Foundation\Testing\RefreshDatabase` | Available | Standard Laravel 12 trait |
| `App\Models\Material` | Exists | `app/Models/Material.php` with `HasUlids`, `SoftDeletes`, `Searchable` |
| `App\Models\User` | Exists | `app/Models/User.php` via Breeze |
| `App\Models\MaterialCategory` | Exists | `app/Models/MaterialCategory.php` with `HasUlids` |
| `App\Models\Supplier` | Exists | `app/Models/Supplier.php` with `HasUlids` |
| `App\Enums\MaterialUnit` | Exists | `app/Enums/MaterialUnit.php`, 14 cases, `label()` method |
| `MaterialFactory` | Exists | `database/factories/MaterialFactory.php` — supports `withCategory()` and `withSupplier()` states |
| `MaterialCategoryFactory` | Exists | `database/factories/MaterialCategoryFactory.php` |
| `SupplierFactory` | Exists | `database/factories/SupplierFactory.php` |
| `UserFactory` | Exists | `database/factories/UserFactory.php` |
| Route `materials.show` | Registered | `GET /materials/{material}` |
| Route `materials.index` | Registered | `GET /materials` |
| Route `materials.adjust-stock` | Registered | `POST /materials/{material}/adjust` (line 45 of web.php) |
| Route `materials.destroy` | **Not yet registered** | Current `web.php` has `.except(['destroy'])` — TASK-01 must remove this |
| `StoreMaterialRequest` | Exists | Requires `name` (required), `unit` (required, enum), `quantity_on_hand` (required) |
| `UpdateMaterialRequest` | Exists | All fields `'sometimes'`; `unit` validated with `Rule::enum(MaterialUnit::class)` when present |
| `AdjustStockRequest` | Exists | Requires `quantity` (numeric, required); `notes` optional |
| `Material::adjustQuantity()` | **Not yet exists** | Added by TASK-02 — clamps to 0 via `max(0, ...)` |
| `Material::scopeLowStock()` | **Not yet exists** | Added by TASK-02 |
| `inertiajs/inertia-laravel` v2.0.21 | Installed | Provides `assertInertia()` test helper |

---

## 8. Risks

### Risk 1: TASK-01 destroy route not yet enabled

**Risk:** `routes/web.php` currently has `Route::resource('materials', MaterialController::class)->except(['destroy'])`. Test 15 (`destroy_soft_deletes_material`) will receive a 404 until TASK-01 removes `.except(['destroy'])`.

**Mitigation:** The plan documents this as a known pre-condition. The test itself is correct; it will fail only if TASK-01 is incomplete. Running `php artisan route:list | grep materials` before executing the test suite will confirm whether the destroy route is registered.

### Risk 2: Scout database driver search behaves differently under test

**Risk:** Scout's database driver may not find records created within the same transaction as `RefreshDatabase` wraps tests in, depending on the driver's index synchronization timing.

**Mitigation:** Test 5 only asserts `assertOk()`, not a record count. This matches the pattern used for the project search test. If Scout causes a 500 error (which would be a real bug), the test catches it via the 200 assertion.

### Risk 3: `assertDatabaseHas` decimal comparison on MySQL

**Risk:** MySQL `decimal(10,2)` stores `15.00` which PDO returns as the string `"15.00"`. PHP's `assertDatabaseHas` uses strict comparison internally. If the stored value has more decimal places than expected (e.g., rounding error in `max(0, ...)` calculation), the assertion could fail.

**Mitigation:** The `adjustQuantity()` spec from TASK-02 uses `max(0, $this->quantity_on_hand + $delta)` which produces standard PHP float arithmetic. For the test values chosen (10, 5, -3, -100), the results (15, 7, 0) are all exact integers with no floating-point precision issues. The decimal comparison `15.00` is safe.

### Risk 4: Filter tests fail if `MaterialCategoryFactory` generates duplicate names

**Risk:** `MaterialCategoryFactory` uses `fake()->randomElement(['Hardwood', 'Softwood', ...])` — a small pool of 6 values. With `RefreshDatabase`, there is a chance both categories in Test 3 get the same name and the filter still works, but the `has('materials.data', 1)` count assertion could be fragile if not both categories are distinct IDs.

**Mitigation:** The filter is on `category_id` (the ULID primary key), not `name`. Two `MaterialCategory::factory()->create()` calls always produce two distinct records with distinct ULIDs. The name duplication does not affect the test outcome because filtering by `$catA->id` (the ULID) is precise.

### Risk 5: `unit => 'piece'` in factory state overrides the enum cast

**Risk:** Setting `'unit' => 'piece'` (a string) on `Material::factory()->create([...])` must survive the model's enum cast (`'unit' => MaterialUnit::class` in `casts()`).

**Mitigation:** Laravel's `HasFactory` passes the array through `fill()`, which applies the cast. `MaterialUnit::Piece` has the backing value `'piece'`, so the string `'piece'` is a valid input for the cast. This is the same pattern the `MaterialFactory` already uses (`fake()->randomElement(MaterialUnit::cases())->value`).

---

## 9. Acceptance Criteria Coverage

| Criterion from Task Spec | Test(s) | Assertion Used |
|--------------------------|---------|----------------|
| guest_is_redirected_from_materials | Test 1 | `assertRedirect('/login')` |
| authenticated_user_can_view_materials_index — has materials/filters/categories/suppliers | Test 2 | `assertInertia` with 4 `has()` calls |
| index_filters_by_category | Test 3 | `assertInertia` + `has('materials.data', 1)` |
| index_filters_by_supplier | Test 4 | `assertInertia` + `has('materials.data', 1)` |
| index_search_returns_materials | Test 5 | `assertOk()` |
| create_page_returns_units_categories_and_suppliers | Test 6 | `assertInertia` with `has('units')`, `has('categories')`, `has('suppliers')` |
| store_creates_material_and_redirects_to_show | Test 7 | `assertDatabaseHas` + `assertRedirect(route('materials.show', ...))` |
| store_requires_name | Test 8 | `assertSessionHasErrors(['name'])` |
| store_requires_unit | Test 9 | `assertSessionHasErrors(['unit'])` |
| store_rejects_invalid_unit_value | Test 10 | `assertSessionHasErrors(['unit'])` |
| show_returns_material_with_component | Test 11 | `assertInertia` with component + `has('material')` |
| edit_returns_material_with_options | Test 12 | `assertInertia` with `has('material')`, `has('units')`, `has('categories')`, `has('suppliers')` |
| update_saves_changes_and_redirects_to_show | Test 13 | `assertDatabaseHas` + `assertRedirect(route('materials.show', ...))` |
| update_with_invalid_unit_returns_error | Test 14 | `assertSessionHasErrors(['unit'])` |
| destroy_soft_deletes_material | Test 15 | `assertSoftDeleted('materials', ['id' => ...])` + `assertRedirect(route('materials.index'))` |
| adjust_stock_increments_quantity (10 + 5 = 15) | Test 16 | `assertDatabaseHas` with `quantity_on_hand => 15.00` |
| adjust_stock_decrements_quantity (10 - 3 = 7) | Test 17 | `assertDatabaseHas` with `quantity_on_hand => 7.00` |
| adjust_stock_cannot_go_below_zero (5 - 100 = 0) | Test 18 | `assertDatabaseHas` with `quantity_on_hand => 0.00` |
| adjust_stock_requires_quantity | Test 19 | `assertSessionHasErrors(['quantity'])` |
| low_stock_scope_returns_only_materials_at_or_below_threshold | Test 20 | `assertCount(1, ...)` + `assertEquals($lowMaterial->id, ...)` |

All 20 required tests are covered. No hardcoded IDs — all records created via factories. No `assertStatus(422)` — all validation tests use `assertSessionHasErrors`. Soft delete uses `assertSoftDeleted`. `RefreshDatabase` and `#[Test]` attributes are applied throughout.

---

## 10. Run Command

```bash
./vendor/bin/sail artisan test --filter=MaterialControllerTest
```

All 20 tests are expected to pass once TASK-01 and TASK-02 are complete.
