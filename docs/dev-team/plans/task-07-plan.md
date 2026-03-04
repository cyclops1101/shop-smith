# Task 07 Plan: Supplier CRUD Pages

**Task ID:** 07
**Domain:** frontend
**Files:** Four new JSX page files under `resources/js/Pages/Suppliers/`

---

## 1. Approach

Create all four Supplier CRUD pages from scratch. No stubs exist. The pages follow the same
structural conventions established by the Projects CRUD pages: `AppLayout` wrapper, Inertia
`useForm`/`router`/`usePage`, shadcn-style UI primitives from `Components/ui/`, and flash
messages via `usePage().props.flash`.

Suppliers have no enum fields (no status, no priority), so the Index and form pages are
simpler than their Project equivalents. The seven form fields are all plain text types: one
required text field, four optional text fields, and two optional Textareas.

The Show page follows the Projects/Show pattern for page header (with Edit and Delete actions)
and flash display, but replaces the multi-section layout with a single detail card and a
materials count callout. Delete is a hard delete via `router.delete`.

Index uses the same debounced search + `router.get` with `preserveState: true` pattern from
Projects/Index, but without the status/priority filter selects (suppliers have no such fields).
Pagination uses the prev/next link pattern from Projects/Index (not numbered pages).

---

## 2. Files to Create

| Action | Path |
|--------|------|
| Create | `resources/js/Pages/Suppliers/Index.jsx` |
| Create | `resources/js/Pages/Suppliers/Show.jsx` |
| Create | `resources/js/Pages/Suppliers/Create.jsx` |
| Create | `resources/js/Pages/Suppliers/Edit.jsx` |

No existing files are modified. No backend files are in scope for this task. The task spec
explicitly states these are new frontend-only files and that no backend stubs exist for
suppliers yet — meaning the SupplierController and routes must be provided by a separate
backend task. The plan assumes those routes will be registered as a standard Laravel resource
at `Route::resource('suppliers', SupplierController::class)` inside the `auth`+`verified`
middleware group, matching the naming convention of `projects` and `materials`.

---

## 3. Named Routes Assumed

The following named routes are assumed to exist (registered by the backend task):

| Named Route | Method | URI |
|-------------|--------|-----|
| `suppliers.index` | GET | `/suppliers` |
| `suppliers.create` | GET | `/suppliers/create` |
| `suppliers.store` | POST | `/suppliers` |
| `suppliers.show` | GET | `/suppliers/{supplier}` |
| `suppliers.edit` | GET | `/suppliers/{supplier}/edit` |
| `suppliers.update` | PUT/PATCH | `/suppliers/{supplier}` |
| `suppliers.destroy` | DELETE | `/suppliers/{supplier}` |

Route model binding key for `{supplier}` is the ULID (primary key), consistent with the
convention used by `materials` and `tools`. The `route()` helper is used throughout for all
URL generation — no hardcoded strings.

---

## 4. Page Specifications

### 4.1 `Suppliers/Index.jsx`

**Props:** `{ suppliers, filters }`
- `suppliers` — Laravel paginator object with `data`, `links.prev`, `links.next`,
  `current_page`, `last_page`, `total`
- `filters` — `{ search: string|null }`

**Imports:**
```jsx
import { useState, useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
```

**Page header:**
- `<h1>` "Suppliers" with a sub-line showing `suppliers.total` count
- `<Link href={route('suppliers.create')}><Button variant="default" size="md">+ New Supplier</Button></Link>` aligned right

**Search bar:**
- Single `<Input type="search" placeholder="Search suppliers..." />` wired to a debounced
  handler (300 ms `setTimeout`, cleared on each keystroke via `useRef`)
- On settle: `router.get(route('suppliers.index'), { search: value || undefined }, { preserveState: true, replace: true })`
- `defaultValue={filters?.search ?? ''}` — uncontrolled input so the cursor position is not
  reset mid-typing (same pattern as Projects/Index)

**Table columns:** Name | Contact | Email | Phone | Actions
- Name column: `<Link href={route('suppliers.show', supplier.id)}>` wrapping the name text,
  styled `text-amber-700 hover:text-amber-900 hover:underline`
- Email: plain text (not a mailto link — this is the list view, not the detail view)
- Phone: plain text
- Actions: "Edit" link to `route('suppliers.edit', supplier.id)`

**Empty state:** When `suppliers.data.length === 0`, a single `<TableRow>` spanning all 5
columns displays "No suppliers found."

**Pagination:**
```jsx
const prevLink = suppliers.links?.prev;
const nextLink = suppliers.links?.next;
```
Render prev/next as active `<Link>` or disabled `<span>` using the same pattern as
Projects/Index. Show "Page X of Y (Z total)" label to the left.

