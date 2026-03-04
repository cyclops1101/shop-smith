# Task 06 Plan: Materials Show / Detail Page

**Task ID:** TASK-06
**Domain:** frontend
**File:** `resources/js/Pages/Materials/Show.jsx`

---

## 1. Approach

Replace the 16-line stub in `resources/js/Pages/Materials/Show.jsx` with a full detail page, modelled closely on `resources/js/Pages/Projects/Show.jsx`. The page is structured into three Card sections: Overview, Stock Level (with inline adjustment form), and Project Usage (table with footer total). Sub-sections with a form use the same local-function pattern already established in Projects/Show.jsx (`PhotosSection`, `NotesSection`, `TimeLogSection`, `MaterialsSection`).

The implementation is a single-file full replacement. No new files or shared components need to be created. All UI primitives already exist under `resources/js/Components/ui/`.

---

## 2. Files to Modify

| Action | Path |
|--------|------|
| Full replacement | `resources/js/Pages/Materials/Show.jsx` |

No other files are touched by this task.

---

## 3. Component Structure

The exported default component `MaterialShow` receives `{ material }` and calls `usePage()` for flash. Three Card sections and the page header are rendered inline (not extracted as separate named functions) because none of them require independent `useForm` instances that would cause hook-rule violations. The stock adjustment form is the only form on the page and is defined directly in the component body.

```
MaterialShow({ material })
  usePage().props.flash
  useForm({ quantity: '', notes: '' })        ← adjust stock form

  <AppLayout>
    <Head title={material.name} />
    flash alerts (success + error)
    page header: h1, Edit Link, Delete Button
    <Card> Section 1: Overview
    <Card> Section 2: Stock Level + Adjust Form
    <Card> Section 3: Project Usage Table
```

---

## 4. Import List

```jsx
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
```

`Select`, `Textarea`, and `Modal` are not needed for this page.

---

## 5. Decisions and Rationale

### Decision 1: Single-file, no sub-components

The stock adjustment form is the only stateful element. Extracting it into a named sub-function would be valid but adds no benefit at this size. Keeping everything inline in `MaterialShow` is consistent with the simplest pages in the codebase and easier for reviewers to follow.

### Decision 2: `useForm` placement at top level of `MaterialShow`

`useForm` must be called unconditionally at the top level of the component (React hooks rule). There is exactly one form on this page, so one `useForm` call at the top is correct. The `handleAdjust` function references `adjustForm` and is defined directly below.

```jsx
const adjustForm = useForm({ quantity: '', notes: '' });

function handleAdjust(e) {
    e.preventDefault();
    adjustForm.post(route('materials.adjust-stock', material.id), {
        onSuccess: () => adjustForm.reset(),
    });
}
```

`onSuccess: () => adjustForm.reset()` clears the form after the server redirects back to this page via Inertia's visit cycle.

### Decision 3: Delete confirmation with `window.confirm`

Follows the exact pattern in `Projects/Show.jsx`:

```jsx
function handleDelete() {
    if (confirm('Delete this material? This cannot be undone.')) {
        router.delete(route('materials.destroy', material.id));
    }
}
```

The server-side controller performs a soft delete and redirects to `materials.index`. No client-side navigation code is needed.

### Decision 4: Route parameter is `material.id` (ULID), not a slug

Materials use ULID route model binding (`materials/{material}`), not slug-based binding. All `route()` calls in this page pass `material.id`:

- `route('materials.edit', material.id)`
- `route('materials.destroy', material.id)`
- `route('materials.adjust-stock', material.id)`

This is confirmed by the route listing: `GET|HEAD materials/{material}`, `PUT|PATCH materials/{material}`, `POST materials/{material}/adjust`.

### Decision 5: `unit` is the raw enum string from the backend

The `material.unit` prop is the raw string value from the `MaterialUnit` enum (e.g., `'board_foot'`, `'linear_foot'`). The backend eager-loads the relationship but does not transform the enum to a label string. The frontend displays `material.unit` as-is in the Overview card and Stock Level card. If a human-readable label is desired, that is a future enhancement; the task spec does not call for enum-to-label transformation on this page.

### Decision 6: Low stock badge condition

```jsx
{material.low_stock_threshold != null &&
 material.quantity_on_hand <= material.low_stock_threshold && (
    <Badge color="#dc2626">Low Stock</Badge>
)}
```

`color="#dc2626"` is Tailwind's `red-600` as a hex value — the same technique used in `Projects/Show.jsx` for status badges. This applies a red background with white text via the Badge component's inline style path.

### Decision 7: `formatCurrency` helper defined locally

