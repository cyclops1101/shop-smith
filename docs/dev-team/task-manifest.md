# Phase 3: Inventory & Materials — Task Manifest

**Generated:** 2026-03-03
**Phase:** 3 — Inventory & Materials
**Status:** Pending

---

## Overview

Phase 3 implements full materials inventory management for the Workshop Manager. Phase 1 scaffolded the models, form requests, factories, and route stubs. Phase 2 established the controller/frontend/test patterns to follow. This phase wires everything together: functional MaterialController CRUD, stock adjustment, supplier CRUD (routes + controller + pages), and feature test coverage.

### Key Existing Assets (Do Not Recreate)
- `app/Models/Material.php` — has `HasUlids`, `SoftDeletes`, `Searchable`, relationships to category/supplier/projects/tags
- `app/Models/MaterialCategory.php`, `app/Models/Supplier.php` — complete models
- `app/Enums/MaterialUnit.php` — 14 cases with `label()` method
- `app/Http/Requests/StoreMaterialRequest.php`, `UpdateMaterialRequest.php`, `AdjustStockRequest.php` — all validation rules complete
- `database/factories/MaterialFactory.php`, `SupplierFactory.php`, `MaterialCategoryFactory.php` — ready to use
- `resources/js/Pages/Materials/{Index,Show,Create,Edit}.jsx` — stub files, all say "under construction"
- `resources/js/Components/ui/` — Button, Card, Badge, Input, Label, Select, Textarea, Table, Modal, Alert

### Conventions to Follow (from Phase 2)
- Controllers: index uses `Model::search()` + `when()` filters + `paginate(15)->withQueryString()`, passes `{items, filters}`
- create/edit pass enum options as `collect(Enum::cases())->map(fn($c) => ['value' => $c->value, 'label' => $c->label()])`
- store/update use form requests, redirect with `->with('success', '...')`
- Frontend: `useForm`, debounced search with `useRef` timer, `router.get()` for filter navigation
- Tests: PHPUnit 11 `#[Test]` attribute, `RefreshDatabase`, `assertInertia`, `assertSoftDeleted`, `assertSessionHasErrors`

---

## Task Groups

### Group 1 — Backend (no inter-task dependencies)

---

### TASK-01: MaterialController CRUD Implementation

**Group:** 1 (Backend)
**Agent:** backend-laravel
**Depends on:** none
**Estimated complexity:** medium

#### Objective
Replace all stub methods in `MaterialController` with working implementations. Add the missing `destroy` route for soft-delete support.

#### Files to Modify
- `app/Http/Controllers/MaterialController.php` — replace all 7 stub methods
- `routes/web.php` — remove `.except(['destroy'])` so the resource route includes destroy

#### Files to Read First
- `app/Http/Controllers/ProjectController.php` — follow the exact same patterns
- `app/Models/Material.php` — understand relationships and searchable config
- `app/Http/Requests/StoreMaterialRequest.php`, `UpdateMaterialRequest.php`, `AdjustStockRequest.php`
- `app/Enums/MaterialUnit.php`
- `app/Models/MaterialCategory.php`, `app/Models/Supplier.php`

#### Implementation Spec

**`index(Request $request): Response`**
```php
$filters = $request->only(['search', 'category', 'supplier']);

$query = Material::query();

if ($search = $filters['search'] ?? null) {
    $ids = Material::search($search)->keys();
    $query->whereIn('id', $ids);
}

$query->when($filters['category'] ?? null, fn($q, $v) => $q->where('category_id', $v));
$query->when($filters['supplier'] ?? null, fn($q, $v) => $q->where('supplier_id', $v));

$materials = $query->with(['category', 'supplier'])->latest()->paginate(15)->withQueryString();

return Inertia::render('Materials/Index', [
    'materials'  => $materials,
    'filters'    => $filters,
    'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
    'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
]);
```

**`create(): Response`**
```php
return Inertia::render('Materials/Create', [
    'units'      => collect(MaterialUnit::cases())->map(fn($u) => ['value' => $u->value, 'label' => $u->label()]),
    'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
    'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
]);
```

**`store(StoreMaterialRequest $request): RedirectResponse`**
```php
$material = Material::create($request->validated());

return redirect()->route('materials.show', $material)
    ->with('success', 'Material created successfully.');
```

**`show(Material $material): Response`**
```php
$material->load(['category', 'supplier', 'projects']);

return Inertia::render('Materials/Show', [
    'material' => $material,
]);
```

**`edit(Material $material): Response`**
```php
return Inertia::render('Materials/Edit', [
    'material'   => $material,
    'units'      => collect(MaterialUnit::cases())->map(fn($u) => ['value' => $u->value, 'label' => $u->label()]),
    'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
    'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
]);
```

