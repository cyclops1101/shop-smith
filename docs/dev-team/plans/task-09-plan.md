# Task 09 Plan: Feature Test Stubs for All Controller Actions

## 1. Approach

Create 7 Feature test files under `tests/Feature/`, one per controller. Each file contains one test method per controller action. Tests are stubs that assert:
1. Unauthenticated requests to protected routes return a 302 redirect to `/login`
2. Authenticated GET requests to index/show/create/edit endpoints return 200 and render the correct Inertia component
3. Authenticated mutation requests (store, update, destroy, sub-resource actions) return a redirect (302) — consistent with the stub controllers returning `redirect()->back()`

All tests use:
- `RefreshDatabase` trait to ensure a clean database per test
- Factories (Task 08) to create test data — no hardcoded IDs or raw `DB::insert()`
- `actingAs(User::factory()->create())` for authenticated test contexts
- `$response->assertInertia(fn ($page) => $page->component('ComponentName'))` for Inertia response assertions

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `tests/Feature/DashboardControllerTest.php` |
| Create | `tests/Feature/ProjectControllerTest.php` |
| Create | `tests/Feature/MaterialControllerTest.php` |
| Create | `tests/Feature/ToolControllerTest.php` |
| Create | `tests/Feature/FinanceControllerTest.php` |
| Create | `tests/Feature/CutListControllerTest.php` |
| Create | `tests/Feature/PortfolioControllerTest.php` |

## 3. Test Structure per File

All test files use Pest PHP (the default test runner in Laravel 12 Breeze scaffolds). If the project was bootstrapped with PHPUnit classes instead, translate `it()` calls to `public function test_...()` methods in a class that extends `TestCase` with `use RefreshDatabase`.

**Shared setup pattern at top of each file:**

```php
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);
```

**Inertia assertion pattern:**

```php
$response->assertInertia(fn (Assert $page) => $page->component('Dashboard'));
```

This requires the `inertia/laravel` package's testing utilities, included when `laravel/breeze` is installed with the Inertia stack.

## 4. Test Methods per Controller

### DashboardControllerTest

```
tests/Feature/DashboardControllerTest.php
```

Test methods:
1. `it redirects guests from dashboard` — unauthenticated `GET /dashboard` returns 302 to `/login`
2. `it shows dashboard to authenticated user` — authenticated `GET /dashboard` returns 200 with Inertia component `'Dashboard'`

```php
uses(RefreshDatabase::class);

it('redirects guests from dashboard', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

it('shows dashboard to authenticated user', function () {
    $this->actingAs(User::factory()->create())
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Dashboard'));
});
```

### ProjectControllerTest

```
tests/Feature/ProjectControllerTest.php
```

Test methods (one per controller action):

1. `it redirects guests from projects index` — `GET /projects` returns 302
2. `it shows projects index to authenticated user` — 200 + `'Projects/Index'`
3. `it shows create project form` — `GET /projects/create` returns 200 + `'Projects/Create'`
4. `it stores a valid project` — `POST /projects` with title returns 302
5. `it fails to store project without title` — `POST /projects` with empty data returns session errors on `title`
6. `it shows a project` — `GET /projects/{slug}` returns 200 + `'Projects/Show'`
7. `it shows edit project form` — `GET /projects/{slug}/edit` returns 200 + `'Projects/Edit'`
8. `it updates a project` — `PUT /projects/{slug}` with valid data returns 302
9. `it destroys a project` — `DELETE /projects/{slug}` returns 302
10. `it uploads a photo to a project` — `POST /projects/{slug}/photos` with fake image returns 302
11. `it logs time on a project` — `POST /projects/{slug}/time` with started_at returns 302
12. `it stops a running timer` — `PUT /projects/{slug}/time/{entry}/stop` returns 302
13. `it attaches a material to a project` — `POST /projects/{slug}/materials` returns 302
14. `it adds a note to a project` — `POST /projects/{slug}/notes` returns 302

