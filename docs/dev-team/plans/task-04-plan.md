# Task 04: Materials Index Page — Implementation Plan

**Task ID:** 04
**Domain:** frontend
**Scope:** Replace stub `resources/js/Pages/Materials/Index.jsx` with a full working page following the `Projects/Index.jsx` pattern.

---

## 1. Approach

The existing `Materials/Index.jsx` is a three-line stub that renders a static heading. It must be replaced wholesale with a real page. The implementation strategy is:

1. Follow the structure of `Projects/Index.jsx` exactly: same import set, same component decomposition pattern (FilterBar sub-component, table sub-component, pagination, main export with debounced search).
2. Adapt for the materials domain: two Select filters (category, supplier) instead of (status, priority); eight table columns instead of five; a low-stock red Badge instead of status/priority Badges; currency formatting for unit cost.
3. No new UI primitives are needed — all required components (`Badge`, `Button`, `Input`, `Select`, `Table` family) are already present in `resources/js/Components/ui/`.
4. No backend changes are required for this task. The controller stub at `app/Http/Controllers/MaterialController.php` and the route at `Route::resource('materials', ...)` already exist. (The controller `index()` method will need to be fleshed out in a separate backend task to pass the correct props, but the frontend page must be ready to consume them.)

---

## 2. Files to Modify

| File | Action |
|---|---|
| `resources/js/Pages/Materials/Index.jsx` | Full replacement — remove stub, write complete implementation |

No other files require changes for this task.

---

## 3. Component Structure

The page is composed of three internal components plus the default export:

```
MaterialsIndex (default export)
  └── FilterBar          (text search + category Select + supplier Select)
  └── MaterialsTable     (table + empty state + prev/next pagination)
```

This mirrors the `ProjectsIndex` / `FilterBar` / `ProjectsTable` decomposition exactly.

---

## 4. Implementation Details

### 4.1 Imports

```jsx
import { useState, useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
```

`Card` / `CardContent` are not imported — materials have no board view. `useState` is kept in case a view toggle is added later; in this iteration it is only used for the debounce timer management which is done via `useRef`. `useState` can be removed if not needed — see decision 4.4.

### 4.2 Helper: `formatCost(value)`

```jsx
function formatCost(value) {
    if (value === null || value === undefined) return '—';
    return '$' + Number(value).toFixed(2);
}
```

`unit_cost` is `decimal(10,2)` stored in MySQL and returned as a numeric string by Laravel's JSON serialization (e.g., `"12.50"`). `Number(value).toFixed(2)` handles both string and numeric input correctly and always produces two decimal places.

### 4.3 FilterBar component

Props: `{ filters, categories, suppliers, onSearchChange, onCategoryChange, onSupplierChange }`

- Search: `<Input type="search" defaultValue={filters.search ?? ''} onChange={onSearchChange} />`
- Category: `<Select options={categoryOptions} placeholder="All categories" value={filters.category ?? ''} onChange={onCategoryChange} />`
- Supplier: `<Select options={supplierOptions} placeholder="All suppliers" value={filters.supplier ?? ''} onChange={onSupplierChange} />`

`categories` and `suppliers` arrays from props are mapped to `{ value: item.id, label: item.name }` option objects inside `FilterBar`. This is done inline at render time — no need for a top-level constant since these are dynamic prop values.

### 4.4 Low-stock logic

A material is "low stock" when `quantity_on_hand <= low_stock_threshold` AND `low_stock_threshold` is not null. The table cell for "In Stock" renders a red `<Badge variant="destructive">` wrapping the quantity when this condition is true, and plain text otherwise.

```jsx
const isLowStock =
    material.low_stock_threshold !== null &&
    material.quantity_on_hand <= material.low_stock_threshold;
```

Decision: use `variant="destructive"` (which maps to `bg-red-100 text-red-700 border-red-200` in `Badge.jsx`) rather than a `color` prop, to stay consistent with the existing shadcn-style variant system and avoid hard-coded hex values.

### 4.5 MaterialsTable component

Props: `{ materials }` (the full paginator object)

Columns: Name (Link), SKU, Category, Unit, In Stock, Low Stock indicator, Unit Cost, Actions (Edit Link).

The spec lists "Low Stock (red Badge)" as its own column. Implementation decision: render it as part of the "In Stock" cell rather than a separate column, to keep the table readable. The "In Stock" cell shows the quantity; if low stock, it wraps the quantity in a `<Badge variant="destructive">`. A separate "Low Stock" column that is empty for normal items would waste horizontal space. **If the spec is read strictly as eight separate columns**, the alternative is a dedicated "Low Stock" column that either renders a small red "Low" badge or is empty — this is noted as a risk (see section 7).