**`update(UpdateMaterialRequest $request, Material $material): RedirectResponse`**
```php
$material->update($request->validated());

return redirect()->route('materials.show', $material)
    ->with('success', 'Material updated successfully.');
```

**`destroy(Material $material): RedirectResponse`**
```php
$material->delete();

return redirect()->route('materials.index')
    ->with('success', 'Material deleted.');
```

**`adjustStock` is implemented in TASK-02.**

**Routes change** — in `routes/web.php`, change:
```php
Route::resource('materials', MaterialController::class)->except(['destroy']);
```
to:
```php
Route::resource('materials', MaterialController::class);
```

Add required imports to the controller:
```php
use App\Enums\MaterialUnit;
use App\Http\Requests\StoreMaterialRequest;
use App\Http\Requests\UpdateMaterialRequest;
use App\Http\Requests\AdjustStockRequest;
use App\Models\MaterialCategory;
use App\Models\Supplier;
```

#### Acceptance Criteria
- All 7 methods return correct Inertia responses or redirects
- `index` passes `materials` (paginated with category+supplier eager loaded), `filters`, `categories`, `suppliers`
- `create` and `edit` pass `units`, `categories`, `suppliers`
- `store` creates record and redirects to show with flash success
- `update` saves changes and redirects to show with flash success
- `destroy` soft-deletes and redirects to index with flash success
- Destroy route is registered in web.php (`.except(['destroy'])` removed)

---

### TASK-02: Stock Adjustment Backend

**Group:** 1 (Backend)
**Agent:** backend-laravel
**Depends on:** none (implement alongside TASK-01)
**Estimated complexity:** low

#### Objective
Implement `adjustStock` in `MaterialController`. The adjustment adds a signed quantity (positive = receive stock, negative = remove stock) to `quantity_on_hand`. No separate audit table exists — flash a descriptive success message. Add model-level helpers and a `scopeLowStock` query scope to the `Material` model.

#### Files to Modify
- `app/Http/Controllers/MaterialController.php` — implement `adjustStock` method
- `app/Models/Material.php` — add `scopeLowStock`, `isLowStock()`, `adjustQuantity()` method

#### Implementation Spec

**`Material` model additions:**

Add `use Illuminate\Database\Eloquent\Builder;` to the model imports.

```php
// Scope: materials at or below their low_stock_threshold (threshold must be set)
public function scopeLowStock(Builder $query): Builder
{
    return $query->whereNotNull('low_stock_threshold')
        ->whereColumn('quantity_on_hand', '<=', 'low_stock_threshold');
}

// Is this material currently low on stock?
public function isLowStock(): bool
{
    return $this->low_stock_threshold !== null
        && $this->quantity_on_hand <= $this->low_stock_threshold;
}

// Encapsulate quantity adjustment — never goes below zero
public function adjustQuantity(float $delta): void
{
    $this->quantity_on_hand = max(0, $this->quantity_on_hand + $delta);
    $this->save();
}
```

**`adjustStock` controller method:**
```php
public function adjustStock(AdjustStockRequest $request, Material $material): RedirectResponse
{
    $data     = $request->validated();
    $delta    = (float) $data['quantity'];

    $material->adjustQuantity($delta);

    $direction = $delta >= 0 ? 'Added' : 'Removed';
    $abs       = abs($delta);
    $unitLabel = $material->unit->label();
    $after     = $material->quantity_on_hand;

    $message = "{$direction} {$abs} {$unitLabel} — stock now: {$after}";
    if (!empty($data['notes'])) {
        $message .= " ({$data['notes']})";
    }

    return redirect()->route('materials.show', $material)
        ->with('success', $message);
}
```

Note: `unit` is cast to `MaterialUnit` enum in the model, so `$material->unit->label()` works directly.

#### Acceptance Criteria
- POST `/materials/{material}/adjust` with `quantity=10` increments `quantity_on_hand` by 10
- POST with `quantity=-5` decrements; `quantity_on_hand` never goes below 0
- Flash message includes direction, amount, and resulting stock level
- `Material::lowStock()` scope returns only materials with threshold set AND `quantity_on_hand <= low_stock_threshold`
- `isLowStock()` returns correct boolean per the same logic
- `adjustQuantity()` is an encapsulated model method (not inline in controller)

---

### TASK-03: Supplier CRUD Backend

**Group:** 1 (Backend)
**Agent:** backend-laravel
**Depends on:** none
**Estimated complexity:** medium

#### Objective
Create a complete Supplier CRUD: controller, two form requests, routes. Suppliers have no soft deletes per CLAUDE.md ("Hard delete everything else").

