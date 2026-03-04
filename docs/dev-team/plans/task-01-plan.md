# TASK-01: MaterialController CRUD Implementation Plan

**Task ID:** TASK-01
**Domain:** backend
**Complexity:** medium
**Status:** pending

---

## 1. Approach

Replace all stub methods in `MaterialController` with working implementations and expose the `destroy` route. All methods follow the established project conventions: fat models, thin controllers, form-request validation, Scout search, and Inertia responses.

The implementation strategy is:

1. Update `routes/web.php` — remove `.except(['destroy'])` from the materials resource route so the `DELETE /materials/{material}` route is registered.
2. Rewrite `app/Http/Controllers/MaterialController.php` — replace all 7 stub methods with real implementations using the correct imports, form requests, eager loading, and Scout search pattern already established in `ProjectController`.

No new classes, services, migrations, or factories are required. All dependencies already exist.

---

## 2. Files to Modify

| File | Action | Reason |
|------|--------|--------|
| `routes/web.php` | Modify line 42 | Remove `.except(['destroy'])` to register the destroy route |
| `app/Http/Controllers/MaterialController.php` | Modify | Replace all 7 stub methods; update import block; add 3 private helpers |

No new files are created. All form requests, enums, models, and Inertia page components already exist.

---

## 3. Route Change

**Current (line 42 of `routes/web.php`):**

```php
Route::resource('materials', MaterialController::class)->except(['destroy']);
```

**Replace with:**

```php
Route::resource('materials', MaterialController::class);
```

**Rationale:** The task spec requires the `destroy` route. The `Material` model uses `SoftDeletes`, so `$material->delete()` sets `deleted_at` and does not remove the row. Registering the route enables the `DELETE /materials/{material}` endpoint without altering the existing `materials.adjust-stock` sub-resource route directly below it.

---

## 4. Import Block

The current import block in `MaterialController.php` contains only:

```php
use App\Models\Material;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
```

The following imports must be added:

```php
use App\Enums\MaterialUnit;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Requests\StoreMaterialRequest;
use App\Http\Requests\UpdateMaterialRequest;
use App\Models\MaterialCategory;
use App\Models\Supplier;
```

`Request` and `AdjustStockRequest` remain present because `adjustStock()` still uses them (it is out of scope for this task but must not be broken).

---

## 5. Private Helper Methods

To avoid duplicating three identical queries between `create()` and `edit()`, three private methods are added:

```php
private function unitOptions(): array
{
    return collect(MaterialUnit::cases())
        ->map(fn ($u) => ['value' => $u->value, 'label' => $u->label()])
        ->all();
}

private function categoryOptions()
{
    return MaterialCategory::orderBy('sort_order')->get(['id', 'name']);
}

private function supplierOptions()
{
    return Supplier::orderBy('name')->get(['id', 'name']);
}
```

**Rationale:**
- `unitOptions()` maps the `MaterialUnit` enum to `{value, label}` pairs. The frontend `<select>` needs a human-readable label alongside the raw string value used for form submission. Calling `label()` on the PHP side avoids shipping a mapping table to the frontend.
- `categoryOptions()` orders by `sort_order` — the column exists in the `material_categories` migration (`integer, default 0`) and is the appropriate display order for woodworking categories (e.g., Hardwood before Hardware).
- `supplierOptions()` orders alphabetically by `name`. Only `id` and `name` columns are selected to reduce payload size.
- Both reference data queries are the same in `create()` and `edit()`. Private helpers prevent duplication with no meaningful abstraction overhead.

---

## 6. Method Implementations

### 6.1 `index(Request $request): Response`

```php
public function index(Request $request): Response
{
    $filters = $request->only(['search', 'category_id', 'supplier_id']);

    $query = Material::query();

    if ($search = $filters['search'] ?? null) {
        $ids = Material::search($search)->keys();
        $query->whereIn('id', $ids);
    }

    $query->when($filters['category_id'] ?? null,
        fn ($q, $id) => $q->where('category_id', $id));

    $query->when($filters['supplier_id'] ?? null,
        fn ($q, $id) => $q->where('supplier_id', $id));

    $materials = $query
        ->with(['category', 'supplier'])
        ->latest()
        ->paginate(15)
        ->withQueryString();

    return Inertia::render('Materials/Index', [
        'materials'  => $materials,
        'filters'    => $filters,
        'categories' => $this->categoryOptions(),
        'suppliers'  => $this->supplierOptions(),
    ]);
}
```