```php
use App\Models\{User, Project, Material, TimeEntry};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects guests from projects index', function () {
    $this->get('/projects')->assertRedirect('/login');
});

it('shows projects index to authenticated user', function () {
    $this->actingAs(User::factory()->create())
        ->get('/projects')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Projects/Index'));
});

it('shows create project form', function () {
    $this->actingAs(User::factory()->create())
        ->get('/projects/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Projects/Create'));
});

it('stores a valid project', function () {
    $this->actingAs(User::factory()->create())
        ->post('/projects', ['title' => 'My New Project'])
        ->assertRedirect();
});

it('fails to store project without title', function () {
    $this->actingAs(User::factory()->create())
        ->post('/projects', [])
        ->assertSessionHasErrors('title');
});

it('shows a project', function () {
    $project = Project::factory()->create();
    expect($project->slug)->not->toBeNull(); // guard against Task 04 slug observer missing
    $this->actingAs(User::factory()->create())
        ->get("/projects/{$project->slug}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Projects/Show'));
});

it('shows edit project form', function () {
    $project = Project::factory()->create();
    $this->actingAs(User::factory()->create())
        ->get("/projects/{$project->slug}/edit")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Projects/Edit'));
});

it('updates a project', function () {
    $project = Project::factory()->create();
    $this->actingAs(User::factory()->create())
        ->put("/projects/{$project->slug}", ['title' => 'Updated Title'])
        ->assertRedirect();
});

it('destroys a project', function () {
    $project = Project::factory()->create();
    $this->actingAs(User::factory()->create())
        ->delete("/projects/{$project->slug}")
        ->assertRedirect();
});

it('uploads a photo to a project', function () {
    Storage::fake('private');
    $project = Project::factory()->create();
    $this->actingAs(User::factory()->create())
        ->post("/projects/{$project->slug}/photos", [
            'photo' => UploadedFile::fake()->image('test.jpg'),
        ])
        ->assertRedirect();
});

it('logs time on a project', function () {
    $project = Project::factory()->create();
    $this->actingAs(User::factory()->create())
        ->post("/projects/{$project->slug}/time", [
            'started_at' => now()->subHour()->toDateTimeString(),
        ])
        ->assertRedirect();
});

it('stops a running timer', function () {
    $project = Project::factory()->create();
    $entry   = TimeEntry::factory()->running()->create(['project_id' => $project->id]);
    $this->actingAs(User::factory()->create())
        ->put("/projects/{$project->slug}/time/{$entry->id}/stop")
        ->assertRedirect();
});

it('attaches a material to a project', function () {
    $project  = Project::factory()->create();
    $material = Material::factory()->create();
    $this->actingAs(User::factory()->create())
        ->post("/projects/{$project->slug}/materials", [
            'material_id'   => $material->id,
            'quantity_used' => 2.5,
        ])
        ->assertRedirect();
});

it('adds a note to a project', function () {
    $project = Project::factory()->create();
    $this->actingAs(User::factory()->create())
        ->post("/projects/{$project->slug}/notes", [
            'content' => 'A test note for this project.',
        ])
        ->assertRedirect();
});
```

### MaterialControllerTest

```
tests/Feature/MaterialControllerTest.php
```

Test methods:
1. `it redirects guests from materials` — 302
2. `it shows materials index` — 200 + `'Materials/Index'`
3. `it shows create material form` — 200 + `'Materials/Create'`
4. `it stores a valid material` — `POST /materials` with name + unit + quantity returns 302
5. `it fails to store material without name` — missing name → session errors on `name`
6. `it shows a material` — `GET /materials/{ulid}` returns 200 + `'Materials/Show'`
7. `it shows edit material form` — `GET /materials/{ulid}/edit` returns 200 + `'Materials/Edit'`
8. `it updates a material` — `PUT /materials/{ulid}` returns 302
9. `it adjusts material stock` — `POST /materials/{ulid}/adjust` with quantity returns 302