#### Files to Create
- `app/Http/Controllers/SupplierController.php`
- `app/Http/Requests/StoreSupplierRequest.php`
- `app/Http/Requests/UpdateSupplierRequest.php`

#### Files to Modify
- `routes/web.php` — add supplier resource routes inside the auth+verified middleware group

#### Files to Read First
- `app/Models/Supplier.php`
- `app/Http/Controllers/ProjectController.php` — pattern reference

#### Route Registration

Add inside the `auth + verified` middleware group in `routes/web.php`:
```php
use App\Http\Controllers\SupplierController;

// Suppliers (full resource — hard delete, no soft delete)
Route::resource('suppliers', SupplierController::class);
```

#### `StoreSupplierRequest`
```php
public function authorize(): bool { return true; }

public function rules(): array
{
    return [
        'name'         => ['required', 'string', 'max:255'],
        'contact_name' => ['nullable', 'string', 'max:255'],
        'email'        => ['nullable', 'email', 'max:255'],
        'phone'        => ['nullable', 'string', 'max:50'],
        'website'      => ['nullable', 'url', 'max:500'],
        'address'      => ['nullable', 'string'],
        'notes'        => ['nullable', 'string'],
    ];
}
```

#### `UpdateSupplierRequest`
Same rules as Store, but all fields prefixed with `'sometimes'`:
```php
'name' => ['sometimes', 'required', 'string', 'max:255'],
// ... all other fields also get 'sometimes'
```

#### `SupplierController` Methods

**`index(Request $request): Response`**

Supplier does not use Laravel Scout/Searchable — use raw `LIKE` query:
```php
$filters = $request->only(['search']);

$query = Supplier::query();
if ($search = $filters['search'] ?? null) {
    $query->where(function ($q) use ($search) {
        $q->where('name', 'like', "%{$search}%")
          ->orWhere('contact_name', 'like', "%{$search}%")
          ->orWhere('email', 'like', "%{$search}%");
    });
}
$suppliers = $query->orderBy('name')->paginate(20)->withQueryString();

return Inertia::render('Suppliers/Index', compact('suppliers', 'filters'));
```

**`create(): Response`**
```php
return Inertia::render('Suppliers/Create');
```

**`store(StoreSupplierRequest $request): RedirectResponse`**
```php
$supplier = Supplier::create($request->validated());

return redirect()->route('suppliers.show', $supplier)
    ->with('success', 'Supplier created successfully.');
```

**`show(Supplier $supplier): Response`**
```php
$supplier->loadCount('materials');

return Inertia::render('Suppliers/Show', compact('supplier'));
```

**`edit(Supplier $supplier): Response`**
```php
return Inertia::render('Suppliers/Edit', compact('supplier'));
```

**`update(UpdateSupplierRequest $request, Supplier $supplier): RedirectResponse`**
```php
$supplier->update($request->validated());

return redirect()->route('suppliers.show', $supplier)
    ->with('success', 'Supplier updated successfully.');
```

**`destroy(Supplier $supplier): RedirectResponse`**
```php
$supplier->delete(); // hard delete — DB nullOnDelete() handles orphan materials

return redirect()->route('suppliers.index')
    ->with('success', 'Supplier deleted.');
```

#### Acceptance Criteria
- All 7 resource routes registered at `/suppliers` and functional
- `StoreSupplierRequest` and `UpdateSupplierRequest` validate all fields correctly
- `index` paginates (20/page) and supports search by name/contact/email
- `store` and `update` redirect to show with flash success
- `destroy` hard-deletes (assertDatabaseMissing, not assertSoftDeleted)
- DB `nullOnDelete()` cascade automatically nullifies `supplier_id` on related materials when supplier is deleted
- Supplier pages render at correct Inertia paths: `Suppliers/Index`, `Suppliers/Create`, `Suppliers/Show`, `Suppliers/Edit`

---

### Group 2 — Frontend (depends on Group 1 completions)

---

### TASK-04: Materials Index Page

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-01
**Estimated complexity:** medium

#### Objective
Replace the stub `resources/js/Pages/Materials/Index.jsx` with a full working page. Follow the `Projects/Index.jsx` pattern exactly.

#### Files to Modify
- `resources/js/Pages/Materials/Index.jsx` — full replacement

#### Data Contract (from TASK-01 controller)
Props: `{ materials, filters, categories, suppliers }`
- `materials`: Laravel paginator `{ data[], current_page, last_page, total, links: { prev, next } }`
- `materials.data[n]`: `{ id, name, sku, unit, quantity_on_hand, low_stock_threshold, unit_cost, category: { name } | null, supplier: { name } | null }`
- `filters`: `{ search, category, supplier }`
- `categories`: `[{ id, name }]`
- `suppliers`: `[{ id, name }]`

