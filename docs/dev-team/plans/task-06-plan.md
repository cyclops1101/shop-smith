# Task 06 Plan: Routes and Controller Stubs

## 1. Approach

Define all application routes in `routes/web.php` and create 7 controller stub files under `app/Http/Controllers/`. Every controller method must exist with the correct signature and return a minimal `Inertia::render()` response (or `redirect()->back()` for mutation endpoints). All routes except `PortfolioController@index` are wrapped in the `auth` middleware group.

The goal of this task is a compilable, routable skeleton — not business logic. Every method returns a stub that makes `php artisan route:list` work cleanly and lets Task 09 (feature tests) actually hit real routes that return expected HTTP status codes.

## 2. Files to Create/Modify

| Action   | Path |
|----------|------|
| Modify   | `routes/web.php` |
| Create   | `app/Http/Controllers/DashboardController.php` |
| Create   | `app/Http/Controllers/ProjectController.php` |
| Create   | `app/Http/Controllers/MaterialController.php` |
| Create   | `app/Http/Controllers/ToolController.php` |
| Create   | `app/Http/Controllers/FinanceController.php` |
| Create   | `app/Http/Controllers/CutListController.php` |
| Create   | `app/Http/Controllers/PortfolioController.php` |

Note: Laravel ships with a default `routes/web.php` containing the Breeze auth routes and a dashboard route. This task modifies that file — the existing Breeze auth route group and `Route::get('/dashboard', ...)` must be preserved or replaced by this task's `DashboardController@index`.

## 3. Key Decisions

### Decision 1: Stub return values for mutation endpoints

GET endpoints that render a page return `Inertia::render('ComponentName')` with an empty props array. Mutation endpoints (store, update, destroy, uploadPhoto, logTime, stopTimer, attachMaterial, addNote, adjustStock, logMaintenance, storeExpense, storeRevenue, optimize) return `redirect()->back()` as stubs. This makes them callable from feature tests without throwing exceptions, and 302 redirects are a valid initial response for a stub that has not yet been implemented.

`CutListController@optimize` is a special case: it eventually returns JSON or an Inertia response. For the stub, return `redirect()->back()` since the algorithm is not yet written.

### Decision 2: Route organization — grouped by middleware

```php
// Public
Route::get('/portfolio', [PortfolioController::class, 'index'])->name('portfolio.index');

// Authenticated
Route::middleware('auth')->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Projects (resource + sub-resources)
    // Materials (resource + sub-resources)
    // Tools (resource + sub-resources)
    // Finance
    // CutList
});
```

This is cleaner than applying `->middleware('auth')` per route and makes auditing straightforward.

### Decision 3: Project routes use explicit route definitions, not `Route::resource()`

`Route::resource('projects', ProjectController::class)` would generate `index, create, store, show, edit, update, destroy` automatically. However, this task also needs custom sub-resource routes (`uploadPhoto`, `logTime`, `stopTimer`, `attachMaterial`, `addNote`). Mixing `Route::resource()` with manual routes for the same controller is valid but can be confusing. The decision is to use `Route::resource()` for the standard 7 CRUD actions and add explicit routes for sub-resources immediately after, grouped or nested for clarity.

For Materials and Tools, use `Route::resource()` with `except: ['destroy']` since destroy is not in the spec route list. Actually the spec does not list DELETE routes for materials or tools explicitly — use `Route::resource()` with `only` to be precise:

- Materials: `only: ['index', 'create', 'store', 'show', 'edit', 'update']`
- Tools: `only: ['index', 'create', 'store', 'show', 'edit', 'update']`

### Decision 4: Route parameter names

- `{project}` — binds to `Project` model by slug (via `getRouteKeyName()` returning `'slug'` set in Task 04)
- `{material}` — binds to `Material` by ULID (default)
- `{tool}` — binds to `Tool` by ULID (default)
- `{entry}` — binds to `TimeEntry` by ULID (default); used in `stopTimer`

### Decision 5: Route names for sub-resources

The task manifest specifies these explicit names:
- `projects.upload-photo` — POST `/projects/{project}/photos`
- `projects.log-time` — POST `/projects/{project}/time`
- `projects.stop-timer` — PUT `/projects/{project}/time/{entry}/stop`
- `projects.attach-material` — POST `/projects/{project}/materials`
- `projects.add-note` — POST `/projects/{project}/notes`
- `materials.adjust-stock` — POST `/materials/{material}/adjust`
- `tools.log-maintenance` — POST `/tools/{tool}/maintenance`
- `finance.store-expense` — POST `/finance/expenses`
- `finance.store-revenue` — POST `/finance/revenues`
- `cut-list.optimize` — POST `/cut-list/optimize`

### Decision 6: Inertia component name strings

