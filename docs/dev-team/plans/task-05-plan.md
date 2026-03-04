# Task 05 Implementation Plan — Tools Create and Edit Forms

**Task ID:** 05
**Domain:** frontend + controller stub fix
**Files to modify:**
- `resources/js/Pages/Tools/Create.jsx` — full replacement of stub
- `resources/js/Pages/Tools/Edit.jsx` — full replacement of stub
- `app/Http/Controllers/ToolController.php` — update `create()` and `edit()` to pass required props

**Depends on:** UI primitives in `Components/ui/`, `AppLayout`, Inertia.js, named routes `tools.store`, `tools.update`, `tools.index`, `tools.show`, `ToolCategory` model, `MaintenanceType` enum

---

## 1. Approach

Replace both stub pages with fully-functional Inertia forms, following the exact structural and stylistic pattern established in `Materials/Create.jsx` and `Materials/Edit.jsx`. Those files are the canonical pattern reference for this task.

The pattern is:

1. Import all UI primitives (`Button`, `Input`, `Label`, `Select`, `Textarea`, `Card/*`) plus `useForm`, `Head`, `Link` from `@inertiajs/react`.
2. Map the `categories` prop array from `[{id, name}]` to `[{value, label}]` at the top of the component function.
3. Initialize `useForm` with every form field; nullable fields default to `''`.
4. A single `handleSubmit` function calls `form.post()` (Create) or `form.patch()` (Edit) with the correct named route.
5. Wrap JSX in `AppLayout`, then a `max-w-3xl` centered container, a heading block, and a `<form noValidate>`.
6. Inside the form, logical groups of fields are placed in separate `Card` components with `CardHeader`/`CardTitle`, `CardContent`. The final card also gets a `CardFooter` with Submit and Cancel.
7. Every field follows the pattern: `Label` → `div.mt-1` → control component → conditional error `<p className="mt-1 text-sm text-red-600">`.
8. Submit button uses `loading={form.processing}` and `disabled={form.processing}`. Cancel uses a plain `<Link>` styled as a secondary button using inline Tailwind classes (no new Button variant needed).

The controller's `create()` and `edit()` methods currently pass no props. They must be updated to pass `categories` (and `maintenanceTypes` for Create) before the JSX changes can function.

---

## 2. Files to Modify

| File | Action |
|------|--------|
| `resources/js/Pages/Tools/Create.jsx` | Full replacement of stub |
| `resources/js/Pages/Tools/Edit.jsx` | Full replacement of stub |
| `app/Http/Controllers/ToolController.php` | Update `create()` and `edit()` to pass required props |

No new files are created. All UI components and routes already exist.

---

## 3. Data Contract

### Create (`ToolController@create` props)

The task spec defines Create props as `{ categories, maintenanceTypes }`. However, the Tools Create form spec lists only 3 sections (Basic Info, Purchase & Warranty, Location & Notes) — none of which include a maintenance type field. The `maintenanceTypes` prop is passed for potential future use (e.g., a maintenance schedule section) but is not rendered as a form field in this task. Pass it anyway so the controller contract is established.

```js
{
  categories:       [{ id: '<ulid>', name: 'Power Tools' }, ...],
  maintenanceTypes: [{ value: 'blade_change', label: 'Blade Change' }, ...],
}
```

### Edit (`ToolController@edit` props)

The task spec defines Edit props as `{ tool, categories }`. No `maintenanceTypes` needed for Edit.

```js
{
  tool: {
    id:               '<ulid>',
    name:             'DeWalt DW735 Planer',
    brand:            'DeWalt',           // nullable
    model_number:     'DW735',            // nullable
    serial_number:    'SN-12345',         // nullable
    category_id:      '<ulid>',           // nullable
    purchase_date:    '2023-05-15',       // nullable, date cast → ISO string via Inertia
    purchase_price:   '649.00',           // nullable, decimal(10,2) as string
    warranty_expires: '2026-05-15',       // nullable, date cast → ISO string via Inertia
    location:         'Main Bay, Left',   // nullable
    manual_url:       'https://...',      // nullable
    notes:            '...',              // nullable
  },
  categories: [{ id: '<ulid>', name: 'Power Tools' }, ...],
}
```