#### UI Spec

**Page header:** "Materials" title + total count subtitle + "+ New Material" button linking to `/materials/create`.

**Filter bar (3 controls, same layout as Projects/Index):**
1. Text search input — debounced 300ms — filters via `?search=`
2. Category select — options mapped from `categories` prop as `{ value: id, label: name }`, placeholder "All categories"
3. Supplier select — options mapped from `suppliers` prop as `{ value: id, label: name }`, placeholder "All suppliers"

Filter navigation: `router.get('/materials', params, { preserveState: true, replace: true })`

**Materials table columns:**

| Column | Notes |
|--------|-------|
| Name | Link to `/materials/{id}` in amber text |
| SKU | `—` if null |
| Category | Category name or `—` if null |
| Unit | The enum value string (e.g., `board_foot`) — display as-is; the backend returns the raw value |
| In Stock | `{quantity_on_hand}` number |
| Low Stock | Red Badge with text "Low Stock" when `quantity_on_hand <= low_stock_threshold && low_stock_threshold != null`; empty otherwise |
| Unit Cost | `$X.XX` (use `Intl.NumberFormat`) or `—` if null |
| Actions | "Edit" link to `/materials/{id}/edit` |

**Pagination:** Previous/Next links using `materials.links.prev` and `materials.links.next`, same markup as Projects/Index.

**Empty state:** Single `<TableCell colSpan={8}>` centered "No materials found."

#### Acceptance Criteria
- Renders at Inertia component `Materials/Index`
- Search, category, and supplier filters update URL and re-render
- Low stock badge appears only when threshold is set and qty is at or below threshold
- Pagination controls render and navigate correctly
- All columns render; nulls display as `—`

---

### TASK-05: Materials Create and Edit Forms

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-01
**Estimated complexity:** medium

#### Objective
Replace stub `Create.jsx` and `Edit.jsx` with complete working forms. Follow `Projects/Create.jsx` and `Projects/Edit.jsx` patterns.

#### Files to Modify
- `resources/js/Pages/Materials/Create.jsx` — full replacement
- `resources/js/Pages/Materials/Edit.jsx` — full replacement

#### Data Contract
Create props: `{ units, categories, suppliers }`
Edit props: `{ material, units, categories, suppliers }`

- `units`: `[{ value: 'board_foot', label: 'Board Foot' }, ...]`
- `categories`: `[{ id, name }]` — map to `{ value: id, label: name }` inside the component
- `suppliers`: `[{ id, name }]` — map to `{ value: id, label: name }` inside the component

#### Form Fields

**Section: Basic Info**
- `name` — text input, required, placeholder "e.g. 3/4 Baltic Birch Plywood"
- `sku` — text input, optional, placeholder "e.g. SKU-0001-AB"
- `description` — Textarea, optional, rows=3
- `category_id` — Select, options from `categories`, placeholder "No category", nullable
- `unit` — Select, options from `units`, required

**Section: Stock**
- `quantity_on_hand` — number input, step=0.01, min=0, required, placeholder "0.00"
- `low_stock_threshold` — number input, step=0.01, min=0, optional; add helper text below input: "Alert when stock falls at or below this amount"
- `unit_cost` — number input, step=0.01, min=0, optional, placeholder "0.00"; Label shows "Unit Cost ($)"

**Section: Supplier & Location**
- `supplier_id` — Select, options from `suppliers`, placeholder "No supplier", nullable
- `location` — text input, optional, placeholder "e.g. Shelf A3, Bin 12"

**Section: Notes**
- `notes` — Textarea, optional, rows=4

**Create form:**
```js
const form = useForm({
    name: '', sku: '', description: '', category_id: '', unit: '',
    quantity_on_hand: '', low_stock_threshold: '', unit_cost: '',
    supplier_id: '', location: '', notes: '',
});
// submit: form.post(route('materials.store'))
```
Cancel link goes to `route('materials.index')`.

**Edit form:**
```js
const form = useForm({
    name: material.name,
    sku: material.sku ?? '',
    description: material.description ?? '',
    category_id: material.category_id ?? '',
    unit: material.unit,
    quantity_on_hand: material.quantity_on_hand,
    low_stock_threshold: material.low_stock_threshold ?? '',
    unit_cost: material.unit_cost ?? '',
    supplier_id: material.supplier_id ?? '',
    location: material.location ?? '',
    notes: material.notes ?? '',
});
// submit: form.patch(route('materials.update', material.id))
```
Cancel link goes to `route('materials.show', material.id)`.