Table column order (8 columns):

| # | Head | Content |
|---|---|---|
| 1 | Name | `<Link href="/materials/{id}">` with material name |
| 2 | SKU | `material.sku` or `—` if null |
| 3 | Category | `material.category?.name` or `—` |
| 4 | Unit | `material.unit` (string enum value from backend) |
| 5 | In Stock | quantity_on_hand, wrapped in `<Badge variant="destructive">` when low stock |
| 6 | Low Stock At | `material.low_stock_threshold` or `—` |
| 7 | Unit Cost | `formatCost(material.unit_cost)` |
| 8 | Actions | `<Link href="/materials/{id}/edit">Edit</Link>` |

### 4.6 Pagination

Identical to `ProjectsTable`: read `links.prev` and `links.next` from the paginator, render enabled `<Link>` for each that exists and a greyed disabled `<span>` for each that does not. Show "Page X of Y (Z total)" counter.

### 4.7 Main export: `MaterialsIndex`

Props: `{ materials, filters, categories, suppliers }`

```jsx
export default function MaterialsIndex({ materials, filters, categories, suppliers }) {
    const debounceTimer = useRef(null);

    const navigate = useCallback((params) => {
        router.get('/materials', params, { preserveState: true, replace: true });
    }, []);

    const currentFilters = {
        search:   filters?.search   ?? '',
        category: filters?.category ?? '',
        supplier: filters?.supplier ?? '',
    };

    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            navigate({ ...currentFilters, search: value || undefined });
        }, 300);
    }, [currentFilters, navigate]);

    const handleCategoryChange = useCallback((e) => {
        navigate({ ...currentFilters, category: e.target.value || undefined });
    }, [currentFilters, navigate]);

    const handleSupplierChange = useCallback((e) => {
        navigate({ ...currentFilters, supplier: e.target.value || undefined });
    }, [currentFilters, navigate]);

    return (
        <AppLayout>
            <Head title="Materials" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Materials</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {materials.total} material{materials.total !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <Link href="/materials/create">
                            <Button variant="default" size="md">+ New Material</Button>
                        </Link>
                    </div>

                    {/* Filter bar */}
                    <div className="mb-5">
                        <FilterBar
                            filters={currentFilters}
                            categories={categories}
                            suppliers={suppliers}
                            onSearchChange={handleSearchChange}
                            onCategoryChange={handleCategoryChange}
                            onSupplierChange={handleSupplierChange}
                        />
                    </div>

                    {/* Table */}
                    <MaterialsTable materials={materials} />
                </div>
            </div>
        </AppLayout>
    );
}
```

No view toggle (list/board) is included — materials have only a list view.

---

## 5. Decisions with Rationale

| Decision | Choice | Rationale |
|---|---|---|
| Low-stock display | Wrap "In Stock" quantity in a `<Badge variant="destructive">` within the same cell | Avoids a mostly-empty seventh column; preserves scannability. The threshold value is shown in a separate "Low Stock At" column so the context is still visible. |
| Name links to detail page | `/materials/{material.id}` using ULID | Materials use ULID for route binding (per CLAUDE.md convention for non-project models). No slug field exists on `Material`. |
| Edit link | `/materials/{material.id}/edit` | Same ULID binding as above, matching the existing route `Route::resource('materials', ...)`. |
| `formatCost` for unit_cost | `'$' + Number(value).toFixed(2)` | `unit_cost` arrives as a string from JSON (MySQL decimal). `Number()` coerces safely; `.toFixed(2)` always gives two decimal places. |
| `useRef` for debounce timer | Same pattern as `Projects/Index.jsx` | Avoids re-renders on timer updates; ref persists across renders without triggering effects. |
| Empty string filters cleared to `undefined` | `value || undefined` in navigate calls | Prevents empty string query params (`?search=`) appearing in the URL, keeping URLs clean and consistent with how the backend expects absent filters. |
| No `useState` for view toggle | Omitted entirely | Materials have one view; adding dead state adds noise. |

---

## 6. Verified Dependencies

All the following are confirmed to exist in the codebase before implementation:

