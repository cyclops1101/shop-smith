# TASK-01: ToolController CRUD Implementation Plan

**Task ID:** TASK-01
**Domain:** backend
**Complexity:** medium
**Status:** pending

---

## 1. Approach

Replace all 7 stub methods in `ToolController` with working implementations, add the missing `destroy` method, and register the destroy route. All methods follow the established project conventions: fat models, thin controllers, form-request validation, Scout search, and Inertia responses.

The `MaterialController` is the direct pattern to follow — the approach is identical but adapted for the `Tool` model and its related types (`ToolCategory`, `MaintenanceSchedule`, `MaintenanceLog`, `MaintenanceType` enum).

Implementation strategy:

1. Update `routes/web.php` — remove `.except(['destroy'])` from the tools resource route so the `DELETE /tools/{tool}` route is registered.
2. Rewrite `app/Http/Controllers/ToolController.php` — replace all 7 stub methods, add the `destroy` method, update the import block to pull in form requests, enums, and related models.

No new classes, services, migrations, or factories are required. All dependencies already exist.

---

## 2. Files to Modify

| File | Action | Reason |
|------|--------|--------|
| `routes/web.php` | Modify line 52 | Remove `.except(['destroy'])` to register the destroy route |
| `app/Http/Controllers/ToolController.php` | Modify | Replace all 7 stub methods, add `destroy`, update import block |

No new files are created. All form requests, enums, models, and Inertia page components already exist.

---

## 3. Route Change

**Current (line 52 of `routes/web.php`):**

```php
// Tools (resource: index, create, store, show, edit, update — no destroy)
Route::resource('tools', ToolController::class)->except(['destroy']);
```

**Replace with:**

```php
// Tools (resource: index, create, store, show, edit, update, destroy)
Route::resource('tools', ToolController::class);
```

**Rationale:** The task spec requires the `destroy` route. The `Tool` model uses `SoftDeletes`, so `$tool->delete()` sets `deleted_at` and does not remove the row. The existing `tools.log-maintenance` sub-resource route on line 55 is unaffected.

---

## 4. Import Block

**Current imports in `ToolController.php`:**

```php
use App\Models\Tool;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
```

**Replace with:**

```php
use App\Enums\MaintenanceType;
use App\Http\Requests\StoreToolRequest;
use App\Http\Requests\UpdateToolRequest;
use App\Models\Tool;
use App\Models\ToolCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
```

`Request` remains because `logMaintenance(Request $request, Tool $tool)` is an existing sub-resource method that must not be broken by this task.

---

## 5. Method Implementations

### 5.1 `index(Request $request): Response`

```php
public function index(Request $request): Response
{
    $filters = $request->only(['search', 'category']);

    $query = Tool::query();

    if ($search = $filters['search'] ?? null) {
        $ids = Tool::search($search)->keys();
        $query->whereIn('id', $ids);
    }

    $query->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category_id', $v));

    $tools = $query->with(['category'])->latest()->paginate(15)->withQueryString();

    return Inertia::render('Tools/Index', [
        'tools'      => $tools,
        'filters'    => $filters,
        'categories' => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
    ]);
}
```

**Key decisions:**
- `$request->only(['search', 'category'])` — the tool index has two filters: a text search and a category dropdown. There is no supplier filter on tools (unlike materials).
- Scout `search()->keys()` + `whereIn('id', $ids)` is the established pattern used in `MaterialController` and `ProjectController`. `keys()` returns ULID strings; `whereIn` handles string primary keys correctly.
- The `if ($search = ...)` guard ensures Scout is never called when the search param is absent.
- `with(['category'])` prevents N+1 on the category name in the index list. `maintenanceSchedules` and `maintenanceLogs` are not needed on the index page.
- `latest()` orders by `created_at DESC` — the project-wide default.
- `ToolCategory::orderBy('sort_order')` — same ordering convention used for `MaterialCategory` in `MaterialController`.
- Filter key is `category` (not `category_id`) — consistent with how `MaterialController` uses `category` and `supplier` as filter keys in `$request->only()`.

---

### 5.2 `create(): Response`

```php
public function create(): Response
{
    return Inertia::render('Tools/Create', [
        'categories'       => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
        'maintenanceTypes' => collect(MaintenanceType::cases())
            ->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
    ]);
}
```

**Key decisions:**
- The `Tools/Create` page needs a category dropdown and a maintenance type selector (for adding initial maintenance schedules at creation time).
- `MaintenanceType::cases()` is mapped to `{value, label}` pairs — same pattern as `MaterialUnit` in `MaterialController::create()`. The `label()` method already exists on `MaintenanceType` (verified in `app/Enums/MaintenanceType.php`).
- Prop name `maintenanceTypes` (camelCase) matches the JavaScript destructuring convention used across the frontend.

---

### 5.3 `store(StoreToolRequest $request): RedirectResponse`