Both forms show inline validation errors below each field, and a loading-state submit button.

#### Acceptance Criteria
- Create form POSTs to `materials.store`; validation errors display inline
- Edit form PATCHes to `materials.update`; pre-populated with existing values
- All 11 fields render and bind correctly via `form.setData`
- Cancel links navigate to correct destination
- Submit button shows loading state while `form.processing` is true
- Wraps in `AppLayout` with appropriate `Head` title

---

### TASK-06: Materials Show / Detail Page

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-01, TASK-02
**Estimated complexity:** medium

#### Objective
Replace stub `resources/js/Pages/Materials/Show.jsx` with a full detail page including stock adjustment form and project usage history. Pattern: `Projects/Show.jsx`.

#### Files to Modify
- `resources/js/Pages/Materials/Show.jsx` — full replacement

#### Data Contract
Props: `{ material }`

`material` shape after eager loading:
```js
{
  id, name, sku, description,
  unit,            // raw enum string e.g. 'board_foot'
  unit_cost,       // decimal or null
  quantity_on_hand, low_stock_threshold,
  location, notes,
  category: { id, name } | null,
  supplier: { id, name, email, phone, website } | null,
  projects: [{
    id, title, slug,
    pivot: { quantity_used, cost_at_time, notes }
  }],
}
```

Flash: read `usePage().props.flash` for `flash.success` / `flash.error`.

#### UI Spec

**Page header:**
- Material name as `<h1>`
- Edit button: `<Link href={route('materials.edit', material.id)}>`
- Delete button: `window.confirm` then `router.delete(route('materials.destroy', material.id))`

**Flash messages** (same pattern as Projects/Show):
```jsx
{flash?.success && <Alert variant="success">{flash.success}</Alert>}
{flash?.error && <Alert variant="error">{flash.error}</Alert>}
```

**Section 1: Overview Card** — two-column definition list:
- Name, SKU (or `—`), Category (or `—`), Supplier name (or `—`)
- Unit (the raw string), Location (or `—`)
- Description (full-width, or `—`)
- Notes (full-width, or `—`)

**Section 2: Stock Level Card**

Top row: large quantity + unit label, e.g. `42.50 Board Foot`
Low stock badge: red Badge "Low Stock" when `quantity_on_hand <= low_stock_threshold && low_stock_threshold != null`
Unit cost: `$X.XX per {unit}` or `—`
Threshold: "Low stock threshold: {low_stock_threshold}" or "No threshold set"

Stock Adjustment sub-form within this card:
```jsx
const adjustForm = useForm({ quantity: '', notes: '' });

function handleAdjust(e) {
    e.preventDefault();
    adjustForm.post(route('materials.adjust-stock', material.id), {
        onSuccess: () => adjustForm.reset(),
    });
}
```
Fields:
- `quantity` — number input, step=0.01, placeholder "+10 or -5", signed (no min)
- `notes` — text input, optional, placeholder "Reason for adjustment"
- Submit button: "Adjust Stock"
- Error messages below each field

**Section 3: Project Usage Card**

Table:
| Project | Qty Used | Unit | Cost at Time | Total Cost | Notes |
|---------|----------|------|--------------|------------|-------|
- Project column: `<Link href={'/projects/' + project.slug}>` in amber
- Cost at Time: `$X.XX` or `—`
- Total Cost: `cost_at_time * quantity_used` or `—` if either is null
- Footer row (if any projects): sum of all total costs labeled "Total Material Cost"
- Empty state: "This material hasn't been used in any projects yet."

#### Acceptance Criteria
- All material fields display correctly; nulls show `—`
- Stock adjustment form POSTs to `materials.adjust-stock`, flash message appears after redirect
- Delete button confirms then performs `router.delete`; redirect to index occurs server-side
- Projects table renders with pivot data; empty state shows when no projects
- Flash messages from session display on page load via `usePage().props.flash`

---

### TASK-07: Supplier CRUD Pages

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-03
**Estimated complexity:** medium

#### Objective
Create all four Supplier pages. No stubs exist — these are new files.

#### Files to Create
- `resources/js/Pages/Suppliers/Index.jsx`
- `resources/js/Pages/Suppliers/Show.jsx`
- `resources/js/Pages/Suppliers/Create.jsx`
- `resources/js/Pages/Suppliers/Edit.jsx`

#### Data Contracts

Index props: `{ suppliers, filters }`
- `suppliers`: paginator `{ data[], current_page, last_page, total, links: { prev, next } }`
- `suppliers.data[n]`: `{ id, name, contact_name, email, phone, website, address, notes }`
- `filters`: `{ search }`

Show props: `{ supplier }`
- `supplier.materials_count` available (from `loadCount`)

