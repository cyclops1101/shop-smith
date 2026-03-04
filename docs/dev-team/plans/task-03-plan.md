# Task 03 Plan: Supplier CRUD Backend

**Task ID:** TASK-03
**Domain:** backend
**Feature:** Supplier CRUD — controller, two form requests, routes
**Status:** pending

---

## 1. Approach

Implement a full Supplier CRUD following the project conventions from CLAUDE.md:

- **Fat models, thin controllers** — the `Supplier` model already defines all `$fillable` fields and the `materials()` / `expenses()` relationships. No model changes are required.
- **Form requests for all validation** — two new `FormRequest` classes handle `store` and `update` validation. The controller never calls `$request->validate()`.
- **ULID primary keys** — `Supplier` already uses `HasUlids`. Route model binding uses the ULID directly (no slug — suppliers have no slug field). Laravel resolves `Supplier $supplier` from the `{supplier}` route segment automatically via the ULID `id` column because `HasUlids` configures it as the route key.
- **Hard delete** — per CLAUDE.md: "Hard delete everything else." Suppliers have no `SoftDeletes` trait in the model and must not gain one.
- **Search via LIKE, not Scout** — `index()` uses an Eloquent `LIKE` query across `name`, `contact_name`, and `email`. Scout is used only for Projects per the spec; the task spec explicitly requires LIKE for suppliers.
- **Inertia responses** — all read methods return `Inertia::render(...)`. Write methods return `RedirectResponse` with a `with('success', ...)` flash.

No service class is needed — supplier persistence is straightforward `create` / `update` / `delete` with no side effects.

---

## 2. Files to Create or Modify

| File | Action |
|------|--------|
| `app/Http/Requests/StoreSupplierRequest.php` | Create |
| `app/Http/Requests/UpdateSupplierRequest.php` | Create |
| `app/Http/Controllers/SupplierController.php` | Create |
| `routes/web.php` | Modify — add `Route::resource('suppliers', SupplierController::class)` inside the existing `auth + verified` middleware group |