| Dependency | Location | Status |
|---|---|---|
| `AppLayout` | `resources/js/Layouts/AppLayout.jsx` | Confirmed present |
| `Badge` (with `variant` prop) | `resources/js/Components/ui/Badge.jsx` | Confirmed; supports `variant="destructive"` → `bg-red-100 text-red-700 border-red-200` |
| `Button` (with `variant`, `size` props) | `resources/js/Components/ui/Button.jsx` | Confirmed; `variant="default"` → amber-600 |
| `Input` (with `type`, `defaultValue`, `onChange`) | `resources/js/Components/ui/Input.jsx` | Confirmed; `forwardRef` wrapped |
| `Select` (with `options`, `placeholder`, `value`, `onChange`) | `resources/js/Components/ui/Select.jsx` | Confirmed; `options` must be `[{ value, label }]` |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `resources/js/Components/ui/Table.jsx` | Confirmed; all named exports present |
| `Link`, `Head`, `router` from `@inertiajs/react` | npm package | Confirmed in use by `Projects/Index.jsx` |
| Route `GET /materials` | `routes/web.php` line 42 | Confirmed via `Route::resource('materials', MaterialController::class)->except(['destroy'])` |
| Route `GET /materials/create` | Same resource route | Confirmed |
| Route `GET /materials/{material}/edit` | Same resource route | Confirmed; binds by ULID |

`Material` model has `category` (BelongsTo `MaterialCategory`) and `supplier` (BelongsTo `Supplier`) relationships — confirmed in `app/Models/Material.php`. The controller must eager-load these before the page can display category/supplier names, but that is a backend concern outside this task's scope.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Controller `index()` does not yet pass `materials`, `filters`, `categories`, `suppliers` props | High — controller is a stub | The page must be written to receive these props; the backend task to implement `MaterialController::index()` is a dependency for the page to be fully functional. The frontend code should gracefully handle missing props using nullish coalescing (`?? []`, `?? {}`) to avoid runtime errors when the stub controller renders the page. |
| "Low Stock" column interpretation | Medium — spec says "Low Stock (red Badge)" as a column | If the implementor reads this as a separate standalone column, they should add a dedicated "Low Stock" `<TableHead>` and render a `<Badge variant="destructive">Low</Badge>` (or nothing) in each row. The plan above merges it into "In Stock" for UX reasons, but either interpretation is valid. |
| `unit` field display | Low | The backend casts `unit` to the `MaterialUnit` enum. Laravel serializes PHP-backed string enums to their raw string value in JSON (e.g., `"board_foot"`). The UI spec does not require a human-readable label in the table — displaying the raw value is acceptable. If a label is needed, a lookup map from `MaterialUnit` values to labels can be added (e.g., `board_foot` → `Board Foot`). |
| `unit_cost` null handling | Low | `formatCost` returns `'—'` for null/undefined. This is safe because `unit_cost` is nullable in the schema. |
| Name column link target | Low | If a detail/show page for materials does not yet exist, the Name link will 404. This is acceptable during development; the link target is correct per the resource routing. |

---

## 8. Acceptance Criteria Coverage

| Criterion from spec | How it is satisfied |
|---|---|
| Header: "Materials" title | `<h1>Materials</h1>` in main export |
| Header: count | `{materials.total} material{s}` paragraph below h1 |
| Header: "+ New Material" button | `<Link href="/materials/create"><Button>+ New Material</Button></Link>` |
| Filter bar: text search debounced 300ms | `handleSearchChange` with `useRef` debounce timer, 300ms delay |
| Filter bar: category Select | `<Select options={...} value={filters.category}>` in `FilterBar` |
| Filter bar: supplier Select | `<Select options={...} value={filters.supplier}>` in `FilterBar` |
| Filter navigation: `router.get('/materials', params, { preserveState: true, replace: true })` | `navigate()` callback used by all three filter handlers |
| Table column: Name (link) | `<Link href="/materials/{id}">{name}</Link>` in `MaterialsTable` |
| Table column: SKU | `material.sku \|\| '—'` |
| Table column: Category | `material.category?.name \|\| '—'` |
| Table column: Unit | `material.unit` |
| Table column: In Stock | `material.quantity_on_hand` |
| Table column: Low Stock (red Badge) | `<Badge variant="destructive">` wrapping quantity when `quantity_on_hand <= low_stock_threshold` |
| Table column: Unit Cost ($X.XX) | `formatCost(material.unit_cost)` |
| Table column: Actions (Edit link) | `<Link href="/materials/{id}/edit">Edit</Link>` |
| Pagination prev/next | Links rendered from `materials.links.prev` / `materials.links.next`; disabled spans when absent |
| Empty state: "No materials found." | `<TableCell colSpan={8}>No materials found.</TableCell>` when `data.length === 0` |