**Key decisions:**
- Scout `search()->keys()` + `whereIn` is the identical pattern used in `ProjectController::index()`. `keys()` returns ULID strings; `whereIn` handles string primary keys correctly.
- The `if ($search = ...)` guard ensures Scout is never called when the search param is absent — no performance impact from an unused scout query.
- `with(['category', 'supplier'])` prevents N+1 on the index list.
- Categories and suppliers are passed to `index` so the frontend can render filter dropdowns without a separate AJAX call.
- `latest()` orders by `created_at DESC` — the project-wide default ordering.
- Filter keys are `category_id` / `supplier_id` (FK column names) so the frontend can post ULID values directly without name transformation.

---

### 6.2 `create(): Response`

```php
public function create(): Response
{
    return Inertia::render('Materials/Create', [
        'units'      => $this->unitOptions(),
        'categories' => $this->categoryOptions(),
        'suppliers'  => $this->supplierOptions(),
    ]);
}
```

**Key decisions:**
- The `Create.jsx` stub already destructures `{ categories, suppliers, units }` — prop names must match exactly.
- All three reference data sets are fetched via private helpers.

---

### 6.3 `store(StoreMaterialRequest $request): RedirectResponse`

```php
public function store(StoreMaterialRequest $request): RedirectResponse
{
    $material = Material::create($request->validated());

    return redirect()->route('materials.show', $material)
        ->with('success', 'Material created successfully.');
}
```

**Key decisions:**
- `$request->validated()` is safe to pass directly to `Material::create()` because `StoreMaterialRequest->rules()` only validates fields that are present in `Material::$fillable`. No extra fields can slip through.
- Redirect to `show` (not `index`) gives immediate confirmation — consistent with `ProjectController::store()`.
- Flash key `success` is the project-wide convention.
- Route model binding for `materials.show` resolves by the `id` ULID column (materials use ULID `id`, not a slug like projects).

---

### 6.4 `show(Material $material): Response`

```php
public function show(Material $material): Response
{
    $material->load(['category', 'supplier', 'projects']);

    return Inertia::render('Materials/Show', [
        'material' => $material,
    ]);
}
```

**Key decisions:**
- Route model binding resolves by ULID `id` (no `getRouteKeyName()` override on `Material` — unlike `Project` which uses slug).
- `load(['category', 'supplier', 'projects'])` eager-loads all relationships referenced in the task spec. The `projects` relation is a `BelongsToMany` through `project_materials` with `quantity_used`, `cost_at_time`, and `notes` pivot columns already configured in the model.
- `Show.jsx` stub destructures `{ material }` — a single prop suffices.
- Soft-deleted materials are automatically excluded from route model binding by default — Laravel returns 404.

---

### 6.5 `edit(Material $material): Response`

```php
public function edit(Material $material): Response
{
    return Inertia::render('Materials/Edit', [
        'material'   => $material,
        'units'      => $this->unitOptions(),
        'categories' => $this->categoryOptions(),
        'suppliers'  => $this->supplierOptions(),
    ]);
}
```

**Key decisions:**
- `Edit.jsx` stub already destructures `{ material, categories, suppliers, units }` — prop names must match exactly.
- The material is passed as-is; no extra `load()` is needed because the edit form only needs scalar fields, not related records.

---

### 6.6 `update(UpdateMaterialRequest $request, Material $material): RedirectResponse`

```php
public function update(UpdateMaterialRequest $request, Material $material): RedirectResponse
{
    $material->update($request->validated());

    return redirect()->route('materials.show', $material)
        ->with('success', 'Material updated successfully.');
}
```

**Key decisions:**
- `UpdateMaterialRequest` uses `sometimes` rules on all fields, so partial PATCH requests work correctly.
- `$request->validated()` is safe to pass directly to `update()` for the same reason as `store()`.
- Redirect to `show` (not back) gives a clean view of the saved state — consistent with `ProjectController::update()`.

---

### 6.7 `destroy(Material $material): RedirectResponse`

```php
public function destroy(Material $material): RedirectResponse
{
    $material->delete();

    return redirect()->route('materials.index')
        ->with('success', 'Material deleted successfully.');
}
```

**Key decisions:**
- `$material->delete()` triggers the `SoftDeletes` trait — sets `deleted_at`, does not remove the row. This satisfies the governance rule "soft deletes on materials".
- Redirect to `materials.index` (not back) because the record is no longer accessible at its `show` URL after deletion (route model binding would 404 for soft-deleted records).
- The route is only available once `.except(['destroy'])` is removed from `routes/web.php`.