No model changes. No migration changes (suppliers table already exists with all required columns as confirmed by the model's `$fillable`). No frontend files in this task.

---

## 3. Detailed Implementation

### 3.1 `StoreSupplierRequest`

**File:** `app/Http/Requests/StoreSupplierRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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
}
```

`authorize()` returns `true` unconditionally — this is the established pattern in every other `FormRequest` in this codebase (see `StoreMaterialRequest`, `StoreToolRequest`, `StoreProjectRequest`). Route-level auth is enforced by the `auth + verified` middleware group in `routes/web.php`.

### 3.2 `UpdateSupplierRequest`

**File:** `app/Http/Requests/UpdateSupplierRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email'        => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone'        => ['sometimes', 'nullable', 'string', 'max:50'],
            'website'      => ['sometimes', 'nullable', 'url', 'max:500'],
            'address'      => ['sometimes', 'nullable', 'string'],
            'notes'        => ['sometimes', 'nullable', 'string'],
        ];
    }
}
```

`sometimes` is prepended to every rule. This is identical to the pattern in `UpdateMaterialRequest` and `UpdateProjectRequest` — `sometimes` means the rule is only evaluated if the field is present in the request payload, supporting partial PATCH-style updates from the frontend form.

### 3.3 `SupplierController`

**File:** `app/Http/Controllers/SupplierController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        $suppliers = Supplier::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('contact_name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters'   => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Suppliers/Create');
    }

    public function store(StoreSupplierRequest $request): RedirectResponse
    {
        $supplier = Supplier::create($request->validated());

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', 'Supplier created successfully.');
    }

    public function show(Supplier $supplier): Response
    {
        $supplier->loadCount('materials');

        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier,
        ]);
    }

    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('Suppliers/Edit', [
            'supplier' => $supplier,
        ]);
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return redirect()->route('suppliers.index')
            ->with('success', 'Supplier deleted successfully.');
    }
}
```

### 3.4 `routes/web.php` modification

Inside the existing `Route::middleware(['auth', 'verified'])->group(...)` block, add one line after the Tools resource block (before Finance routes, for logical grouping):

```php
// Suppliers (resource: index, create, store, show, edit, update, destroy)
Route::resource('suppliers', SupplierController::class);
```

Also add the import at the top of the file alongside the other controller imports:

```php
use App\Http\Controllers\SupplierController;
```

The full supplier resource registers these seven routes:

| Method | URI | Name | Action |
|--------|-----|------|--------|
| GET | `/suppliers` | `suppliers.index` | `index` |
| GET | `/suppliers/create` | `suppliers.create` | `create` |
| POST | `/suppliers` | `suppliers.store` | `store` |
| GET | `/suppliers/{supplier}` | `suppliers.show` | `show` |
| GET | `/suppliers/{supplier}/edit` | `suppliers.edit` | `edit` |
| PUT/PATCH | `/suppliers/{supplier}` | `suppliers.update` | `update` |
| DELETE | `/suppliers/{supplier}` | `suppliers.destroy` | `destroy` |

No `->except([...])` call is needed — all seven standard resource routes are required, including `destroy` (hard delete).

---

## 4. Key Decisions and Rationale

### Decision 1: Route model binding uses ULID, not slug

The `Supplier` model has no `slug` field. CLAUDE.md states "Route model binding with slug for projects, ULID for other models." `HasUlids` sets the route key to the `id` column (a ULID), so `{supplier}` in the URI resolves to `Supplier` by ULID automatically with no extra configuration. This is consistent with how `MaterialController` and `ToolController` use their ULID-keyed models.

### Decision 2: LIKE search — not Scout — for `index()`

The task spec explicitly requires "LIKE search on name/contact_name/email (NOT Scout)." Scout with the database driver is configured for `Project` (which implements `Searchable`). `Supplier` does not implement `Searchable` and must not be added to Scout. The LIKE approach with `->when($search, ...)` is correct and sufficient for a solo-user tool with a small supplier list.

The OR group is wrapped in a nested `where(function ($q) {...})` closure to correctly parenthesize the OR clauses — without the closure wrapper, the `orWhere` calls would leak outside any other `where` conditions, producing incorrect SQL. For `index()` there are no other `where` clauses currently, but the closure is correct defensive style.

### Decision 3: `paginate(20)->withQueryString()`

`withQueryString()` appends the current query string (including `search=...`) to pagination links. Without it, navigating to page 2 of a search result would lose the search term. This is the same pattern used in `ProjectController::index()`.

### Decision 4: `loadCount('materials')` in `show()`

`$supplier->loadCount('materials')` appends a `materials_count` integer attribute to the supplier model instance, which the frontend can display (e.g., "12 materials use this supplier"). It does not eager-load the material rows themselves, keeping the `show` response lightweight. The `materials()` relationship is already defined on the `Supplier` model.

### Decision 5: Hard delete in `destroy()`

`$supplier->delete()` performs a hard delete because `Supplier` does not use `SoftDeletes`. Per CLAUDE.md: "Soft deletes on: projects, materials, tools. Hard delete everything else." If a supplier has associated materials, the foreign key in the `materials` table (`supplier_id`) will be set to `NULL` on delete (assuming the migration defines `->nullable()->constrained()->nullOnDelete()`). This is the correct behavior — materials should not be deleted when a supplier is removed.

### Decision 6: Flash messages match existing conventions

All redirect flash keys use `'success'` to match `ProjectController`, which uses `->with('success', '...')` exclusively. The `HandleInertiaRequests` middleware shares `flash.success` with the frontend.

### Decision 7: `index()` passes `filters` array to the frontend

`['search' => $search]` is passed as `filters` so the frontend can repopulate the search input field. This mirrors `ProjectController::index()` which passes `'filters' => $filters`.

---

## 5. Verified Dependencies

| Requirement | Status |
|-------------|--------|
| `Supplier` model exists with `HasUlids`, `HasFactory`, correct `$fillable` | Confirmed — `app/Models/Supplier.php` |
| `Supplier::materials()` hasMany relation | Confirmed — `app/Models/Supplier.php` line 24 |
| `Supplier` has no `SoftDeletes` trait | Confirmed — model only uses `HasFactory` and `HasUlids` |
| `Supplier` has no `Searchable` trait | Confirmed — Scout is not involved |
| `auth + verified` middleware group exists in `routes/web.php` | Confirmed — line 27 |
| All other resource controllers follow the same Inertia + FormRequest pattern | Confirmed — `ProjectController`, `MaterialController`, `ToolController` |
| `authorize(): bool { return true; }` is the established FormRequest pattern | Confirmed — `StoreMaterialRequest`, `UpdateMaterialRequest`, `StoreToolRequest` all return `true` |
| `suppliers` table exists with all required columns | Inferred from `Supplier::$fillable` matching task spec fields; model was present in the initial commit |
| No `slug` column on suppliers table | Confirmed by model — `$fillable` does not include `slug` |
| `Route::resource` generates all 7 standard routes | Laravel 12 standard behavior, no overrides needed |

---

## 6. Risks and Mitigations

### Risk 1: Foreign key constraint violation on `destroy()`

**Risk:** If the `materials.supplier_id` foreign key is `RESTRICT` (not `SET NULL`), deleting a supplier that has associated materials will throw a database integrity error.

**Mitigation:** The migration for `materials` should define `->nullOnDelete()` on the `supplier_id` foreign key. If not already the case, this is a migration concern (Task 01 or a migration fix task). The controller itself calls `$supplier->delete()` correctly — no special handling is needed at the controller level beyond what the DB constraint enforces. The implementer should verify the migration's cascade rule before running tests.

### Risk 2: `LIKE` search performance

**Risk:** `LIKE "%term%"` (leading wildcard) cannot use a B-tree index and will do a full table scan. For a solo woodworker's supplier list, this is not a practical concern.

**Mitigation:** None required. The application is single-user and supplier counts will be small (tens to low hundreds). If performance becomes an issue in the future, a `FULLTEXT` index can be added.

### Risk 3: `withQueryString()` missing from `paginate()`

**Risk:** Forgetting `withQueryString()` causes search pagination to lose the `search` parameter on page 2+.

**Mitigation:** Included explicitly in the implementation per the task spec.

### Risk 4: Route key conflict between `/suppliers/create` and `{supplier}` ULID binding

**Risk:** If the router tries to resolve the literal string `"create"` as a ULID for a `GET /suppliers/create` request, it would fail.

**Mitigation:** Laravel's resource route registration always registers `/suppliers/create` as a named literal route before `{supplier}` pattern routes. No conflict occurs. This is standard Laravel behavior unchanged in v12.

---

## 7. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| `StoreSupplierRequest` with correct rules | Section 3.1 — all 7 fields with required/nullable/type/max rules |
| `UpdateSupplierRequest` with `sometimes` prefix on all fields | Section 3.2 — `sometimes` prepended to every rule |
| `index()` LIKE search on name, contact_name, email | `->where('name', 'like', "%{search}%")->orWhere(...)` in nested closure |
| `index()` not using Scout | No `Supplier::search()` call anywhere |
| `index()` orderBy name, paginate(20), withQueryString | `->orderBy('name')->paginate(20)->withQueryString()` |
| `create()` renders Inertia page | `return Inertia::render('Suppliers/Create')` |
| `store()` uses `Supplier::create`, redirects to show with flash | `Supplier::create($request->validated())` + `redirect()->route('suppliers.show', $supplier)->with('success', ...)` |
| `show()` loadCount materials | `$supplier->loadCount('materials')` |
| `edit()` renders with supplier | `Inertia::render('Suppliers/Edit', ['supplier' => $supplier])` |
| `update()` uses `$supplier->update`, redirects to show | `$supplier->update($request->validated())` + redirect to show |
| `destroy()` hard delete, redirect to index | `$supplier->delete()` (hard, no SoftDeletes) + `redirect()->route('suppliers.index')` |
| Routes inside `auth + verified` middleware group | Added inside the existing `Route::middleware(['auth', 'verified'])->group(...)` block |
| Full resource routes (all 7) registered | `Route::resource('suppliers', SupplierController::class)` with no `->except([])` |
| ULID primary key / route model binding | `HasUlids` on the model; `{supplier}` resolves by ULID `id` column automatically |
| Hard delete (no SoftDeletes) | Confirmed by model; `delete()` is permanent |