The same `formatCurrency` function from `Projects/Show.jsx` is copied into this file:

```jsx
function formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
```

No shared utility module exists in the codebase yet, so local definition is the correct approach.

### Decision 8: Total Cost calculation in project usage table

For each project row: `total = pivot.quantity_used * pivot.cost_at_time`. If either is null, display `—`. The footer sums only rows where both values are non-null:

```jsx
const totalCost = (material.projects ?? []).reduce((sum, p) => {
    const qty = p.pivot?.quantity_used;
    const cost = p.pivot?.cost_at_time;
    return qty != null && cost != null ? sum + qty * cost : sum;
}, 0);
```

The footer row is only rendered when `material.projects.length > 0`.

### Decision 9: Project link uses slug, not id

Each project in the `projects` array includes a `slug` field. The link follows the same pattern as `Projects/Index.jsx` — use the slug in the URL path, not the ULID:

```jsx
<Link href={'/projects/' + project.slug} className="text-amber-600 hover:underline">
    {project.title}
</Link>
```

### Decision 10: Flash messages — only `success` and `error`

The task spec specifies `flash?.success` and `flash?.error`. The `warning` and `info` variants are shown in `Projects/Show.jsx` but the Materials Show spec does not call for them. Implementing all four is consistent and adds no risk — the plan includes all four variants for defensive completeness and consistency with the rest of the codebase.

### Decision 11: Overview card definition list layout

Uses the same `<dl>` + `<dt>` + `<dd>` pattern as `Projects/Show.jsx`, with a two-column grid. `description` and `notes` span full width via `sm:col-span-2`. Null values render as `—`.

Supplier sub-fields (`email`, `phone`, `website`) are not shown individually in the Overview card — only the supplier `name` is shown (as specified: "Supplier name or —"). The supplier detail page handles the full contact information.

---

## 6. Detailed UI Markup Plan

### Page wrapper

```jsx
<AppLayout>
    <Head title={material.name} />
    <div className="py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            {/* flash, header, sections */}
        </div>
    </div>
</AppLayout>
```

### Flash messages

```jsx
{flash?.success && <Alert variant="success">{flash.success}</Alert>}
{flash?.error && <Alert variant="error">{flash.error}</Alert>}
{flash?.warning && <Alert variant="warning">{flash.warning}</Alert>}
{flash?.info && <Alert variant="info">{flash.info}</Alert>}
```

### Page header

```jsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <h1 className="text-2xl font-bold text-gray-900">{material.name}</h1>
    <div className="flex shrink-0 items-center gap-2">
        <Link href={route('materials.edit', material.id)}>
            <Button variant="outline" size="sm">Edit</Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
        </Button>
    </div>
</div>
```

### Section 1: Overview Card

Definition list items (left column): Name, SKU, Category, Supplier, Unit, Location.
Full-width rows: Description, Notes.

```jsx
<Card>
    <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
    <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-800">{material.name}</dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</dt>
                <dd className="mt-1 text-sm text-gray-800">{material.sku || '—'}</dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-800">{material.category?.name || '—'}</dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</dt>
                <dd className="mt-1 text-sm text-gray-800">{material.supplier?.name || '—'}</dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</dt>
                <dd className="mt-1 text-sm text-gray-800">{material.unit || '—'}</dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-800">{material.location || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{material.description || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{material.notes || '—'}</dd>
            </div>
        </dl>
    </CardContent>
</Card>
```

### Section 2: Stock Level Card

Top block: large quantity display + low stock badge + unit cost line + threshold line.
Below: horizontal separator + stock adjustment form.