```php
use App\Models\{User, Material};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects guests from materials', function () {
    $this->get('/materials')->assertRedirect('/login');
});

it('shows materials index', function () {
    $this->actingAs(User::factory()->create())
        ->get('/materials')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Materials/Index'));
});

it('shows create material form', function () {
    $this->actingAs(User::factory()->create())
        ->get('/materials/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Materials/Create'));
});

it('stores a valid material', function () {
    $this->actingAs(User::factory()->create())
        ->post('/materials', [
            'name'             => 'Oak Board 4/4',
            'unit'             => 'board_foot',
            'quantity_on_hand' => 10,
        ])
        ->assertRedirect();
});

it('fails to store material without name', function () {
    $this->actingAs(User::factory()->create())
        ->post('/materials', ['unit' => 'board_foot', 'quantity_on_hand' => 0])
        ->assertSessionHasErrors('name');
});

it('shows a material', function () {
    $material = Material::factory()->create();
    $this->actingAs(User::factory()->create())
        ->get("/materials/{$material->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Materials/Show'));
});

it('shows edit material form', function () {
    $material = Material::factory()->create();
    $this->actingAs(User::factory()->create())
        ->get("/materials/{$material->id}/edit")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Materials/Edit'));
});

it('updates a material', function () {
    $material = Material::factory()->create();
    $this->actingAs(User::factory()->create())
        ->put("/materials/{$material->id}", ['name' => 'Updated Oak Board'])
        ->assertRedirect();
});

it('adjusts material stock', function () {
    $material = Material::factory()->create(['quantity_on_hand' => 10]);
    $this->actingAs(User::factory()->create())
        ->post("/materials/{$material->id}/adjust", ['quantity' => -2])
        ->assertRedirect();
});
```

### ToolControllerTest

```
tests/Feature/ToolControllerTest.php
```

Test methods:
1. `it redirects guests from tools` — 302
2. `it shows tools index` — 200 + `'Tools/Index'`
3. `it shows create tool form` — 200 + `'Tools/Create'`
4. `it stores a valid tool` — `POST /tools` with name returns 302
5. `it fails to store tool without name` — missing name → session errors
6. `it shows a tool` — `GET /tools/{ulid}` returns 200 + `'Tools/Show'`
7. `it shows edit tool form` — `GET /tools/{ulid}/edit` returns 200 + `'Tools/Edit'`
8. `it updates a tool` — `PUT /tools/{ulid}` returns 302
9. `it logs maintenance for a tool` — `POST /tools/{ulid}/maintenance` returns 302

```php
use App\Models\{User, Tool};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects guests from tools', function () {
    $this->get('/tools')->assertRedirect('/login');
});

it('shows tools index', function () {
    $this->actingAs(User::factory()->create())
        ->get('/tools')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Tools/Index'));
});

it('shows create tool form', function () {
    $this->actingAs(User::factory()->create())
        ->get('/tools/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Tools/Create'));
});

it('stores a valid tool', function () {
    $this->actingAs(User::factory()->create())
        ->post('/tools', ['name' => 'DeWalt DW735 Planer'])
        ->assertRedirect();
});

it('fails to store tool without name', function () {
    $this->actingAs(User::factory()->create())
        ->post('/tools', [])
        ->assertSessionHasErrors('name');
});

it('shows a tool', function () {
    $tool = Tool::factory()->create();
    $this->actingAs(User::factory()->create())
        ->get("/tools/{$tool->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Tools/Show'));
});

it('shows edit tool form', function () {
    $tool = Tool::factory()->create();
    $this->actingAs(User::factory()->create())
        ->get("/tools/{$tool->id}/edit")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Tools/Edit'));
});

it('updates a tool', function () {
    $tool = Tool::factory()->create();
    $this->actingAs(User::factory()->create())
        ->put("/tools/{$tool->id}", ['name' => 'Updated Planer Name'])
        ->assertRedirect();
});

it('logs maintenance for a tool', function () {
    $tool = Tool::factory()->create();
    $this->actingAs(User::factory()->create())
        ->post("/tools/{$tool->id}/maintenance", [
            'maintenance_type' => 'cleaning',
            'description'      => 'Cleaned sawdust from all surfaces.',
            'performed_at'     => now()->toDateString(),
        ])
        ->assertRedirect();
});
```

### FinanceControllerTest

```
tests/Feature/FinanceControllerTest.php
```