Create props: none
Edit props: `{ supplier }`

#### Suppliers/Index.jsx

Same layout structure as Materials/Index:
- Header: "Suppliers" + count + "+ New Supplier" button to `/suppliers/create`
- Search input (debounced 300ms, `router.get('/suppliers', params, { preserveState: true, replace: true })`)
- Table columns: Name | Contact | Email | Phone | Actions ("Edit" link to `/suppliers/{id}/edit`)
- Pagination (prev/next)
- Empty state: "No suppliers found."

#### Suppliers/Create.jsx and Suppliers/Edit.jsx

Single-card form with all 7 supplier fields:
- `name` — text input, required
- `contact_name` — text input, optional
- `email` — email input, optional
- `phone` — text input, optional
- `website` — url input, optional, placeholder "https://..."
- `address` — Textarea, optional, rows=3
- `notes` — Textarea, optional, rows=4

Create: `form.post(route('suppliers.store'))`. Cancel: `route('suppliers.index')`.
Edit: `form.patch(route('suppliers.update', supplier.id))`. Cancel: `route('suppliers.show', supplier.id)`.

Edit pre-populates all fields from `supplier.*`, using `?? ''` for nullables.

#### Suppliers/Show.jsx

- Header: supplier name, Edit button, Delete button (confirm + `router.delete(route('suppliers.destroy', supplier.id))`)
- Flash messages: same Alert pattern as other show pages
- Detail card (two-column): Name, Contact Name, Email (as mailto link if present), Phone, Website (as `<a href>` if present), Address (full-width), Notes (full-width)
- Materials count callout: "X material(s) sourced from this supplier" using `supplier.materials_count`

#### Acceptance Criteria
- All 4 pages render at correct Inertia component paths
- Index search filter works with debounce and URL query string
- Create form POSTs, Edit form PATCHes, both redirect on success
- Show page displays all fields; Delete hard-deletes and redirects to index
- Wrap in `AppLayout` with `Head` title on all pages

---

### Group 3 — Tests (depends on Group 1 completions)

---

### TASK-08: Material Controller Feature Tests

**Group:** 3 (Tests)
**Agent:** backend-laravel
**Depends on:** TASK-01, TASK-02
**Estimated complexity:** medium

#### Objective
Expand `tests/Feature/MaterialControllerTest.php`. Replace the existing 4 placeholder tests entirely with a comprehensive test suite for every controller action plus the `lowStock` model scope.

#### Files to Modify
- `tests/Feature/MaterialControllerTest.php` — full replacement

#### Files to Read First
- `tests/Feature/ProjectControllerTest.php` — follow exact patterns
- `app/Http/Controllers/MaterialController.php` (post TASK-01)
- `app/Models/Material.php` (post TASK-02)
- `database/factories/MaterialFactory.php`, `SupplierFactory.php`, `MaterialCategoryFactory.php`

#### Required Tests

**Auth/Access:**
```php
#[Test]
public function guest_is_redirected_from_materials(): void
// GET /materials → assertRedirect('/login')
```

**Index:**
```php
#[Test]
public function authenticated_user_can_view_materials_index(): void
// assertInertia: component 'Materials/Index', has 'materials', 'filters', 'categories', 'suppliers'

#[Test]
public function index_filters_by_category(): void
// Create 2 materials with different categories, filter by one, assert only matching returned

#[Test]
public function index_filters_by_supplier(): void
// Create 2 materials with different suppliers, filter by one

#[Test]
public function index_search_returns_materials(): void
// Create material with known name, search=name, assert 200 (Scout with database driver)
```

**Create:**
```php
#[Test]
public function create_page_returns_units_categories_and_suppliers(): void
// assertInertia: has 'units', 'categories', 'suppliers'
```

**Store:**
```php
#[Test]
public function store_creates_material_and_redirects_to_show(): void
// POST /materials with valid data → assertDatabaseHas, assertRedirect to materials.show

#[Test]
public function store_requires_name(): void
// POST without name → assertSessionHasErrors(['name'])

#[Test]
public function store_requires_unit(): void
// POST without unit → assertSessionHasErrors(['unit'])

#[Test]
public function store_rejects_invalid_unit_value(): void
// POST with unit='invalid' → assertSessionHasErrors(['unit'])
```

**Show:**
```php
#[Test]
public function show_returns_material_with_component(): void
// GET /materials/{id} → assertInertia: component 'Materials/Show', has 'material'
```

**Edit:**
```php
#[Test]
public function edit_returns_material_with_options(): void
// GET /materials/{id}/edit → assertInertia: has 'material', 'units', 'categories', 'suppliers'
```