Stub responses use predictable component name strings matching the page files Task 10 will create:

| Method | Component String |
|--------|-----------------|
| DashboardController@index | `'Dashboard'` |
| ProjectController@index | `'Projects/Index'` |
| ProjectController@create | `'Projects/Create'` |
| ProjectController@show | `'Projects/Show'` |
| ProjectController@edit | `'Projects/Edit'` |
| MaterialController@index | `'Materials/Index'` |
| MaterialController@create | `'Materials/Create'` |
| MaterialController@show | `'Materials/Show'` |
| MaterialController@edit | `'Materials/Edit'` |
| ToolController@index | `'Tools/Index'` |
| ToolController@create | `'Tools/Create'` |
| ToolController@show | `'Tools/Show'` |
| ToolController@edit | `'Tools/Edit'` |
| FinanceController@index | `'Finance/Index'` |
| CutListController@index | `'CutList/Index'` |
| PortfolioController@index | `'Portfolio/Index'` |

### Decision 7: Controller method signatures with type-hinted models

Even as stubs, controller methods must have the correct type-hinted parameters so route model binding works. For example:

```php
public function show(Project $project): Response
{
    return Inertia::render('Projects/Show', ['project' => $project]);
}

public function stopTimer(Project $project, TimeEntry $entry): RedirectResponse
{
    return redirect()->back();
}
```

Return types are `\Inertia\Response` (alias `Response` after `use Inertia\Response`) or `\Illuminate\Http\RedirectResponse`.

## 4. Complete Route Map

```php
// Public
Route::get('/portfolio', [PortfolioController::class, 'index'])->name('portfolio.index');

Route::middleware('auth')->group(function () {

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Projects — resource routes
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'create', 'store', 'show', 'edit', 'update', 'destroy']);

    // Projects — sub-resource routes
    Route::post('/projects/{project}/photos', [ProjectController::class, 'uploadPhoto'])
        ->name('projects.upload-photo');
    Route::post('/projects/{project}/time', [ProjectController::class, 'logTime'])
        ->name('projects.log-time');
    Route::put('/projects/{project}/time/{entry}/stop', [ProjectController::class, 'stopTimer'])
        ->name('projects.stop-timer');
    Route::post('/projects/{project}/materials', [ProjectController::class, 'attachMaterial'])
        ->name('projects.attach-material');
    Route::post('/projects/{project}/notes', [ProjectController::class, 'addNote'])
        ->name('projects.add-note');

    // Materials
    Route::resource('materials', MaterialController::class)
        ->only(['index', 'create', 'store', 'show', 'edit', 'update']);
    Route::post('/materials/{material}/adjust', [MaterialController::class, 'adjustStock'])
        ->name('materials.adjust-stock');

    // Tools
    Route::resource('tools', ToolController::class)
        ->only(['index', 'create', 'store', 'show', 'edit', 'update']);
    Route::post('/tools/{tool}/maintenance', [ToolController::class, 'logMaintenance'])
        ->name('tools.log-maintenance');

    // Finance
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/finance/expenses', [FinanceController::class, 'storeExpense'])
        ->name('finance.store-expense');
    Route::post('/finance/revenues', [FinanceController::class, 'storeRevenue'])
        ->name('finance.store-revenue');

    // Cut List
    Route::get('/cut-list', [CutListController::class, 'index'])->name('cut-list.index');
    Route::post('/cut-list/optimize', [CutListController::class, 'optimize'])
        ->name('cut-list.optimize');

});
```

## 5. Controller Stub Signatures

### DashboardController

```php
namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Dashboard', []);
    }
}
```

### ProjectController

```php
use App\Models\Project;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;

class ProjectController extends Controller
{
    public function index(): Response { ... }
    public function create(): Response { ... }
    public function store(Request $request): RedirectResponse { ... }
    public function show(Project $project): Response { ... }
    public function edit(Project $project): Response { ... }
    public function update(Request $request, Project $project): RedirectResponse { ... }
    public function destroy(Project $project): RedirectResponse { ... }
    public function uploadPhoto(Request $request, Project $project): RedirectResponse { ... }
    public function logTime(Request $request, Project $project): RedirectResponse { ... }
    public function stopTimer(Project $project, TimeEntry $entry): RedirectResponse { ... }
    public function attachMaterial(Request $request, Project $project): RedirectResponse { ... }
    public function addNote(Request $request, Project $project): RedirectResponse { ... }
}
```

Note: `store`, `update`, `uploadPhoto`, `logTime`, `attachMaterial`, `addNote` will later use typed Form Request classes (Task 07). For the stub, use `Illuminate\Http\Request` as the type hint — Task 07 implementor will swap these to their respective Form Request classes when wiring the two tasks together.

### MaterialController