Test methods:
1. `it redirects guests from finance` — 302
2. `it shows finance index` — 200 + `'Finance/Index'`
3. `it stores a valid expense` — `POST /finance/expenses` returns 302
4. `it fails to store expense without amount` — missing amount → session errors
5. `it stores a valid revenue entry` — `POST /finance/revenues` returns 302
6. `it fails to store revenue without amount` — missing amount → session errors

```php
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects guests from finance', function () {
    $this->get('/finance')->assertRedirect('/login');
});

it('shows finance index', function () {
    $this->actingAs(User::factory()->create())
        ->get('/finance')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Finance/Index'));
});

it('stores a valid expense', function () {
    $this->actingAs(User::factory()->create())
        ->post('/finance/expenses', [
            'category'     => 'materials',
            'description'  => 'Oak boards from Rockler',
            'amount'       => 89.99,
            'expense_date' => today()->toDateString(),
        ])
        ->assertRedirect();
});

it('fails to store expense without amount', function () {
    $this->actingAs(User::factory()->create())
        ->post('/finance/expenses', [
            'category'     => 'materials',
            'description'  => 'Oak boards',
            'expense_date' => today()->toDateString(),
        ])
        ->assertSessionHasErrors('amount');
});

it('stores a valid revenue entry', function () {
    $this->actingAs(User::factory()->create())
        ->post('/finance/revenues', [
            'description'   => 'Custom table commission payment',
            'amount'        => 450.00,
            'received_date' => today()->toDateString(),
        ])
        ->assertRedirect();
});

it('fails to store revenue without amount', function () {
    $this->actingAs(User::factory()->create())
        ->post('/finance/revenues', [
            'description'   => 'Custom table commission payment',
            'received_date' => today()->toDateString(),
        ])
        ->assertSessionHasErrors('amount');
});
```

### CutListControllerTest

```
tests/Feature/CutListControllerTest.php
```

Test methods:
1. `it redirects guests from cut list` — 302
2. `it shows cut list index` — 200 + `'CutList/Index'`
3. `it accepts a valid optimize payload` — `POST /cut-list/optimize` with boards+pieces returns 302
4. `it fails optimize when boards array is missing` — session errors on `boards`

```php
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects guests from cut list', function () {
    $this->get('/cut-list')->assertRedirect('/login');
});

it('shows cut list index', function () {
    $this->actingAs(User::factory()->create())
        ->get('/cut-list')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('CutList/Index'));
});

it('accepts a valid optimize payload', function () {
    // TODO: update to assertOk() + assertInertia() when optimizer is implemented
    $this->actingAs(User::factory()->create())
        ->post('/cut-list/optimize', [
            'boards' => [
                [
                    'label'     => 'Board 1',
                    'length'    => 96,
                    'width'     => 48,
                    'thickness' => 0.75,
                    'quantity'  => 2,
                ],
            ],
            'pieces' => [
                [
                    'label'           => 'Panel A',
                    'length'          => 24,
                    'width'           => 12,
                    'thickness'       => 0.75,
                    'quantity'        => 4,
                    'grain_direction' => false,
                ],
            ],
        ])
        ->assertRedirect();
});

it('fails optimize when boards array is missing', function () {
    $this->actingAs(User::factory()->create())
        ->post('/cut-list/optimize', [
            'pieces' => [
                ['label' => 'Panel A', 'length' => 24, 'width' => 12, 'thickness' => 0.75, 'quantity' => 1],
            ],
        ])
        ->assertSessionHasErrors('boards');
});
```

### PortfolioControllerTest

```
tests/Feature/PortfolioControllerTest.php
```

Test methods:
1. `it portfolio page is publicly accessible without authentication` — `GET /portfolio` returns 200 with no `actingAs()`
2. `it portfolio renders the correct Inertia component` — 200 + `'Portfolio/Index'`

```php
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('portfolio page is publicly accessible without authentication', function () {
    $this->get('/portfolio')->assertOk();
});

it('portfolio renders the Portfolio/Index component', function () {
    $this->get('/portfolio')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Portfolio/Index'));
});
```

The portfolio tests deliberately do NOT call `actingAs()`. This verifies the route is outside the auth middleware group.

