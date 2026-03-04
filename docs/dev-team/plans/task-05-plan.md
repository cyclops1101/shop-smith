# Task 05 Implementation Plan — Materials Create and Edit Forms

**Task ID:** 05
**Domain:** frontend
**Files to modify:**
- `resources/js/Pages/Materials/Create.jsx`
- `resources/js/Pages/Materials/Edit.jsx`

**Depends on:** UI primitives in `Components/ui/`, AppLayout, Inertia.js, named routes `materials.store`, `materials.update`, `materials.index`, `materials.show`

---

## 1. Approach

Replace the two stub pages with fully-functional Inertia forms, following the exact same structural and stylistic pattern established in `Projects/Create.jsx` and `Projects/Edit.jsx`. The pattern is:

1. Import all UI primitives (`Button`, `Input`, `Label`, `Select`, `Textarea`, `Card/*`) and `useForm`, `Head`, `Link` from `@inertiajs/react`.
2. Initialize `useForm` with every form field; nullable fields default to `''`.
3. A single `handleSubmit` function calls `form.post()` (Create) or `form.patch()` (Edit) with the correct route.
4. The JSX is wrapped in `AppLayout`, then a page-width container, a heading block, and a `<form>` with `noValidate`.
5. Inside the form, logical groups of fields are each placed in a `Card` with a `CardHeader`/`CardTitle`, `CardContent`, and the final card gets a `CardFooter` with Submit and Cancel.
6. Every field follows the pattern: `Label` → `div.mt-1` → control → conditional error `<p>`.
7. Submit button uses `loading={form.processing}` and `disabled={form.processing}`. Cancel uses a plain `<Link>` styled as a secondary button.

The Materials forms have four sections instead of the Projects form's four. The section breakdown maps directly to the task spec.

---

## 2. Files to Modify

| File | Action |
|------|--------|
| `resources/js/Pages/Materials/Create.jsx` | Full replacement of stub |
| `resources/js/Pages/Materials/Edit.jsx` | Full replacement of stub |

No other files are created or modified. All UI components and routes already exist.

---

## 3. Data Contract

### Create (`MaterialController@create` props)

```js
{
  units:      [ { value: 'piece', label: 'Piece' }, ... ],   // from MaterialUnit enum
  categories: [ { value: '<ulid>', label: 'Hardwoods' }, ... ],
  suppliers:  [ { value: '<ulid>', label: 'Acme Lumber' }, ... ],
}
```

### Edit (`MaterialController@edit` props)

```js
{
  material: {
    id:                  '<ulid>',
    name:                'White Oak Board',
    sku:                 'WO-4x4',            // nullable
    description:         '...',               // nullable
    category_id:         '<ulid>',            // nullable
    unit:                'board_foot',
    quantity_on_hand:    24,
    low_stock_threshold: 10,                  // nullable
    unit_cost:           '3.50',              // nullable, decimal(10,2) as string
    supplier_id:         '<ulid>',            // nullable
    location:            'Rack A-3',          // nullable
    notes:               '...',               // nullable
  },
  units:      [...],
  categories: [...],
  suppliers:  [...],
}
```

Note: `unit` comes from the backend as the enum string value (e.g. `'board_foot'`) because Laravel serializes backed enums to their raw value in JSON. `unit_cost` arrives as a decimal string from MySQL.

---

## 4. Form Field Definitions

### Section 1 — Basic Info

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `name` | `Input[text]` | Yes | `autoFocus`, required asterisk |
| `sku` | `Input[text]` | No | placeholder "e.g. WO-4x4" |
| `description` | `Textarea` | No | `rows={3}` |
| `category_id` | `Select` | No | `placeholder="Select category"`, options from `categories` prop |
| `unit` | `Select` | Yes | required asterisk, options from `units` prop, no placeholder (always has a value) |

For `unit`, since it is required and has a sensible first-enum default (`piece`), the Create form initializes it to `'piece'` rather than `''`. No blank placeholder option is rendered for this field.

For `category_id` and `supplier_id`, a blank placeholder option ("Select category", "Select supplier") is rendered so the user can clear the selection. The `Select` component's `placeholder` prop handles this automatically.

### Section 2 — Stock

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `quantity_on_hand` | `Input[number]` | Yes | `min="0"`, `step="1"`, `placeholder="0"` |
| `low_stock_threshold` | `Input[number]` | No | `min="0"`, `step="1"`, helper text below input |
| `unit_cost` | `Input[number]` | No | `min="0"`, `step="0.01"`, label "Unit Cost ($)", `placeholder="0.00"` |