**Component structure:** Single default export `SuppliersIndex`. No sub-components extracted
(simpler than Projects/Index which had FilterBar, ProjectsTable, BoardView, etc.).

---

### 4.2 `Suppliers/Create.jsx`

**Props:** none (empty object from controller)

**Imports:**
```jsx
import AppLayout from '@/Layouts/AppLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/Card';
```

**Form state:**
```jsx
const form = useForm({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    notes: '',
});
```

**Submit handler:**
```jsx
function handleSubmit(e) {
    e.preventDefault();
    form.post(route('suppliers.store'));
}
```

**Layout:** Single `<Card>` wrapping all 7 fields in a `<CardContent className="space-y-4">`.
CardFooter holds the Submit + Cancel buttons.

**Fields:**

| Field | Input type | UI primitive | Required | Notes |
|-------|-----------|-------------|----------|-------|
| `name` | text | `Input` | Yes — red asterisk in label | `autoFocus` |
| `contact_name` | text | `Input` | No | — |
| `email` | email | `Input` | No | — |
| `phone` | tel | `Input` | No | — |
| `website` | url | `Input` | No | `placeholder="https://..."` |
| `address` | — | `Textarea` | No | `rows={3}` |
| `notes` | — | `Textarea` | No | `rows={4}` |

Each field follows the Projects/Create field structure:
```jsx
<div>
    <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
    <div className="mt-1">
        <Input id="name" type="text" value={form.data.name}
            onChange={e => form.setData('name', e.target.value)}
            error={!!form.errors.name} autoFocus />
        {form.errors.name && (
            <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>
        )}
    </div>
</div>
```

**Page header:** `<h1>` "New Supplier" + sub-text "Fill in the details to add a new supplier."

**Cancel button:** `<Link href={route('suppliers.index')}>` styled with the same secondary
gray inline style used in Projects/Create (not a Button variant, a styled `<Link>` to avoid
double button-type nesting):
```jsx
className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition-colors duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
```

**Submit button:** `<Button type="submit" loading={form.processing} disabled={form.processing}>Save Supplier</Button>`

---

### 4.3 `Suppliers/Edit.jsx`

**Props:** `{ supplier }`

**Imports:** identical to Create.jsx

**Form state:** pre-populated with `?? ''` defaults:
```jsx
const form = useForm({
    name: supplier.name ?? '',
    contact_name: supplier.contact_name ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    website: supplier.website ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
});
```

**Submit handler:**
```jsx
function handleSubmit(e) {
    e.preventDefault();
    form.patch(route('suppliers.update', supplier.id));
}
```

**Layout:** Identical single-card layout to Create. All 7 fields with identical structure.
`autoFocus` on the name field.

**Page header:** `<h1>` "Edit Supplier" + sub-text "Update the details for {supplier.name}."
```jsx
<Head title={`Edit: ${supplier.name}`} />
```

**Cancel button:** `<Link href={route('suppliers.show', supplier.id)}>` (goes to Show, not
Index — per spec).

---

### 4.4 `Suppliers/Show.jsx`

**Props:** `{ supplier }` where `supplier` includes `materials_count` from `withCount('materials')`
on the controller.

**Imports:**
```jsx
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Alert from '@/Components/ui/Alert';
```

**Flash messages:** read from `usePage().props.flash`, rendered before the page header:
```jsx
const { flash } = usePage().props;
// ...
{flash?.success && <Alert variant="success">{flash.success}</Alert>}
{flash?.error   && <Alert variant="error">{flash.error}</Alert>}
{flash?.warning && <Alert variant="warning">{flash.warning}</Alert>}
{flash?.info    && <Alert variant="info">{flash.info}</Alert>}
```

**Page header:**
- Left: `<h1>` with `supplier.name`
- Right: Edit button + Delete button
```jsx
<Link href={route('suppliers.edit', supplier.id)}>
    <Button variant="outline" size="sm">Edit</Button>
</Link>
<Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
```

**Delete handler:**
```jsx
function handleDelete() {
    if (!confirm('Delete this supplier? This cannot be undone.')) return;
    router.delete(route('suppliers.destroy', supplier.id));
}
```
Redirects to `suppliers.index` (handled by the controller with flash success message).
This is a hard delete — no soft-delete is applied to suppliers per the project spec
("Soft deletes on: projects, materials, tools. Hard delete everything else.").

**Detail card:** A single `<Card>` with a two-column definition grid (same `<dl>` pattern
used in Projects/Show overview section):

```jsx
<div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</dt>
    <dd className="mt-1 text-sm text-gray-800">{supplier.name}</dd>
    ...
</div>
```

Field layout within the card:

| Field | Display | Column span | Special |
|-------|---------|-------------|---------|
| Name | plain text | 1 col | — |
| Contact Name | plain text or `—` | 1 col | — |
| Email | `<a href="mailto:...">` or `—` | 1 col | amber link style |
| Phone | plain text or `—` | 1 col | — |
| Website | `<a href="..." target="_blank" rel="noopener noreferrer">` or `—` | 1 col | truncated display |
| Address | `whitespace-pre-wrap` or `—` | 2 cols (full width) | — |
| Notes | `whitespace-pre-wrap` or `—` | 2 cols (full width) | — |

Email link styling: `className="text-amber-700 hover:text-amber-900 hover:underline"`
Website link display: show the URL text, or a cleaned version (no need to strip protocol —
keep it simple).

For optional fields that may be null or empty string, display `—` (em-dash) as the fallback:
```jsx
{supplier.email ? <a href={`mailto:${supplier.email}`} ...>{supplier.email}</a> : '—'}
```

**Materials count callout:** Rendered below the detail card as a small info card or styled
`<p>`:
```jsx
<div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4">
    <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{supplier.materials_count}</span>{' '}
        {supplier.materials_count === 1 ? 'material' : 'materials'} sourced from this supplier.
    </p>
</div>
```

---

## 5. Decisions and Rationale

### Decision 1: Use `supplier.id` (ULID) as route parameter, not a slug

Suppliers have no `slug` field. The `Supplier` model uses `HasUlids` which sets `id` as the
primary key ULID. The convention in this project for non-project models is to use the ULID
for route binding (see `materials/{material}`, `tools/{tool}`). Therefore all `route()` calls
use `supplier.id`.

### Decision 2: Single card for the form, not multi-card sections

Projects/Create uses multiple cards (Basic Info, Pricing & Time, Commission, Notes) because
it has 13 fields across 4 logical groups. Suppliers have 7 fields with no natural groupings
beyond "supplier details." A single card avoids unnecessary visual fragmentation.

### Decision 3: No controlled input for the search field (use `defaultValue`)

Using `defaultValue` (uncontrolled) instead of `value` (controlled) on the search input
prevents React from resetting the cursor to the end of the input on every keystroke during
the debounce interval. This matches the Projects/Index pattern. The `filters.search` value
from props is used only to set the initial value; thereafter the DOM owns the field state.

### Decision 4: Delete uses `window.confirm`, not a modal

The task spec says "confirm + router.delete". Using `window.confirm` is consistent with
Projects/Show and avoids importing `Modal`. The Supplier entity is simpler than a Project
and the one-liner confirm dialog is sufficient UX for a solo-user tool.

### Decision 5: Email and Website as styled anchor elements, not plain text

The Show page spec explicitly calls for `mailto:` and `href` links on the email and website
fields. In the Index table, email is shown as plain text (sorting/scanning priority). On
Show, the user is likely to want to click through, so anchor elements are appropriate there.

### Decision 6: `materials_count` loaded via `withCount` on the controller

The Show props contract specifies `supplier` with `materials_count` from `loadCount`. In
Laravel, this means the controller calls:
```php
$supplier->loadCount('materials');
```
This appends `materials_count` as an attribute on the model before it is serialised by
Inertia. The frontend simply reads `supplier.materials_count`. The plan does not implement
the controller (backend task), but the frontend page depends on this attribute being present.

### Decision 7: `address` and `notes` are full-width in the Show detail grid

Address is a multiline text field (up to a full mailing address). Notes are freeform. Both
use `sm:col-span-2` to span the full two-column grid width and `whitespace-pre-wrap` to
preserve newlines. This matches the Projects/Show pattern for `description` and `notes`.

---

## 6. Verified Dependencies

| Dependency | Location | Status |
|------------|----------|--------|
| `AppLayout` | `resources/js/Layouts/AppLayout.jsx` | Exists |
| `Button` (variants: `default`, `outline`, `destructive`) | `resources/js/Components/ui/Button.jsx` | Exists |
| `Input` (props: `id`, `type`, `value`, `onChange`, `error`, `placeholder`, `autoFocus`) | `resources/js/Components/ui/Input.jsx` | Exists |
| `Label` | `resources/js/Components/ui/Label.jsx` | Exists |
| `Textarea` (props: `id`, `value`, `onChange`, `error`, `rows`) | `resources/js/Components/ui/Textarea.jsx` | Exists |
| `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` | `resources/js/Components/ui/Card.jsx` | Exists |
| `Alert` (variants: `success`, `error`, `warning`, `info`) | `resources/js/Components/ui/Alert.jsx` | Exists |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `resources/js/Components/ui/Table.jsx` | Exists |
| `useForm`, `router`, `usePage`, `Head`, `Link` | `@inertiajs/react` | Exists (used in Projects pages) |
| `Supplier` model with `materials_count` capability | `app/Models/Supplier.php` — `materials()` HasMany exists | Exists |
| Supplier resource routes (`suppliers.*`) | `routes/web.php` | **NOT YET REGISTERED** — required from backend task |
| `SupplierController` | `app/Http/Controllers/` | **NOT YET CREATED** — required from backend task |
| `StoreSupplierRequest` / `UpdateSupplierRequest` | `app/Http/Requests/` | **NOT YET CREATED** — required from backend task |
| `flash` prop in Inertia shared props | Set by `HandleInertiaRequests` middleware | Assumed present (used in Projects/Show) |