```php
use App\Models\Material;

class MaterialController extends Controller
{
    public function index(): Response { ... }
    public function create(): Response { ... }
    public function store(Request $request): RedirectResponse { ... }
    public function show(Material $material): Response { ... }
    public function edit(Material $material): Response { ... }
    public function update(Request $request, Material $material): RedirectResponse { ... }
    public function adjustStock(Request $request, Material $material): RedirectResponse { ... }
}
```

### ToolController

```php
use App\Models\Tool;

class ToolController extends Controller
{
    public function index(): Response { ... }
    public function create(): Response { ... }
    public function store(Request $request): RedirectResponse { ... }
    public function show(Tool $tool): Response { ... }
    public function edit(Tool $tool): Response { ... }
    public function update(Request $request, Tool $tool): RedirectResponse { ... }
    public function logMaintenance(Request $request, Tool $tool): RedirectResponse { ... }
}
```

### FinanceController

```php
class FinanceController extends Controller
{
    public function index(): Response { ... }
    public function storeExpense(Request $request): RedirectResponse { ... }
    public function storeRevenue(Request $request): RedirectResponse { ... }
}
```

### CutListController

```php
class CutListController extends Controller
{
    public function index(): Response { ... }
    public function optimize(Request $request): RedirectResponse { ... }
}
```

### PortfolioController

```php
class PortfolioController extends Controller
{
    public function index(): Response { ... }
}
```

## 6. Verified Dependencies

| Dependency | Source | Notes |
|------------|--------|-------|
| `Project` model with `getRouteKeyName()` returning `'slug'` | Task 04 | Required for `{project}` slug binding |
| `Material`, `Tool`, `TimeEntry` models with `HasUlids` | Task 04 | Required for ULID-based route binding |
| `laravel/inertia-laravel` package | Task 01 (Breeze) | Provides `Inertia::render()` |
| `Inertia\Response` type | Task 01 | Used as return type hint |
| Auth middleware (`auth`) | Task 01 (Breeze) | Registered in `bootstrap/app.php` |
| Base `Controller` class | Laravel default | `App\Http\Controllers\Controller` |

## 7. Risks

### Risk 1: Breeze installs its own dashboard route

Breeze adds `Route::get('/dashboard', ...)` pointing directly to an Inertia render in `routes/web.php`. This task replaces that with `DashboardController@index`. The implementor must remove the Breeze-generated dashboard route to avoid a duplicate route definition error.

**Mitigation:** Read the existing `routes/web.php` before writing. Preserve the Breeze auth routes (login, logout, register, etc.) and the `require __DIR__.'/auth.php'` line. Replace only the dashboard route.

### Risk 2: Route model binding fails if Task 04 models not present

If `Project`, `Material`, `Tool`, or `TimeEntry` models do not exist when `php artisan route:list` is run, Laravel will throw a `BindingResolutionException`.

**Mitigation:** Task 06 has Task 04 as a declared dependency. Do not implement Task 06 before Task 04 delivers all 17 models.

### Risk 3: Naming collision with Breeze auth routes

Breeze generates named routes like `login`, `logout`, `register`. These must not be overwritten.

**Mitigation:** Only define names in the `projects.*`, `materials.*`, `tools.*`, `finance.*`, `cut-list.*`, `dashboard`, and `portfolio.*` namespaces.

### Risk 4: `Inertia\Response` import path

Laravel Inertia uses `Inertia\Response` as the return type. The `use Inertia\Response` import must not conflict with `Symfony\Component\HttpFoundation\Response`. Use an alias if needed: `use Inertia\Response as InertiaResponse`.

**Mitigation:** Consistently use `use Inertia\Response;` at the top of each controller and prefix with the alias only if there is a conflict.

### Risk 5: `stopTimer` route parameter ordering

The route `PUT /projects/{project}/time/{entry}/stop` passes two model parameters. The controller method must accept them in the same order as the route: `(Project $project, TimeEntry $entry)`. Reversing the order will cause Laravel to bind the wrong model to the wrong parameter.

**Mitigation:** Document the required parameter order in the controller method comment.

## 8. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| `routes/web.php` contains all routes from the spec | Complete route map defined above with all 26 routes |
| All 7 controller files exist under `app/Http/Controllers/` | One file per controller listed in Files to Create |
| Every controller method exists and is callable | All methods defined with correct signatures even if body is a stub |
| `php artisan route:list` shows all routes without errors | Routes use valid controller references and model type hints |
| Auth middleware applied to all routes except `portfolio.index` | `Route::middleware('auth')->group(...)` wraps all except portfolio |
| `GET /portfolio` returns 200 without authentication | `PortfolioController@index` outside the auth group |
| `GET /projects` returns 302 redirect when unauthenticated | Auth middleware returns 302 for guests on all non-portfolio routes |