---

### 6.8 `adjustStock` (out of scope — do not modify)

This method stub exists at line 44 of the current controller and has its own registered route (`materials.adjust-stock`). It is not listed in the 7 methods of this task and must remain as-is.

---

## 7. Verified Dependencies

| Dependency | Status | Location |
|---|---|---|
| `Material` model with `SoftDeletes`, `Searchable`, `HasUlids` | Verified | `app/Models/Material.php` lines 17 |
| `MaterialUnit` enum with `label()` method (14 cases) | Verified | `app/Enums/MaterialUnit.php` |
| `StoreMaterialRequest` with full field rules | Verified | `app/Http/Requests/StoreMaterialRequest.php` |
| `UpdateMaterialRequest` with `sometimes` rules | Verified | `app/Http/Requests/UpdateMaterialRequest.php` |
| `AdjustStockRequest` | Verified | `app/Http/Requests/AdjustStockRequest.php` |
| `MaterialCategory` model — `sort_order` column exists | Verified | `app/Models/MaterialCategory.php` + migration `2026_03_03_000002` |
| `Supplier` model — `name` column exists | Verified | `app/Models/Supplier.php` + migration |
| `Material::category()` BelongsTo | Verified | `app/Models/Material.php` line 51 |
| `Material::supplier()` BelongsTo | Verified | `app/Models/Material.php` line 56 |
| `Material::projects()` BelongsToMany via `project_materials` | Verified | `app/Models/Material.php` line 61 |
| `Material::toSearchableArray()` for Scout | Verified | `app/Models/Material.php` line 40 (indexes name, description, sku, location) |
| `materials` table with `category_id`, `supplier_id`, `deleted_at` | Verified | Migration `2026_03_03_000006_create_materials_table.php` |
| `material_categories` table with `sort_order` column | Verified | Migration `2026_03_03_000002_create_material_categories_table.php` |
| Inertia pages `Materials/Index`, `Materials/Create`, `Materials/Show`, `Materials/Edit` | Verified (stubs) | `resources/js/Pages/Materials/` — prop signatures confirmed |
| Scout database driver — `laravel/scout` v10.24.0 | Verified | `composer.json` / application-info |
| `MaterialFactory` with `withCategory()` and `withSupplier()` states | Verified | `database/factories/MaterialFactory.php` |
| `MaterialCategoryFactory` | Verified | `database/factories/MaterialCategoryFactory.php` |
| `SupplierFactory` | Verified | `database/factories/SupplierFactory.php` |
| Existing `MaterialControllerTest` with 4 `#[Test]` tests | Verified | `tests/Feature/MaterialControllerTest.php` |

---

## 8. Risks

### Risk 1: Scout `search()->keys()` returns empty collection when search term matches nothing

**Impact:** Low. The `whereIn('id', [])` produces a query that returns zero results, which is the correct behaviour for a search with no matches.

**Mitigation:** No action required. This is intentional behaviour.

---

### Risk 2: Scout database driver full-text behaviour on short strings

**Impact:** Low. The database Scout driver uses `LIKE %term%` — not a full-text index. On a large dataset this is slow, but for a solo woodworker's inventory this is acceptable.

**Mitigation:** No action required for this task. The `materials` table has no full-text index requirement in the spec.

---

### Risk 3: `Material::$fillable` and `validated()` future divergence

**Impact:** Medium. If a future form request adds a field not in `$fillable`, `create()`/`update()` will silently ignore it.

**Mitigation:** Before running tests, verify that all keys in `StoreMaterialRequest->rules()` are present in `Material::$fillable`. Currently they match exactly (`name`, `description`, `sku`, `category_id`, `supplier_id`, `unit`, `quantity_on_hand`, `low_stock_threshold`, `unit_cost`, `location`, `notes`).

---

### Risk 4: `MaterialCategoryFactory` does not set `sort_order`

**Impact:** Low for this task. The factory default produces `sort_order = 0` for all rows (the column default is `0`). Ordering by `sort_order` is non-deterministic when all values are equal.

**Mitigation:** For the existing test suite this is not a problem — no test currently asserts category ordering. If ordering matters in a future test, `MaterialCategoryFactory` should be updated to use `fake()->numberBetween(0, 100)`.

---