**Update:**
```php
#[Test]
public function update_saves_changes_and_redirects_to_show(): void
// PATCH /materials/{id} → assertDatabaseHas updated value, assertRedirect to show

#[Test]
public function update_with_invalid_unit_returns_error(): void
// PATCH with unit='bad' → assertSessionHasErrors(['unit'])
```

**Destroy:**
```php
#[Test]
public function destroy_soft_deletes_material(): void
// DELETE /materials/{id} → assertSoftDeleted('materials', ['id' => $id]), assertRedirect to index
```

**Adjust Stock:**
```php
#[Test]
public function adjust_stock_increments_quantity(): void
// Create material with quantity_on_hand=10.00
// POST /materials/{id}/adjust with quantity=5
// assertDatabaseHas('materials', ['id' => $id, 'quantity_on_hand' => 15.00])

#[Test]
public function adjust_stock_decrements_quantity(): void
// Create material with quantity_on_hand=10.00
// POST with quantity=-3
// assertDatabaseHas: quantity_on_hand=7.00

#[Test]
public function adjust_stock_cannot_go_below_zero(): void
// Create material with quantity_on_hand=5.00
// POST with quantity=-100
// assertDatabaseHas: quantity_on_hand=0.00

#[Test]
public function adjust_stock_requires_quantity(): void
// POST without quantity → assertSessionHasErrors(['quantity'])
```

**Low Stock Scope (model-level test, no HTTP):**
```php
#[Test]
public function low_stock_scope_returns_only_materials_at_or_below_threshold(): void
// Material A: quantity_on_hand=2, low_stock_threshold=5 → LOW (should appear)
// Material B: quantity_on_hand=10, low_stock_threshold=5 → OK (should not appear)
// Material C: quantity_on_hand=1, low_stock_threshold=null → no threshold (should not appear)
// Assert: Material::lowStock()->count() === 1
// Assert: Material::lowStock()->first()->id === $materialA->id
```

#### Test Class Structure
```php
class MaterialControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ... all #[Test] methods
}
```

#### Acceptance Criteria
- All tests pass: `./vendor/bin/sail artisan test --filter=MaterialControllerTest`
- Every controller action covered with at least one happy-path test
- Validation tests use `assertSessionHasErrors`
- Soft delete test uses `assertSoftDeleted`
- Low stock scope tested directly on the model (no HTTP call)
- No hardcoded IDs — always use factories

---

### TASK-09: Supplier Controller Feature Tests

**Group:** 3 (Tests)
**Agent:** backend-laravel
**Depends on:** TASK-03
**Estimated complexity:** low-medium

#### Objective
Create a new feature test file for `SupplierController` covering all 7 resource actions. Verify hard-delete behavior and DB cascade nullification on materials.

#### Files to Create
- `tests/Feature/SupplierControllerTest.php`

#### Files to Read First
- `tests/Feature/ProjectControllerTest.php` — pattern reference
- `app/Http/Controllers/SupplierController.php` (post TASK-03)
- `database/factories/SupplierFactory.php`, `MaterialFactory.php`

#### Required Tests

**Auth:**
```php
#[Test]
public function guest_is_redirected_from_suppliers(): void
// GET /suppliers → assertRedirect('/login')
```

**Index:**
```php
#[Test]
public function authenticated_user_can_view_suppliers_index(): void
// assertInertia: component 'Suppliers/Index', has 'suppliers', 'filters'

#[Test]
public function index_search_filters_by_name(): void
// Create 2 suppliers with different names, GET /suppliers?search=name1, assert 200
```

**Create:**
```php
#[Test]
public function create_page_renders(): void
// assertInertia: component 'Suppliers/Create'
```

**Store:**
```php
#[Test]
public function store_creates_supplier_and_redirects_to_show(): void
// POST /suppliers with name → assertDatabaseHas, assertRedirect to suppliers.show

#[Test]
public function store_requires_name(): void
// POST without name → assertSessionHasErrors(['name'])

#[Test]
public function store_rejects_invalid_email(): void
// POST with email='not-an-email' → assertSessionHasErrors(['email'])

#[Test]
public function store_rejects_invalid_website_url(): void
// POST with website='not-a-url' → assertSessionHasErrors(['website'])
```

**Show:**
```php
#[Test]
public function show_returns_supplier(): void
// assertInertia: component 'Suppliers/Show', has 'supplier'
```

**Edit:**
```php
#[Test]
public function edit_returns_supplier(): void
// assertInertia: component 'Suppliers/Edit', has 'supplier'
```