```jsx
<Card>
    <CardHeader><CardTitle>Stock Level</CardTitle></CardHeader>
    <CardContent>
        {/* Current stock display */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
            <div>
                <span className="text-4xl font-bold text-gray-900">
                    {material.quantity_on_hand}
                </span>
                <span className="ml-2 text-lg text-gray-500">{material.unit}</span>
            </div>
            {material.low_stock_threshold != null &&
             material.quantity_on_hand <= material.low_stock_threshold && (
                <Badge color="#dc2626">Low Stock</Badge>
            )}
        </div>

        <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unit Cost</dt>
                <dd className="mt-1 text-sm text-gray-800">
                    {material.unit_cost != null
                        ? `${formatCurrency(material.unit_cost)} per ${material.unit}`
                        : '—'}
                </dd>
            </div>
            <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Low Stock Threshold</dt>
                <dd className="mt-1 text-sm text-gray-800">
                    {material.low_stock_threshold != null
                        ? `${material.low_stock_threshold} ${material.unit}`
                        : 'No threshold set'}
                </dd>
            </div>
        </dl>

        {/* Stock adjustment form */}
        <div className="border-t border-gray-200 pt-6">
            <p className="mb-3 text-sm font-medium text-gray-700">Adjust Stock</p>
            <form onSubmit={handleAdjust} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="adjust-quantity">Quantity</Label>
                        <Input
                            id="adjust-quantity"
                            type="number"
                            step="0.01"
                            placeholder="+10 or -5"
                            value={adjustForm.data.quantity}
                            error={!!adjustForm.errors.quantity}
                            onChange={(e) => adjustForm.setData('quantity', e.target.value)}
                            className="mt-1"
                        />
                        {adjustForm.errors.quantity && (
                            <p className="mt-1 text-xs text-red-600">{adjustForm.errors.quantity}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="adjust-notes">Notes (optional)</Label>
                        <Input
                            id="adjust-notes"
                            type="text"
                            placeholder="Reason for adjustment"
                            value={adjustForm.data.notes}
                            error={!!adjustForm.errors.notes}
                            onChange={(e) => adjustForm.setData('notes', e.target.value)}
                            className="mt-1"
                        />
                        {adjustForm.errors.notes && (
                            <p className="mt-1 text-xs text-red-600">{adjustForm.errors.notes}</p>
                        )}
                    </div>
                </div>
                <Button type="submit" loading={adjustForm.processing} size="sm">
                    Adjust Stock
                </Button>
            </form>
        </div>
    </CardContent>
</Card>
```

### Section 3: Project Usage Card

```jsx
<Card>
    <CardHeader><CardTitle>Project Usage</CardTitle></CardHeader>
    <CardContent>
        {(material.projects ?? []).length > 0 ? (
            <div className="overflow-hidden rounded-md border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Qty Used</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Cost at Time</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {material.projects.map((project) => {
                            const qty  = project.pivot?.quantity_used;
                            const cost = project.pivot?.cost_at_time;
                            const total = qty != null && cost != null ? qty * cost : null;
                            return (
                                <TableRow key={project.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={'/projects/' + project.slug}
                                            className="text-amber-600 hover:underline"
                                        >
                                            {project.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{qty ?? '—'}</TableCell>
                                    <TableCell>{material.unit}</TableCell>
                                    <TableCell>{formatCurrency(cost)}</TableCell>
                                    <TableCell>{formatCurrency(total)}</TableCell>
                                    <TableCell>{project.pivot?.notes || '—'}</TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow className="bg-gray-50 font-medium">
                            <TableCell colSpan={4} className="text-right text-gray-700">
                                Total Material Cost
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">
                                {formatCurrency(totalCost)}
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        ) : (
            <p className="text-sm text-gray-500">
                This material has not been used in any projects yet.
            </p>
        )}
    </CardContent>
</Card>
```

---

## 7. Verified Dependencies

| Dependency | Where Defined | Status |
|------------|---------------|--------|
| `AppLayout` | `resources/js/Layouts/AppLayout.jsx` | Exists |
| `Head`, `Link`, `useForm`, `router`, `usePage` from `@inertiajs/react` | npm package | Available (used in Projects/Show.jsx) |
| `Alert` from `@/Components/ui/Alert` | `resources/js/Components/ui/Alert.jsx` | Exists; variants: `success`, `error`, `warning`, `info` |
| `Badge` from `@/Components/ui/Badge` | `resources/js/Components/ui/Badge.jsx` | Exists; accepts `color` hex prop |
| `Button` from `@/Components/ui/Button` | `resources/js/Components/ui/Button.jsx` | Exists; accepts `loading`, `size`, `variant`, `onClick` |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/Components/ui/Card` | `resources/js/Components/ui/Card.jsx` | Exists as named exports |
| `Input` from `@/Components/ui/Input` | `resources/js/Components/ui/Input.jsx` | Exists; accepts `error` boolean + all native input props |
| `Label` from `@/Components/ui/Label` | `resources/js/Components/ui/Label.jsx` | Exists |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/Components/ui/Table` | `resources/js/Components/ui/Table.jsx` | Exists as named exports |
| `route('materials.edit', id)` | Ziggy routes | Route `materials.edit` registered at `GET /materials/{material}/edit` |
| `route('materials.destroy', id)` | Ziggy routes | Route `materials.destroy` registered — destroy route must exist (TASK-01 removes `.except(['destroy'])`) |
| `route('materials.adjust-stock', id)` | Ziggy routes | Route `materials.adjust-stock` registered at `POST /materials/{material}/adjust` |
| `material.projects[n].pivot` | TASK-01 controller: `$material->load(['category', 'supplier', 'projects'])` | The `projects` BelongsToMany relationship has a pivot table with `quantity_used`, `cost_at_time`, `notes` |