```php
public function store(StoreToolRequest $request): RedirectResponse
{
    $tool = Tool::create($request->validated());

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Tool created successfully.');
}
```

**Key decisions:**
- `StoreToolRequest` is injected — validation is never done in the controller (governance rule).
- `$request->validated()` is safe to pass directly to `Tool::create()` because all fields in `StoreToolRequest->rules()` are present in `Tool::$fillable` (verified: `name`, `brand`, `model_number`, `serial_number`, `category_id`, `purchase_date`, `purchase_price`, `warranty_expires`, `location`, `notes`, `manual_url`).
- Redirect to `tools.show` with flash `success` — consistent with `MaterialController::store()`.

---

### 5.4 `show(Tool $tool): Response`

```php
public function show(Tool $tool): Response
{
    $tool->load(['category', 'maintenanceSchedules', 'maintenanceLogs']);

    return Inertia::render('Tools/Show', [
        'tool' => $tool,
    ]);
}
```

**Key decisions:**
- Route model binding resolves by ULID `id` — the `Tool` model has no `getRouteKeyName()` override (unlike `Project` which uses slug). Governance rule: "Route model binding with ULID for tools."
- `load(['category', 'maintenanceSchedules', 'maintenanceLogs'])` — all three relationships are defined on `Tool`. The `show` page displays the tool's category, its recurring maintenance schedules, and the historical log of maintenance events.
- All three relations are verified on `Tool`: `category()` BelongsTo, `maintenanceSchedules()` HasMany, `maintenanceLogs()` HasMany.
- Single `tool` prop passed to the page — the page component has full access to nested relations via the loaded data.
- Soft-deleted tools automatically return 404 from route model binding (default Laravel behaviour).

---

### 5.5 `edit(Tool $tool): Response`

```php
public function edit(Tool $tool): Response
{
    return Inertia::render('Tools/Edit', [
        'tool'             => $tool,
        'categories'       => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
        'maintenanceTypes' => collect(MaintenanceType::cases())
            ->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
    ]);
}
```

**Key decisions:**
- Same reference data as `create()`: categories and maintenance types needed for the edit form dropdowns.
- The tool itself is passed without extra `load()` because the edit form only needs scalar fields (`name`, `brand`, `category_id`, etc.) and not nested relations.
- Prop name `tool` (singular) — consistent with `Material` in `MaterialController::edit()`.

---

### 5.6 `update(UpdateToolRequest $request, Tool $tool): RedirectResponse`

```php
public function update(UpdateToolRequest $request, Tool $tool): RedirectResponse
{
    $tool->update($request->validated());

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Tool updated successfully.');
}
```

**Key decisions:**
- `UpdateToolRequest` is injected — uses `sometimes` rules on all fields so partial PATCH requests work correctly.
- `$request->validated()` is safe to pass directly to `$tool->update()` for the same reason as `store()`.
- Redirect to `tools.show` — consistent with `MaterialController::update()`.

---

### 5.7 `destroy(Tool $tool): RedirectResponse`  *(new method)*

```php
public function destroy(Tool $tool): RedirectResponse
{
    $tool->delete();

    return redirect()->route('tools.index')
        ->with('success', 'Tool deleted.');
}
```

**Key decisions:**
- `$tool->delete()` triggers the `SoftDeletes` trait — sets `deleted_at`, does not remove the row. Governance rule: "Soft deletes on: projects, materials, tools."
- Redirect to `tools.index` (not back) because the record is no longer accessible at its `show` URL after soft-deletion (route model binding returns 404).
- Flash key `success` — project-wide convention.
- This method does not currently exist in the controller. It must be added as a new method, placed after `update()` and before `logMaintenance()`.

---

### 5.8 `logMaintenance(Request $request, Tool $tool): RedirectResponse`  *(out of scope — do not modify)*

This method is a registered sub-resource route (`tools.log-maintenance`). It is not one of the 7 CRUD methods in scope for this task and must remain as-is (returning `redirect()->back()`).

---

## 6. Final Controller Shape

The completed `ToolController.php` will have this method order:

1. `index(Request $request): Response`
2. `create(): Response`
3. `store(StoreToolRequest $request): RedirectResponse`
4. `show(Tool $tool): Response`
5. `edit(Tool $tool): Response`
6. `update(UpdateToolRequest $request, Tool $tool): RedirectResponse`
7. `destroy(Tool $tool): RedirectResponse`  *(new)*
8. `logMaintenance(Request $request, Tool $tool): RedirectResponse`  *(unchanged)*

---

## 7. Verified Dependencies