## 5. Key Decisions

### Decision 1: Pest over PHPUnit class syntax

Laravel 12 with Breeze installs Pest PHP by default. All test files use Pest's function-based syntax (`it('...', fn () => ...)`). If the project uses PHPUnit classes instead, translate each `it()` call to a `public function test_...()` method inside a class that `extends TestCase` with `use RefreshDatabase`.

### Decision 2: Stub mutation tests assert `assertRedirect()`, not `assertOk()`

The Task 06 controller stubs return `redirect()->back()` for all mutation endpoints. Feature test stubs match this behavior. `assertRedirect()` without a URL target is intentional — when controllers are fully implemented, they will redirect to specific URLs (e.g., the show page after store), and these tests will be updated. Using a specific URL like `assertRedirect(route('projects.show', ...))` would fail immediately since the stub just redirects back.

### Decision 3: Validation failure tests use `assertSessionHasErrors()`

For POST/PUT requests with invalid data, asserting `assertSessionHasErrors('field')` is the standard Laravel test approach. Inertia validation errors also use session flash (via Breeze's `HandleValidationExceptions` middleware), so this assertion works correctly for both classic and Inertia form submissions.

### Decision 4: `assertInertia()` with `Assert` import

The `assertInertia()` method and `AssertableInertia` class are provided by `inertia/laravel`. The import is:

```php
use Inertia\Testing\AssertableInertia as Assert;
```

Every test file that asserts Inertia component names must include this import.

### Decision 5: Photo upload tests use `Storage::fake('private')`

`ProjectControllerTest` for the `uploadPhoto` action uses `Storage::fake('private')` to prevent actual filesystem writes. Since the Task 06 stub returns `redirect()->back()` without processing the file, `Storage::fake()` is primarily defensive — ensuring the test works correctly when the real implementation is wired in later.

### Decision 6: Guest redirect assertions target `/login`

Laravel's auth middleware redirects to `/login` by default (configurable in `bootstrap/app.php`). Using `assertRedirect('/login')` is more specific than a bare 302 assertion, providing clearer failure messages.

### Decision 7: Each test file covers exactly one controller

Tests are scoped per controller file. This makes individual test files easy to find (`php artisan test --filter ProjectControllerTest`) and keeps file length manageable.

### Decision 8: No cross-ownership security tests at stub stage

Tests like "stopping a timer that belongs to a different project returns 404" test security enforcement that requires real controller logic. Stub-level tests only verify routes are reachable and return expected codes. Security-focused cross-ownership tests are added when real controller implementations land in Phase 2+.

### Decision 9: `TimeEntry::factory()->running()` state

The `stopTimer` test requires a `TimeEntry` with `ended_at = null`. This uses the `running()` factory state defined in Task 08:

```php
$entry = TimeEntry::factory()->running()->create(['project_id' => $project->id]);
```

If Task 08 does not define this state, add it inline: `TimeEntry::factory()->create(['project_id' => $project->id, 'ended_at' => null])`.

## 6. Verified Dependencies

| Dependency | Source | Notes |
|------------|--------|-------|
| All 7 controller files with correct method signatures | Task 06 | Tests call these routes; missing methods cause 404 |
| All 17 factories | Task 08 | `Project::factory()`, `Material::factory()`, etc. |
| `TimeEntry::factory()->running()` state | Task 08 | Used in `stopTimer` test |
| `User` model + `UserFactory` | Task 01 (Breeze) | Required for `actingAs()` |
| `Project::getRouteKeyName()` returning `'slug'` | Task 04 | Tests use `$project->slug` in URLs |
| `Project` slug auto-generation on create | Task 04 | Tests fail if `$project->slug` is null |
| `Inertia\Testing\AssertableInertia` | Task 01 (Breeze) | `assertInertia()` assertions |
| Auth routes (redirect to `/login`) | Task 01 (Breeze) | Guest redirect assertions |
| `HandleInertiaRequests` middleware registered | Task 01 (Breeze) | Required for Inertia responses |
| `RefreshDatabase` trait | Laravel default | Included in test bootstrap |
| `Storage::fake()` | Laravel default | Used in photo upload test |
| `UploadedFile::fake()` | Laravel default | Used in photo upload test |

## 7. Risks

### Risk 1: `redirect()->back()` in tests redirects to `/` or the original URL

`redirect()->back()` in tests uses the `HTTP_REFERER` header, which in test contexts is typically empty, resolving to `/`. `assertRedirect()` without a URL argument passes for any 302 status code, so this is not a problem for the stub tests.

**Mitigation:** Use `assertRedirect()` (no URL argument) for all mutation stub tests. Document that tests will be updated to `assertRedirect(route('resource.index'))` when real implementations land.

### Risk 2: `assertInertia()` fails if Inertia middleware is not configured

If `HandleInertiaRequests::class` is not registered in `bootstrap/app.php`, Inertia responses will not include the `X-Inertia` header and `assertInertia()` will throw an assertion failure.

**Mitigation:** This is a Task 01 deliverable. Verify the middleware is registered before running Task 09 tests.

### Risk 3: `Project::factory()->create()` produces a project with `slug = null`

If the Task 04 `booted()` observer is not correctly implemented, `$project->slug` will be null, and tests using `"/projects/{$project->slug}"` will hit `GET /projects/` (the index route) instead of the show route.

**Mitigation:** Add `expect($project->slug)->not->toBeNull()` guard in tests that use project slugs. If this fails, it indicates a Task 04 bug.

### Risk 4: Validation tests depend on Task 07 Form Requests being wired into controllers

At the stub stage, `ProjectController::store()` uses `Illuminate\Http\Request` (plain), not `StoreProjectRequest`. This means the `title` validation rule is not enforced, and `assertSessionHasErrors('title')` will fail.

**Mitigation:** Task 09 stubs for validation tests serve as an aspirational acceptance test. They will fail until Task 07 Form Requests are wired into controllers. This is expected and should be documented. The `php artisan test` run will show these as failing tests that indicate "validation wiring needed." Add a comment: `// This test will pass once StoreProjectRequest is wired into ProjectController@store`.

**Alternative:** Skip validation failure tests at the stub stage and only include them when Form Requests are connected. Document this decision clearly in the test file.

The plan recommends including them as failing stubs to make the test suite's aspirational state visible.

### Risk 5: `RefreshDatabase` is slow on MySQL 8 with 17+ tables

Each test run triggers a full migration rollback + re-run. With 17+ application tables, this adds latency compared to SQLite.

**Mitigation:** Accepted trade-off. MySQL 8 is the target database per CLAUDE.md. Do not switch to SQLite for tests. If CI performance becomes a concern, investigate `DatabaseMigrations` vs `RefreshDatabase` or group tests into a single transaction where possible.

### Risk 6: `UploadedFile::fake()->image()` requires GD extension

`UploadedFile::fake()->image('test.jpg')` uses GD to generate a valid image binary. The `gd` extension must be available in the PHP environment.

**Mitigation:** GD is included in the Sail PHP image. If unavailable, fall back to `UploadedFile::fake()->create('test.jpg', 100, 'image/jpeg')` which does not generate real image pixels but passes basic file validation.

## 8. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| All 7 test files exist under `tests/Feature/` | 7 files enumerated in Files to Create |
| Every controller action has at least one corresponding test method | Enumerated per controller: 2 for Dashboard, 14 for Project, 9 for Material, 9 for Tool, 6 for Finance, 4 for CutList, 2 for Portfolio |
| `php artisan test` runs without PHP syntax errors | All files shown with valid Pest syntax |
| Unauthenticated requests to auth-protected routes assert a redirect (302 or 401) | `assertRedirect('/login')` in each guest test |
| Authenticated GET requests to index/show/create/edit assert 200 | `assertOk()` + `assertInertia()` for all GET endpoints |
| `PortfolioController@index` asserts 200 without authentication | `PortfolioControllerTest` uses no `actingAs()` |
| All tests use `RefreshDatabase` trait | `uses(RefreshDatabase::class)` at top of every test file |
| All tests use factories for test data (no hardcoded IDs) | `Project::factory()->create()`, `Material::factory()->create()`, etc. throughout |