---

## 8. Risks

### Risk 1: `materials.destroy` route may not exist until TASK-01 is merged

TASK-01 removes `.except(['destroy'])` from the materials resource route. If TASK-06 is delivered before TASK-01 is applied, the Delete button will reference a non-existent route name and Ziggy will throw `Error: route 'materials.destroy' is not found`. This is a dependency ordering issue, not a code defect. The frontend code is correct; it just requires TASK-01 to be applied first.

Mitigation: document the dependency clearly. The task manifest already marks TASK-06 as depending on TASK-01 and TASK-02.

### Risk 2: `material.projects` pivot data may not be accessible

The `projects` relationship is a `BelongsToMany`. The pivot columns (`quantity_used`, `cost_at_time`, `notes`) must be declared with `withPivot()` on the relationship definition in `Material.php`. If they are not, `project.pivot.quantity_used` will be `undefined` in JavaScript.

Mitigation: defensively use `project.pivot?.quantity_used ?? null` throughout, and display `—` for null. This is already the plan. If pivot data is missing, the page degrades gracefully (shows `—` in all quantity/cost cells) rather than throwing a JS error.

### Risk 3: `quantity_on_hand` is a decimal stored as a string

MySQL `decimal(10,2)` is returned by Eloquent as a string (e.g., `"42.50"`) when not explicitly cast. Comparing `material.quantity_on_hand <= material.low_stock_threshold` with string values can give incorrect results due to lexicographic comparison.

Mitigation: use `parseFloat()` for the comparison:

```jsx
{material.low_stock_threshold != null &&
 parseFloat(material.quantity_on_hand) <= parseFloat(material.low_stock_threshold) && (
    <Badge color="#dc2626">Low Stock</Badge>
)}
```

Apply the same `parseFloat` in the `totalCost` reduction if values come through as strings.

### Risk 4: `adjustForm.reset()` in `onSuccess` fires before Inertia page reload

Inertia's `onSuccess` callback fires after the server responds with a redirect and Inertia has updated the page. `adjustForm.reset()` is therefore called after the component re-renders with the new server data. This is the correct and safe approach — the same pattern used in `Projects/Show.jsx` for photo uploads and note submissions.

### Risk 5: `route()` global not available

Same risk as all other Inertia pages. Ziggy must be installed and the `@routes` Blade directive present in `resources/views/app.blade.php`. This is a pre-existing environment concern not specific to this task.

---

## 9. Acceptance Criteria Coverage

| Criterion (from Task Spec) | How Covered in This Plan |
|---------------------------|--------------------------|
| All material fields display correctly; nulls show `—` | Every `<dd>` uses `|| '—'` or optional chaining; null-safe `formatCurrency` returns `—` for null |
| Flash messages from session display via `usePage().props.flash` | All four Alert variants rendered from `flash?.success`, `flash?.error`, `flash?.warning`, `flash?.info` |
| Page header: material name as `h1`, Edit link, Delete button | Implemented in page header block; Edit uses `<Link>` + `<Button variant="outline">`, Delete uses `<Button variant="destructive">` with `confirm()` |
| Overview Card: two-column definition list with all specified fields | `<dl>` grid with six two-column items + two full-width items for description and notes |
| Stock Level Card: large quantity + unit, low stock badge, unit cost, threshold | All four display elements implemented; badge gated on threshold != null && qty <= threshold |
| Stock Adjustment form: `useForm({ quantity, notes })`, POST to `materials.adjust-stock`, reset on success | `adjustForm` at component top, `handleAdjust` posts to correct route, `onSuccess: () => adjustForm.reset()` |
| quantity input: number, step=0.01, placeholder "+10 or -5", no min | `<Input type="number" step="0.01" placeholder="+10 or -5">` — no `min` attribute so negative values are allowed |
| Project Usage Card: table with Project (link), Qty Used, Unit, Cost at Time, Total Cost, Notes | All 6 columns rendered; Project cell is amber `<Link>` using `project.slug` |
| Project Usage: footer row with sum of total costs | Footer `TableRow` computed from `totalCost` reduction, only rendered when projects.length > 0 |
| Project Usage: empty state message | `<p>` rendered when `(material.projects ?? []).length === 0` |
| Delete button: confirm then `router.delete` | `handleDelete` uses `confirm()` guard then `router.delete(route('materials.destroy', material.id))` |
| Wraps in `AppLayout` with appropriate `<Head>` | `<AppLayout>` + `<Head title={material.name} />` |