Helper text for `low_stock_threshold`: `<p className="mt-1 text-xs text-gray-500">Alert when stock falls below this level.</p>`. This is rendered beneath the input and above any error message.

### Section 3 — Supplier and Location

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `supplier_id` | `Select` | No | `placeholder="Select supplier"`, options from `suppliers` prop |
| `location` | `Input[text]` | No | `placeholder="e.g. Rack A-3"` |

These two fields are placed in a two-column grid (`grid grid-cols-1 gap-4 sm:grid-cols-2`) matching the Projects pattern.

### Section 4 — Notes

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `notes` | `Textarea` | No | `rows={4}`, placeholder text |

This is the final section and its `Card` carries the `CardFooter` with Submit and Cancel.

---

## 5. useForm Initialization

### Create.jsx

```js
const form = useForm({
    name:                '',
    sku:                 '',
    description:         '',
    category_id:         '',
    unit:                'piece',
    quantity_on_hand:    '',
    low_stock_threshold: '',
    unit_cost:           '',
    supplier_id:         '',
    location:            '',
    notes:               '',
});
```

`unit` defaults to `'piece'` (first enum case) because the field is required and cannot be blank.

### Edit.jsx

```js
const form = useForm({
    name:                material.name ?? '',
    sku:                 material.sku ?? '',
    description:         material.description ?? '',
    category_id:         material.category_id ?? '',
    unit:                material.unit ?? 'piece',
    quantity_on_hand:    material.quantity_on_hand ?? '',
    low_stock_threshold: material.low_stock_threshold ?? '',
    unit_cost:           material.unit_cost ?? '',
    supplier_id:         material.supplier_id ?? '',
    location:            material.location ?? '',
    notes:               material.notes ?? '',
});
```

The `??` fallback to `''` for all nullable fields follows the Projects/Edit.jsx convention exactly. `material.unit` will always be present (required field), but the `?? 'piece'` guard is a safe fallback.

---

## 6. Route Calls

### Create.jsx

```js
function handleSubmit(e) {
    e.preventDefault();
    form.post(route('materials.store'));
}
```

Cancel link: `route('materials.index')`

### Edit.jsx

```js
function handleSubmit(e) {
    e.preventDefault();
    form.patch(route('materials.update', material.id));
}
```

Cancel link: `route('materials.show', material.id)`

**Decision — `material.id` vs `material.slug`:** The `materials` resource uses ULID binding (not slug), as defined in the routes list: `GET /materials/{material}` — there is no slug column on the `materials` table. The route model binding is by ULID. The spec confirms: "Route model binding with slug for projects, ULID for other models." Therefore, both `materials.update` and `materials.show` receive `material.id`.

---

## 7. Import List (identical for both files)

```js
import AppLayout from '@/Layouts/AppLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/Card';
```

---

## 8. Page Layout and Heading

### Create.jsx heading block

```jsx
<h1 className="text-2xl font-semibold text-gray-900">New Material</h1>
<p className="mt-1 text-sm text-gray-600">
    Fill in the details below to add a new material to inventory.
</p>
```

### Edit.jsx heading block

```jsx
<h1 className="text-2xl font-semibold text-gray-900">Edit Material</h1>
<p className="mt-1 text-sm text-gray-600">
    Update the details for <span className="font-medium">{material.name}</span>.
</p>
```

Container width: `max-w-3xl` (matching Projects forms).

---

## 9. Cancel Button Style

The Cancel `<Link>` uses the same inline Tailwind class string from Projects forms:

```
className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition-colors duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
```

This avoids adding a new `variant` to Button and keeps Cancel visually distinct from the primary submit action.

---

## 10. Select Component Behavior Notes

The `Select` component accepts:
- `options`: array of `{ value, label }` objects
- `placeholder`: optional string; if provided, renders `<option value="">...</option>` as the first option
- `error`: boolean for red border state
- Standard `value` and `onChange` props

For `category_id` and `supplier_id` (nullable), include `placeholder` to allow deselection. For `unit` (required), do not pass `placeholder` — the field always has a valid enum value selected.

---

## 11. Verified Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `AppLayout` | Exists | `resources/js/Layouts/AppLayout.jsx` (referenced by Projects forms) |
| `Button` | Exists | `Components/ui/Button.jsx` — supports `loading`, `disabled` |
| `Input` | Exists | `Components/ui/Input.jsx` — supports `error` boolean |
| `Label` | Exists | `Components/ui/Label.jsx` |
| `Select` | Exists | `Components/ui/Select.jsx` — supports `options`, `placeholder`, `error` |
| `Textarea` | Exists | `Components/ui/Textarea.jsx` — supports `error` boolean |
| `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` | Exists | `Components/ui/Card.jsx` |
| `materials.store` route | Exists | `POST /materials` |
| `materials.update` route | Exists | `PUT|PATCH /materials/{material}` |
| `materials.index` route | Exists | `GET /materials` |
| `materials.show` route | Exists | `GET /materials/{material}` |
| `useForm`, `Head`, `Link` | Exists | `@inertiajs/react` package |