---

## 7. Risks

### Risk 1: Supplier routes not yet registered

The `routes/web.php` file does not currently contain any supplier routes. The frontend pages
use `route('suppliers.index')`, `route('suppliers.store')`, etc. via Ziggy. If the backend
task has not run before the frontend is tested in the browser, all `route()` calls will throw
a Ziggy error: "Route [suppliers.index] not found."

**Mitigation:** The four JSX files can be created and reviewed independently. The implementer
must ensure the backend task (SupplierController + routes) is completed and `php artisan
route:cache` (or just a dev server restart) has run before end-to-end browser testing.

### Risk 2: `supplier.materials_count` attribute missing if controller omits `withCount`/`loadCount`

If the controller does not call `$supplier->loadCount('materials')` before passing the model
to Inertia, `supplier.materials_count` will be `undefined` on the frontend. The callout will
then display "undefined materials sourced from this supplier."

**Mitigation:** Guard with nullish coalescing: `{supplier.materials_count ?? 0}`. This keeps
the UI functional even if the backend omits the count.

### Risk 3: ULID in URL may conflict with slug-based route binding

If the backend task registers the route with a slug key (unlikely given no `slug` field on
Supplier) rather than the default ULID primary key, the `route('suppliers.show', supplier.id)`
calls would produce broken URLs. The `Supplier` model uses `HasUlids` with no `getRouteKeyName`
override, so the default binding resolves by `id` (the ULID). No action needed, but the
backend task must not add a custom `getRouteKeyName`.

### Risk 4: `Textarea` component `error` prop styling

The `Textarea` component is used in forms with `error={!!form.errors.field}`. This assumes
`Textarea.jsx` accepts an `error` boolean prop and applies a red border class. If the
component does not support this prop, validation error styling will silently fail (no red
border, but the error text paragraph will still render). Verify `Textarea.jsx` supports the
`error` prop before implementation.

---

## 8. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| `Index.jsx` exists with header "Suppliers" + count + "+ New Supplier" button | Section 4.1 page header |
| Search input debounced 300ms | Section 4.1 search bar, `useRef`-based debounce |
| `router.get('/suppliers', params, { preserveState, replace })` | Section 4.1 search navigate call |
| Table with Name, Contact, Email, Phone, Actions columns | Section 4.1 table columns |
| Pagination prev/next | Section 4.1 pagination |
| Empty state | Section 4.1 empty state row |
| `Create.jsx` and `Edit.jsx` single-card form with 7 fields | Section 4.2 / 4.3 field table |
| `name` field required (red asterisk) | Section 4.2 field table |
| `website` placeholder "https://..." | Section 4.2 field table |
| `address` Textarea rows=3, `notes` Textarea rows=4 | Section 4.2 field table |
| Create submits `form.post(route('suppliers.store'))` | Section 4.2 submit handler |
| Create Cancel goes to `suppliers.index` | Section 4.2 cancel button |
| Edit submits `form.patch(route('suppliers.update', supplier.id))` | Section 4.3 submit handler |
| Edit Cancel goes to `suppliers.show` | Section 4.3 cancel button |
| Edit pre-populates all fields with `?? ''` | Section 4.3 form state |
| `Show.jsx` header with name, Edit + Delete buttons | Section 4.4 page header |
| Delete uses `confirm` + `router.delete` (hard delete) | Section 4.4 delete handler + Decision 4 |
| Flash messages via `usePage().props.flash` with all 4 variants | Section 4.4 flash messages |
| Detail card two-column layout | Section 4.4 detail card |
| Email renders as `mailto:` link | Section 4.4 field layout table |
| Website renders as `href` link with `target="_blank"` | Section 4.4 field layout table |
| Address and Notes are full-width with `whitespace-pre-wrap` | Section 4.4 field layout table + Decision 7 |
| `materials_count` callout | Section 4.4 materials count callout |
| JSX file extensions (not TSX) | All four files are `.jsx` |
| `AppLayout` wrapper on every page | All four page components wrap in `<AppLayout>` |
| No hardcoded URLs — all use `route()` helper | Decision 1, all sections |