**Note on date serialization:** The `Tool` model casts `purchase_date` and `warranty_expires` as `'date'`. Laravel serializes Carbon date instances to ISO 8601 strings in JSON (e.g. `"2023-05-15T00:00:00.000000Z"`). HTML `<input type="date">` requires the format `YYYY-MM-DD`. The `useForm` initial value should use `.split('T')[0]` (or `?? ''`) to strip the time component, or the controller can serialize the date fields explicitly. The plan calls for the controller to serialize dates to `Y-m-d` strings so the frontend requires no transformation.

---

## 4. Controller Updates Required

### `ToolController@create`

```php
use App\Enums\MaintenanceType;
use App\Models\ToolCategory;

public function create(): Response
{
    return Inertia::render('Tools/Create', [
        'categories'       => ToolCategory::orderBy('name')->get(['id', 'name']),
        'maintenanceTypes' => collect(MaintenanceType::cases())->map(fn($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ]),
    ]);
}
```

### `ToolController@edit`

```php
public function edit(Tool $tool): Response
{
    return Inertia::render('Tools/Edit', [
        'tool'       => array_merge($tool->toArray(), [
            'purchase_date'    => $tool->purchase_date?->format('Y-m-d'),
            'warranty_expires' => $tool->warranty_expires?->format('Y-m-d'),
        ]),
        'categories' => ToolCategory::orderBy('name')->get(['id', 'name']),
    ]);
}
```

The explicit date formatting avoids any timezone/time-component issue with the HTML date input. Merging into `toArray()` keeps all other fields (including `id`, `name`, etc.) intact while overriding only the two date fields with the `Y-m-d` string format.

---

## 5. Form Field Definitions

### Section 1 — Basic Info

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `name` | `Input[text]` | Yes | `autoFocus`, required asterisk, placeholder "e.g. DeWalt DW735 Planer" |
| `brand` | `Input[text]` | No | placeholder "e.g. DeWalt" |
| `model_number` | `Input[text]` | No | placeholder "e.g. DW735" |
| `serial_number` | `Input[text]` | No | placeholder "e.g. SN-123456" |
| `category_id` | `Select` | No | `placeholder="No category"`, options from `categoryOptions` |

`brand`, `model_number`, and `serial_number` are placed in a two-column grid (`grid grid-cols-1 gap-4 sm:grid-cols-2`): `brand` spans full width, then `model_number` + `serial_number` share the two columns. Alternatively, `name` and `brand` in a two-column grid, then `model_number` and `serial_number` in a two-column grid. Clean layout: `name` full width, `brand` + `model_number` in a row, `serial_number` + `category_id` in a row.

**Recommended field grouping within Section 1:**
- Row 1 (full width): `name`
- Row 2 (two columns): `brand`, `model_number`
- Row 3 (two columns): `serial_number`, `category_id`

### Section 2 — Purchase & Warranty

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `purchase_date` | `Input[date]` | No | HTML date input |
| `purchase_price` | `Input[number]` | No | `step="0.01"`, `min="0"`, label "Purchase Price ($)", placeholder "0.00" |
| `warranty_expires` | `Input[date]` | No | HTML date input |

Layout: `purchase_date` + `purchase_price` in a two-column grid; `warranty_expires` as a standalone half-width field (or full width, single column).

**Recommended layout for Section 2:**
- Row 1 (two columns): `purchase_date`, `purchase_price`
- Row 2 (half width / one column): `warranty_expires`