| Dependency | Status | Location |
|---|---|---|
| `Tool` model with `SoftDeletes`, `Searchable`, `HasUlids` | Verified | `app/Models/Tool.php` line 16 |
| `Tool::$fillable` covers all `StoreToolRequest` fields | Verified | `app/Models/Tool.php` lines 18-31 |
| `Tool::category()` BelongsTo `ToolCategory` | Verified | `app/Models/Tool.php` line 53 |
| `Tool::maintenanceSchedules()` HasMany | Verified | `app/Models/Tool.php` line 58 |
| `Tool::maintenanceLogs()` HasMany | Verified | `app/Models/Tool.php` line 63 |
| `Tool::toSearchableArray()` for Scout | Verified | `app/Models/Tool.php` lines 41-51 (indexes name, brand, model_number, serial_number, notes) |
| `ToolCategory` model — `sort_order` column | Verified | `app/Models/ToolCategory.php` line 17 |
| `MaintenanceType` enum with `label()` method (8 cases) | Verified | `app/Enums/MaintenanceType.php` |
| `StoreToolRequest` with full field rules | Verified | `app/Http/Requests/StoreToolRequest.php` |
| `UpdateToolRequest` with `sometimes` rules | Verified | `app/Http/Requests/UpdateToolRequest.php` |
| Scout database driver — `laravel/scout` | Verified | Installed package |
| `tools` table with `category_id`, `deleted_at` | Expected | Migrations follow spec |

---

## 8. Risks

### Risk 1: Scout `search()->keys()` returns empty collection on no match

**Impact:** Low. `whereIn('id', [])` produces zero results, which is the correct behaviour for a search with no matches.

**Mitigation:** No action required. This is intentional behaviour, identical to `MaterialController`.

---

### Risk 2: `logMaintenance` stub broken by import changes

**Impact:** Medium. The `logMaintenance` method signature uses `Request` — which remains in the import block. No breakage occurs.

**Mitigation:** Verify `Request` is kept in the final import list. It is needed for `logMaintenance(Request $request, Tool $tool)`.

---

### Risk 3: `Tool::$fillable` and `StoreToolRequest` field divergence

**Impact:** Medium. If a form request field is not in `$fillable`, `create()`/`update()` silently ignores it.

**Mitigation:** Both lists have been cross-verified. `StoreToolRequest` rules cover: `name`, `category_id`, `brand`, `model_number`, `serial_number`, `purchase_date`, `purchase_price`, `warranty_expires`, `location`, `manual_url`, `notes` — all present in `Tool::$fillable`. `total_usage_hours` is in `$fillable` but not in the form request (it is updated programmatically by the maintenance log flow, not by user input).

---

### Risk 4: `maintenanceLogs` relation not present on `Tool`

**Impact:** High if missing. Verified: `Tool::maintenanceLogs()` returns `$this->hasMany(MaintenanceLog::class)` at line 63 of `app/Models/Tool.php`.

**Mitigation:** Already confirmed. No action required.

---

## 9. Acceptance Criteria Coverage

| Criterion | How satisfied |
|---|---|
| `index` searches via Scout `search()->keys()` + `whereIn` | `Tool::search($search)->keys()` + `$query->whereIn('id', $ids)` |
| `index` filters by category via `when()` | `$query->when($filters['category'], fn ($q, $v) => $q->where('category_id', $v))` |
| `index` paginates 15 per page with query string | `->paginate(15)->withQueryString()` |
| `index` passes tools, filters, categories | All three keys in `Inertia::render` prop array |
| `create` passes categories and maintenanceTypes | Both keys in `Inertia::render` prop array |
| `maintenanceTypes` mapped to `{value, label}` | `collect(MaintenanceType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()])` |
| `store` uses `StoreToolRequest` | Type-hinted in method signature |
| `store` creates via `Tool::create($validated)` | `Tool::create($request->validated())` |
| `store` redirects to show with flash success | `redirect()->route('tools.show', $tool)->with('success', ...)` |
| `show` eager loads category, maintenanceSchedules, maintenanceLogs | `$tool->load(['category', 'maintenanceSchedules', 'maintenanceLogs'])` |
| `show` renders `Tools/Show` with tool prop | `Inertia::render('Tools/Show', ['tool' => $tool])` |
| `edit` passes tool, categories, maintenanceTypes | All three keys in `Inertia::render` prop array |
| `update` uses `UpdateToolRequest` | Type-hinted in method signature |
| `update` calls `$tool->update($validated)` | `$tool->update($request->validated())` |
| `update` redirects to show | `redirect()->route('tools.show', $tool)` |
| `destroy` soft-deletes via `$tool->delete()` | `SoftDeletes` trait intercepts and sets `deleted_at` |
| `destroy` redirects to tools index | `redirect()->route('tools.index')` |
| `destroy` route registered | `.except(['destroy'])` removed from `routes/web.php` |
| No validation in controllers | All validation delegated to `StoreToolRequest` / `UpdateToolRequest` |
| Inertia responses from all read methods | All 4 read methods return `Inertia::render(...)` |
| Route model binding resolves Tool by ULID | No `getRouteKeyName()` override — default `id` (ULID) binding |
| `logMaintenance` stub remains unmodified | Method not touched in this task |