### Risk 5: `adjustStock` stub is not broken by import changes

**Impact:** High if the stub breaks. The method currently uses `Request` (already imported) and `RedirectResponse` (already imported). The new imports added for the other methods do not conflict.

**Mitigation:** The `adjustStock` method signature (`AdjustStockRequest $request, Material $material`) will become correctly typed once `AdjustStockRequest` is added to the import block. This is an improvement, not a breakage — it replaces the current `Request` type hint.

---

## 9. Acceptance Criteria Coverage

| Criterion | How satisfied |
|---|---|
| `index` searches via Scout `search()->keys()` + `whereIn` | `Material::search($search)->keys()` + `$query->whereIn('id', $ids)` |
| `index` filters by `category_id` via `when()` | `$query->when($filters['category_id'], fn ($q, $id) => $q->where('category_id', $id))` |
| `index` filters by `supplier_id` via `when()` | `$query->when($filters['supplier_id'], fn ($q, $id) => $q->where('supplier_id', $id))` |
| `index` eager-loads category + supplier | `->with(['category', 'supplier'])` |
| `index` paginates 15 per page with query string preserved | `->paginate(15)->withQueryString()` |
| `index` passes materials, filters, categories, suppliers | All four keys in `Inertia::render` prop array |
| `create` passes units mapped to `{value, label}` | `collect(MaterialUnit::cases())->map(fn ($u) => ['value' => $u->value, 'label' => $u->label()])` |
| `create` passes categories ordered by `sort_order` | `MaterialCategory::orderBy('sort_order')->get()` |
| `create` passes suppliers ordered by name | `Supplier::orderBy('name')->get()` |
| `store` uses `StoreMaterialRequest` | Type-hinted in method signature |
| `store` creates via `Material::create($validated)` | `Material::create($request->validated())` |
| `store` redirects to show with flash success | `redirect()->route('materials.show', $material)->with('success', ...)` |
| `show` loads category, supplier, projects | `$material->load(['category', 'supplier', 'projects'])` |
| `show` renders `Materials/Show` with material prop | `Inertia::render('Materials/Show', ['material' => $material])` |
| `edit` passes material, units, categories, suppliers | All four keys in `Inertia::render` prop array |
| `update` uses `UpdateMaterialRequest` | Type-hinted in method signature |
| `update` calls `$material->update($validated)` | `$material->update($request->validated())` |
| `update` redirects to show | `redirect()->route('materials.show', $material)` |
| `destroy` soft-deletes via `$material->delete()` | `SoftDeletes` trait intercepts and sets `deleted_at` |
| `destroy` redirects to materials index | `redirect()->route('materials.index')` |
| `destroy` route registered | `.except(['destroy'])` removed from `routes/web.php` |
| No validation in controllers | All validation delegated to form request classes |
| Inertia responses from all read methods | All 4 read methods return `Inertia::render(...)` |
| Existing test `test_authenticated_user_can_view_material` passes | `show()` renders the page and passes `$material` prop |
| Existing test `test_authenticated_user_can_view_materials_index` passes | `index()` renders the page with required props |
| Existing test `test_authenticated_user_can_view_create_material_form` passes | `create()` renders the page with required props |
| Existing test `test_guest_is_redirected_from_materials` passes | Route middleware group unchanged |

---

## 10. Test Coverage Gaps (Recommended Additions)

The existing `MaterialControllerTest` only asserts HTTP 200 on three routes and has no assertions for `store`, `update`, or `destroy`. The following tests should be added when implementing the controller (using PHPUnit 11 `#[Test]` attribute style):

```
test_index_passes_materials_filters_categories_suppliers_to_inertia
test_index_filters_by_category_id
test_index_filters_by_supplier_id
test_index_searches_by_term
test_create_passes_units_categories_suppliers_to_inertia
test_store_creates_material_and_redirects_to_show
test_store_fails_validation_without_required_name
test_store_fails_validation_without_required_unit
test_show_loads_relations_and_passes_material
test_edit_passes_material_units_categories_suppliers
test_update_updates_material_and_redirects_to_show
test_destroy_soft_deletes_material_and_redirects_to_index
test_destroyed_material_returns_404_on_show
```

All tests should use `RefreshDatabase`, `User::factory()->create()`, `actingAs($user)`, and the appropriate factories. Inertia assertions use `$response->assertInertia(fn ($page) => ...)`. Database state assertions use `assertDatabaseHas` and `assertSoftDeleted`.