### Section 3 — Location & Notes

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `location` | `Input[text]` | No | placeholder "e.g. Main Bay, Left Wall" |
| `manual_url` | `Input[url]` | No | `type="url"`, placeholder "https://..." |
| `notes` | `Textarea` | No | `rows={4}` |

`location` and `manual_url` placed in a two-column grid. `notes` spans full width below them.

This is the final section and its `Card` carries the `CardFooter` with Submit and Cancel buttons.

---

## 6. useForm Initialization

### Create.jsx

```js
const form = useForm({
    name:             '',
    brand:            '',
    model_number:     '',
    serial_number:    '',
    category_id:      '',
    purchase_date:    '',
    purchase_price:   '',
    warranty_expires: '',
    location:         '',
    manual_url:       '',
    notes:            '',
});
```

### Edit.jsx

```js
const form = useForm({
    name:             tool.name,
    brand:            tool.brand ?? '',
    model_number:     tool.model_number ?? '',
    serial_number:    tool.serial_number ?? '',
    category_id:      tool.category_id ?? '',
    purchase_date:    tool.purchase_date ?? '',
    purchase_price:   tool.purchase_price ?? '',
    warranty_expires: tool.warranty_expires ?? '',
    location:         tool.location ?? '',
    manual_url:       tool.manual_url ?? '',
    notes:            tool.notes ?? '',
});
```

All nullable fields use `?? ''` to ensure controlled inputs never receive `null`. `tool.name` has no `??` because it is a required DB column that is always present.

---

## 7. Route Calls and Navigation

### Create.jsx

```js
function handleSubmit(e) {
    e.preventDefault();
    form.post(route('tools.store'));
}
```

Cancel link target: `route('tools.index')`

### Edit.jsx

```js
function handleSubmit(e) {
    e.preventDefault();
    form.patch(route('tools.update', tool.id));
}
```

Cancel link target: `route('tools.show', tool.id)`

**Route binding note:** Per CLAUDE.md conventions: "Route model binding with slug for projects, ULID for other models." The `tools` resource does not have a slug; `{tool}` resolves by ULID. Both `tools.update` and `tools.show` receive `tool.id` (the ULID string).

---

## 8. Category Options Mapping

Both files map the `categories` prop at the top of the component, before `useForm`, matching the Materials pattern exactly:

```js
const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
```

This converts the server-provided `[{id, name}]` shape to the `{value, label}` shape expected by the `Select` component.

---

## 9. Import List (identical for both files)

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

## 10. Page Layout and Heading

Container: `max-w-3xl` (consistent with Materials forms).

### Create.jsx heading block

```jsx
<h1 className="text-2xl font-semibold text-gray-900">New Tool</h1>
<p className="mt-1 text-sm text-gray-600">
    Fill in the details below to add a new tool to your shop.
</p>
```

### Edit.jsx heading block

```jsx
<h1 className="text-2xl font-semibold text-gray-900">Edit Tool</h1>
<p className="mt-1 text-sm text-gray-600">
    Update the details for <span className="font-medium">{tool.name}</span>.
</p>
```

---

## 11. Submit and Cancel Button Pattern

From `CardFooter`, following Materials pattern exactly:

```jsx
<CardFooter className="gap-3">
    <Button
        type="submit"
        loading={form.processing}
        disabled={form.processing}
    >
        Save Tool
    </Button>
    <Link
        href={route('tools.index')}  {/* or tools.show for Edit */}
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition-colors duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
    >
        Cancel
    </Link>
</CardFooter>
```

---