The `MaterialController@create` and `MaterialController@edit` actions currently do not pass `units`, `categories`, or `suppliers` props to the frontend — they call `Inertia::render('Materials/Create')` and `Inertia::render('Materials/Edit')` with no second argument. The form pages cannot function without these props. This is a known dependency gap that the implementing agent must address by updating the controller, or that a separate backend task (TASK-05 backend counterpart) handles. The frontend implementation plan is written assuming these props will be present at runtime. If the controller update is not in scope, the plan should note it as a blocking dependency.

---

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `MaterialController` does not pass `units`/`categories`/`suppliers` to the view | High (confirmed by reading controller code) | High — forms cannot render options | The implementing agent must also update the controller's `create()` and `edit()` methods to pass these collections, or coordinate with the backend task that does so |
| `unit` sent as enum object vs. raw string | Low | Medium — Select value won't match | Laravel serializes backed enums to their `value` string in JSON by default; `unit: 'board_foot'` will arrive as a plain string, so the Select `value={form.data.unit}` comparison will work correctly |
| `unit_cost` numeric precision display | Low | Low | Initializing from `material.unit_cost ?? ''` preserves the backend decimal string; HTML number inputs handle this fine |
| Missing `materials.show` route for Cancel | None | N/A | Route exists: `GET /materials/{material}` named `materials.show` |

---

## 13. Acceptance Criteria Coverage

| Criterion | Covered by |
|-----------|-----------|
| Create form uses `form.post(route('materials.store'))` | Section 6 |
| Edit form uses `form.patch(route('materials.update', material.id))` | Section 6 |
| Create Cancel navigates to `materials.index` | Section 6 |
| Edit Cancel navigates to `materials.show` with `material.id` | Section 6 |
| All 4 sections present (Basic Info, Stock, Supplier & Location, Notes) | Section 4 |
| `name` and `unit` are marked required with asterisk | Section 4 |
| `sku`, `description`, `category_id`, `low_stock_threshold`, `unit_cost`, `supplier_id`, `location`, `notes` are optional | Section 4 |
| `low_stock_threshold` has helper text | Section 4 |
| `unit_cost` label is "Unit Cost ($)" | Section 4 |
| Inline validation errors shown beneath each field | Pattern: `{form.errors.X && <p className="mt-1 text-sm text-red-600">...</p>}` |
| Submit button shows loading state | `loading={form.processing}` and `disabled={form.processing}` on Button |
| Edit form pre-populates all fields with `?? ''` for nullables | Section 5 |
| JSX file extension (not TSX) | Both files end in `.jsx` |
| Inertia `useForm` for all data flow | Section 5/6 |
| Shared layout via `AppLayout.jsx` | Wraps all JSX |
| shadcn-style UI primitives from `Components/ui/` | Section 7 |

---

## 14. Implementation Notes for the Executing Agent

1. Write `Create.jsx` first; `Edit.jsx` is a near-copy with three differences: (a) function name `MaterialEdit`, (b) `useForm` initialized from `material.*`, (c) `form.patch` and different Cancel target.
2. Do not add a `<Head>` title that mentions the stub — set it to `"New Material"` (Create) and `` `Edit: ${material.name}` `` (Edit).
3. The `quantity_on_hand` `Input` should use `type="number"`, `min="0"`, `step="1"` — materials inventory is whole units for most types (board feet can be fractional, but using `step="1"` with `step` could be loosened to `"0.5"` per discretion; default to `"1"` to keep it simple, as the backend validation rules will govern actual acceptance).
4. Place `quantity_on_hand` and `low_stock_threshold` in the same two-column grid row, and `unit_cost` in a half-width column below them (or stand-alone, as it is a single field in the stock section). A clean layout: `quantity_on_hand` + `low_stock_threshold` in a `grid grid-cols-1 gap-4 sm:grid-cols-2`, then `unit_cost` as a standalone half-width field.
5. Do not import `router` or `usePage` — `useForm` alone handles all interaction for these pages.
6. If the `MaterialController` does not yet pass the required props, update `create()` and `edit()` methods before or alongside the JSX changes so the page can actually render.