**Update:**
```php
#[Test]
public function update_saves_changes_and_redirects_to_show(): void
// PATCH /suppliers/{id} → assertDatabaseHas updated name, assertRedirect to show

#[Test]
public function update_with_invalid_email_returns_error(): void
// PATCH with email='bad' → assertSessionHasErrors(['email'])
```

**Destroy:**
```php
#[Test]
public function destroy_hard_deletes_supplier(): void
// DELETE /suppliers/{id} → assertDatabaseMissing('suppliers', ['id' => $id])
// NOT assertSoftDeleted — this is a hard delete

#[Test]
public function destroy_nullifies_supplier_id_on_related_materials(): void
// Create supplier, create material with that supplier_id
// DELETE supplier
// assertDatabaseHas('materials', ['id' => $material->id, 'supplier_id' => null])
// Verify material still exists (only supplier_id is nulled via DB cascade)
```

#### Acceptance Criteria
- All tests pass: `./vendor/bin/sail artisan test --filter=SupplierControllerTest`
- Destroy test uses `assertDatabaseMissing` (hard delete, not soft)
- Cascade null test verifies DB `nullOnDelete()` foreign key behavior on the materials table
- No hardcoded IDs — all factories

---

## Dependency Graph

```
TASK-01 (MaterialController CRUD) ──┐
                                    ├──► TASK-04 (Materials Index Page)
                                    ├──► TASK-05 (Create/Edit Forms)
                                    │
TASK-02 (Stock Adjustment) ─────────┼──► TASK-06 (Show Page)
                                    │
                                    └──► TASK-08 (Material Tests)

TASK-03 (Supplier Backend) ─────────┬──► TASK-07 (Supplier Pages)
                                    └──► TASK-09 (Supplier Tests)
```

**Group 1** tasks (01, 02, 03) have no dependencies and can run in parallel.
**Group 2** tasks (04–07) require their backend task(s) to be complete first.
**Group 3** tasks (08, 09) require the corresponding backend tasks.

---

## File Ownership Map

| Task | Files Exclusively Owned |
|------|------------------------|
| TASK-01 | `app/Http/Controllers/MaterialController.php` (index, create, store, show, edit, update, destroy); `routes/web.php` (materials route change) |
| TASK-02 | `app/Http/Controllers/MaterialController.php` (adjustStock method); `app/Models/Material.php` (scope + helpers) |
| TASK-03 | `app/Http/Controllers/SupplierController.php` (create); `app/Http/Requests/StoreSupplierRequest.php` (create); `app/Http/Requests/UpdateSupplierRequest.php` (create); `routes/web.php` (supplier route addition) |
| TASK-04 | `resources/js/Pages/Materials/Index.jsx` |
| TASK-05 | `resources/js/Pages/Materials/Create.jsx`; `resources/js/Pages/Materials/Edit.jsx` |
| TASK-06 | `resources/js/Pages/Materials/Show.jsx` |
| TASK-07 | `resources/js/Pages/Suppliers/Index.jsx` (create); `resources/js/Pages/Suppliers/Show.jsx` (create); `resources/js/Pages/Suppliers/Create.jsx` (create); `resources/js/Pages/Suppliers/Edit.jsx` (create) |
| TASK-08 | `tests/Feature/MaterialControllerTest.php` |
| TASK-09 | `tests/Feature/SupplierControllerTest.php` (create) |

> **Note on shared files:** TASK-01 and TASK-02 both modify `MaterialController.php` — TASK-01 owns methods 1–7 stub replacements, TASK-02 owns the `adjustStock` method. TASK-03 adds lines to `routes/web.php` in a non-overlapping location from TASK-01's change. If executing with a single agent, apply in order: 01 → 02 → 03.

---

## Summary Table

| Task ID | Title | Group | Agent | Depends On | Complexity |
|---------|-------|-------|-------|------------|------------|
| TASK-01 | MaterialController CRUD | 1 | backend-laravel | — | medium |
| TASK-02 | Stock Adjustment Backend | 1 | backend-laravel | — | low |
| TASK-03 | Supplier CRUD Backend | 1 | backend-laravel | — | medium |
| TASK-04 | Materials Index Page | 2 | frontend-react | TASK-01 | medium |
| TASK-05 | Materials Create/Edit Forms | 2 | frontend-react | TASK-01 | medium |
| TASK-06 | Materials Show Page | 2 | frontend-react | TASK-01, TASK-02 | medium |
| TASK-07 | Supplier CRUD Pages | 2 | frontend-react | TASK-03 | medium |
| TASK-08 | Material Controller Tests | 3 | backend-laravel | TASK-01, TASK-02 | medium |
| TASK-09 | Supplier Controller Tests | 3 | backend-laravel | TASK-03 | low-medium |

**Total tasks: 9** (within the 12-task maximum)