## 12. Verified Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `AppLayout` | Exists | `resources/js/Layouts/AppLayout.jsx` |
| `Button` | Exists | `Components/ui/Button.jsx` — supports `loading`, `disabled` |
| `Input` | Exists | `Components/ui/Input.jsx` — supports `error` boolean |
| `Label` | Exists | `Components/ui/Label.jsx` |
| `Select` | Exists | `Components/ui/Select.jsx` — supports `options`, `placeholder`, `error` |
| `Textarea` | Exists | `Components/ui/Textarea.jsx` — supports `error`, `rows` |
| `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` | Exists | `Components/ui/Card.jsx` |
| `tools.store` route | Exists | `POST /tools` (from `Route::resource('tools', ...)`) |
| `tools.update` route | Exists | `PUT/PATCH /tools/{tool}` |
| `tools.index` route | Exists | `GET /tools` |
| `tools.show` route | Exists | `GET /tools/{tool}` |
| `ToolCategory` model | Exists | `app/Models/ToolCategory.php`, has `id` and `name` fields |
| `MaintenanceType` enum | Exists | `app/Enums/MaintenanceType.php`, has `label()` method |
| `useForm`, `Head`, `Link` | Exists | `@inertiajs/react` package |

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `ToolController::create()` and `edit()` pass no props | Confirmed (verified by reading controller) | High — forms render blank without data | Update controller as described in Section 4 of this plan |
| Date fields display with time component | Low | Medium — `<input type="date">` requires `YYYY-MM-DD`; Carbon in JSON produces ISO 8601 | Serialize dates explicitly in controller using `->format('Y-m-d')` as shown in Section 4 |
| `purchase_price` arrives as decimal string (e.g. `"649.00"`) | Low | Low — HTML number input handles string initialization fine | No action needed; `?? ''` covers the null case |
| `category_id` is nullable FK; Select value mismatch if `null` | None | None | `?? ''` converts `null` to `''`; Select `placeholder` prop renders the blank option matching `''` value |

---

## 14. Acceptance Criteria Coverage

| Criterion | Covered by |
|-----------|-----------|
| Create form submits `form.post(route('tools.store'))` | Section 7 |
| Edit form submits `form.patch(route('tools.update', tool.id))` | Section 7 |
| Create Cancel navigates to `tools.index` | Section 7 |
| Edit Cancel navigates to `tools.show` with `tool.id` | Section 7 |
| All 3 sections present (Basic Info, Purchase & Warranty, Location & Notes) | Section 5 |
| `name` is marked required with asterisk | Section 5 |
| All other fields are optional (no required asterisk, no backend required rule in form) | Section 5 |
| `purchase_price` uses `step="0.01"` | Section 5 |
| Inline validation errors shown beneath each field | Pattern `{form.errors.X && <p ...>}` applied to every field |
| Submit button shows loading state | `loading={form.processing}` and `disabled={form.processing}` |
| Edit form pre-populates all fields with `?? ''` for nullables | Section 6 |
| `categories` prop mapped from `{id, name}` to `{value, label}` in component | Section 8 |
| JSX file extension (not TSX) | Both files end in `.jsx` |
| `useForm` for all data flow (no direct `router` calls) | Section 6 and 7 |
| Shared layout via `AppLayout.jsx` | Wraps all JSX |
| shadcn-style UI primitives from `Components/ui/` | Section 9 |

---

## 15. Implementation Order for Executing Agent

1. Update `ToolController::create()` and `ToolController::edit()` first (Section 4). The JSX changes are useless without props.
2. Write `Tools/Create.jsx` as a full replacement (use Materials/Create.jsx as structural template, adapt for 3 sections and tool-specific fields).
3. Write `Tools/Edit.jsx` as a near-copy of Create with three differences:
   - Function name `ToolEdit` instead of `ToolCreate`
   - `useForm` initialized from `tool.*` values (all nullable fields with `?? ''`)
   - `form.patch(route('tools.update', tool.id))` and Cancel links to `route('tools.show', tool.id)`
4. Do not import or use `maintenanceTypes` in Create.jsx form fields — it is passed by the controller but not rendered in the form. Simply destructure it from props if desired for future use, or omit it from the destructure entirely since it is not used.
5. Do not add `total_usage_hours` to either form — this field is managed by the maintenance logging system, not by the create/edit forms.
