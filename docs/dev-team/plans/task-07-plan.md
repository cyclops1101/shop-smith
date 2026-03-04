# Task 07 Plan: Project Detail Page (Fullstack)

## 1. Overview

Build the full `Projects/Show.jsx` page and update `ProjectController::show()` with all required
eager loads. The page is divided into eight visible sections rendered inside a single scrollable
view: page header, overview, photos, notes, time log, materials, expenses, and revenues. Each
sub-resource section contains a read table and an inline form that posts to an existing route.

No new routes or models are introduced by this task. All backend sub-resource POST routes are
already registered in `routes/web.php` by prior tasks. `ProjectController` action stubs for
`uploadPhoto`, `logTime`, `attachMaterial`, and `addNote` are already present.

---

## 2. Files to Create or Modify

| Action | Path |
|--------|------|
| Modify | `app/Http/Controllers/ProjectController.php` — `show()` method only |
| Modify | `resources/js/Pages/Projects/Show.jsx` — full replacement of stub |

No new files are needed.

---

## 3. Backend: `ProjectController::show()`

### 3.1 Eager Loads

The method must load all sub-resources in a single query batch to avoid N+1 problems.
The ordering clauses are applied inside the `with()` closures.

```php
use App\Models\Material;

public function show(Project $project): Response
{
    $project->load([
        'photos'      => fn($q) => $q->orderBy('sort_order'),
        'notes'       => fn($q) => $q->orderBy('created_at', 'desc'),
        'timeEntries' => fn($q) => $q->orderBy('started_at', 'desc'),
        'materials',  // BelongsToMany — pivot data included via withPivot in model
        'expenses'    => fn($q) => $q->orderBy('expense_date', 'desc'),
        'revenues'    => fn($q) => $q->orderBy('received_date', 'desc'),
    ]);

    return Inertia::render('Projects/Show', [
        'project'   => $project,
        'materials' => Material::all(['id', 'name', 'unit']),
    ]);
}
```

Key decisions:
- `Material::all(['id', 'name', 'unit'])` passes the minimal columns needed for the attach-
  material select dropdown. It is a separate prop, not nested under project.
- The `materials` relationship on `Project` uses `withPivot(['quantity_used', 'cost_at_time',
  'notes'])` already defined in the model, so pivot data arrives automatically.
- Enum casts on `Project` (`status`, `priority`) are backed strings. Laravel serialises PHP
  Enums as their `->value` when casting to JSON for Inertia, so the frontend receives plain
  strings like `"in_progress"` and `"high"`.

### 3.2 Route Binding

`Project` uses `getRouteKeyName() => 'slug'`. The route parameter in `routes/web.php` is
`{project}`. Laravel resolves the model by slug automatically. No changes to the route file
are needed.

---

## 4. Frontend: `Projects/Show.jsx` — Component Structure

### 4.1 Imports

```jsx
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Button from '@/Components/ui/Button';
import Badge from '@/Components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/Components/ui/Table';
import Alert from '@/Components/ui/Alert';
```

`Modal` is not used — all forms are inline (collapsed/expanded via local `useState` toggles).

### 4.2 Props Signature

```jsx
export default function ProjectShow({ project, materials }) { ... }
```

`project` contains the eager-loaded relationships as nested arrays. `materials` is the flat list
for the attach-material select.

### 4.3 Flash Messages

Read from `usePage().props.flash` at the top of the component body:

```jsx
const { flash } = usePage().props;
```

Render at the very top of the page content area, before the page header:

```jsx
{flash?.success && <Alert variant="success">{flash.success}</Alert>}
{flash?.error   && <Alert variant="error">{flash.error}</Alert>}
```

This covers redirects from all inline form POSTs. The backend must flash messages before
redirecting back; that is handled by Tasks 01–04 controllers.

---

## 5. Section-by-Section Layout

### 5.1 Page Header

Placement: above all sections, full width.

Content:
- `<h1>` with `project.title`
- Status badge — maps `project.status` string to a readable label and a badge variant
- Priority badge — maps `project.priority` string to a label and a badge variant
- "Edit" button (`variant="outline"`) linking to `/projects/{project.slug}/edit` via
  `router.get` or an Inertia `<Link>`
- "Delete" button (`variant="destructive"`) that calls `router.delete` after
  `window.confirm('Delete this project? This cannot be undone.')`

Status-to-badge variant mapping (use `Badge` with `variant` prop):

| Status value | Label | Badge variant |
|---|---|---|
| `planned` | Planned | `secondary` |
| `designing` | Designing | `secondary` |
| `in_progress` | In Progress | `default` |
| `finishing` | Finishing | `default` |
| `on_hold` | On Hold | `outline` |
| `completed` | Completed | `secondary` |
| `archived` | Archived | `outline` |

Priority-to-badge variant mapping:

| Priority value | Label | Badge variant |
|---|---|---|
| `low` | Low | `secondary` |
| `medium` | Medium | `default` |
| `high` | High | `destructive` |
| `urgent` | Urgent | `destructive` |

Delete handler:

```jsx
function handleDelete() {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    router.delete(`/projects/${project.slug}`);
}
```

### 5.2 Overview Section

Render inside a `Card`. Displays project metadata in a two-column definition grid.

Fields to show (label: value):
- Description — full text, preserve whitespace with `whitespace-pre-wrap` on a `<p>`
- Status — human-readable label
- Priority — human-readable label
- Estimated hours — number or em-dash if null
- Estimated cost — formatted as currency or em-dash
- Actual cost — formatted as currency or em-dash
- Sell price — formatted as currency or em-dash
- Started — formatted date or em-dash
- Completed — formatted date or em-dash
- Deadline — formatted date or em-dash
- Commission — Yes / No (boolean from `project.is_commission`)
- Client name — text or em-dash
- Client contact — text or em-dash

Helper for currency formatting:

```jsx
function formatCurrency(value) {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
```

### 5.3 Photos Section

Render inside a `Card`.

#### Read area

Thumbnail grid: `grid grid-cols-2 sm:grid-cols-4 gap-3`. Each photo renders as an `<img>`
with `src` built from the `thumbnail_path` (or `file_path` if thumbnail is null). Below each
image show the `caption` in small gray text.

If `project.photos.length === 0`, show a "No photos yet." empty-state paragraph.

#### Upload form

State: `const photoForm = useForm({ photo: null, caption: '', is_portfolio: false });`

The form must use `forceFormData: true` because it uploads a file:

```jsx
photoForm.post(`/projects/${project.slug}/photos`, { forceFormData: true });
```

Fields:
- File input — `<input type="file" accept="image/jpeg,image/png,image/webp">`, wired to
  `photoForm.setData('photo', e.target.files[0])`. Use `Input` component with `type="file"`.
- Caption — `<Input>` text, `value={photoForm.data.caption}`
- Is portfolio — `<input type="checkbox">` (plain checkbox, not a UI primitive needed here),
  label "Include in portfolio"
- Submit button — `<Button loading={photoForm.processing}>Upload Photo</Button>`

Show `photoForm.errors.photo` if present, below the file input, as a `<p className="text-sm text-red-600">`.

### 5.4 Notes Section

Render inside a `Card`.

#### Read area

List entries newest-first (already ordered by controller). Each entry:
- `created_at` formatted as relative or absolute date (use `formatDate`)
- `content` in a `<p className="whitespace-pre-wrap text-gray-700 text-sm mt-1">`

Separator between entries: `<hr className="border-gray-100">`.

If `project.notes.length === 0`, show "No notes yet."

#### Add note form

State: `const noteForm = useForm({ content: '' });`

```jsx
noteForm.post(`/projects/${project.slug}/notes`, {
    onSuccess: () => noteForm.reset(),
});
```

Fields:
- `<Textarea rows={3} value={noteForm.data.content} onChange={...} placeholder="Add a note..." />`
- `<Button loading={noteForm.processing}>Add Note</Button>`

Show `noteForm.errors.content` below the textarea if set.

### 5.5 Time Log Section

Render inside a `Card`.

#### Duration helper

```jsx
function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
```

#### Total hours display

Sum all `duration_minutes` from `project.timeEntries` where `ended_at` is not null:

```jsx
const totalMinutes = project.timeEntries
    .filter(e => e.ended_at)
    .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
```

Display as "Total: Xh Ym" in a `<p>` above the table.

#### Read area — entries table

Columns: Date | Description | Started | Ended | Duration

```
| Date       | Description | Started   | Ended     | Duration |
|------------|-------------|-----------|-----------|----------|
| Mar 1 2026 | Cut boards  | 9:00 AM   | 11:30 AM  | 2h 30m   |
| Mar 2 2026 | Sanding     | 2:00 PM   | —         | —        |
```

An entry with `ended_at == null` represents an active timer — show "Running..." in the Ended
and Duration cells. If there is an active timer, show a "Stop Timer" button in its row that
calls:

```jsx
router.put(`/projects/${project.slug}/time/${entry.id}/stop`);
```

If `project.timeEntries.length === 0`, show "No time logged yet."

#### Log Time form

State:

```jsx
const timeForm = useForm({
    started_at: '',
    ended_at: '',
    description: '',
});
```

```jsx
timeForm.post(`/projects/${project.slug}/time`, {
    onSuccess: () => timeForm.reset(),
});
```

Fields:
- Started at — `<Input type="datetime-local" ...>`
- Ended at — `<Input type="datetime-local" ...>` (optional — leave blank for open timer)
- Description — `<Input type="text" placeholder="What did you work on?" ...>`
- Submit — `<Button loading={timeForm.processing}>Log Time</Button>`

#### Start Timer shortcut

A secondary button that posts with just the current timestamp as `started_at`:

```jsx
function handleStartTimer() {
    const now = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    router.post(`/projects/${project.slug}/time`, { started_at: now });
}
```

Render as: `<Button variant="outline" onClick={handleStartTimer}>Start Timer Now</Button>`

Disable this button if any time entry already has `ended_at == null` (a timer is already
running):

```jsx
const hasActiveTimer = project.timeEntries.some(e => !e.ended_at);
```

### 5.6 Materials Section

Render inside a `Card`.

#### Read area — materials table

Columns: Material | Qty Used | Unit Cost | Total Cost | Notes

`pivot` data arrives on each material as `material.pivot.quantity_used`,
`material.pivot.cost_at_time`, `material.pivot.notes`.

Total cost per row = `pivot.quantity_used * pivot.cost_at_time` (both may be null — show `—`
if either is null).

If `project.materials.length === 0`, show "No materials attached yet."

#### Attach Material form

State:

```jsx
const materialForm = useForm({
    material_id: '',
    quantity_used: '',
    notes: '',
});
```

```jsx
materialForm.post(`/projects/${project.slug}/materials`, {
    onSuccess: () => materialForm.reset(),
});
```

Fields:
- Material select — use `<Select>` component:
  ```jsx
  <Select
      value={materialForm.data.material_id}
      onChange={e => materialForm.setData('material_id', e.target.value)}
      placeholder="Select a material..."
      options={materials.map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))}
      error={!!materialForm.errors.material_id}
  />
  ```
- Quantity used — `<Input type="number" min="0" step="0.01" ...>`
- Notes — `<Input type="text" placeholder="Optional notes..." ...>`
- Submit — `<Button loading={materialForm.processing}>Attach Material</Button>`

Show individual field errors below each field using:
```jsx
{materialForm.errors.material_id && (
    <p className="mt-1 text-sm text-red-600">{materialForm.errors.material_id}</p>
)}
```

### 5.7 Expenses Section

Render inside a `Card`.

#### Read area — expenses table

Columns: Date | Category | Description | Amount

`expense.category` is a raw string value (enum backed string). Map to a readable label:

```jsx
const expenseCategoryLabels = {
    materials:     'Materials',
    tools:         'Tools',
    shop_supplies: 'Shop Supplies',
    equipment:     'Equipment',
    maintenance:   'Maintenance',
    other:         'Other',
};
```

Show total as a summary row or line below the table: "Total: $X,XXX.XX"

If `project.expenses.length === 0`, show "No expenses recorded."

This section is read-only on the project detail page. Expenses are managed from the Finance
section. No inline creation form is required here per the acceptance criteria (expenses/revenues
sections are "tables of linked financial data").

### 5.8 Revenues Section

Render inside a `Card`.

#### Read area — revenues table

Columns: Date | Client | Description | Payment Method | Amount

If `project.revenues.length === 0`, show "No revenues recorded."

Show total below table: "Total: $X,XXX.XX"

Same read-only policy as expenses. No inline creation form.

---

## 6. Page Layout Assembly

```jsx
export default function ProjectShow({ project, materials }) {
    const { flash } = usePage().props;

    // ... form state declarations (photoForm, noteForm, timeForm, materialForm)
    // ... helper functions (formatCurrency, formatDate, formatDuration)
    // ... computed values (totalMinutes, hasActiveTimer)

    return (
        <AppLayout>
            <Head title={project.title} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Flash Messages */}
                    {flash?.success && <Alert variant="success">{flash.success}</Alert>}
                    {flash?.error   && <Alert variant="error">{flash.error}</Alert>}

                    {/* Page Header */}
                    <PageHeader ... />

                    {/* Overview */}
                    <OverviewSection ... />

                    {/* Photos */}
                    <PhotosSection ... />

                    {/* Notes */}
                    <NotesSection ... />

                    {/* Time Log */}
                    <TimeLogSection ... />

                    {/* Materials */}
                    <MaterialsSection ... />

                    {/* Expenses */}
                    <ExpensesSection ... />

                    {/* Revenues */}
                    <RevenuesSection ... />

                </div>
            </div>
        </AppLayout>
    );
}
```

Each "section" above is a logical grouping rendered inline inside the component — not a
separately exported component file. This keeps the file self-contained per the "fat page
components" convention used in the existing Pages directory.

---

## 7. Key Design Decisions

### Decision 1: All forms inline, no Modal

The acceptance criteria say to use `Modal` only if needed. All sections benefit from visible
inline forms rather than modal popups because the user is a solo woodworker who needs to add
notes and log time quickly without dismissing a modal. Using inline forms also avoids the
complexity of managing modal open/close state alongside form state.

### Decision 2: `forceFormData: true` only for photo upload

Only `photoForm` needs `forceFormData: true` because it includes a file input. All other forms
send JSON by default (Inertia default). Mixing the two is correct and intentional.

### Decision 3: Whitespace preservation for notes and description

Notes content may contain newlines (freeform text). Using `whitespace-pre-wrap` on the render
element preserves line breaks without introducing a markdown library. This satisfies the
"No extra npm packages for markdown" governance rule.

### Decision 4: `material.unit` displayed in the select label

The `materials` prop includes the `unit` column. Appending it to the select label
(`"Oak 1x6 (board)"`) gives the user context when choosing a material and prevents attaching
the wrong unit of measure.

### Decision 5: Expenses and revenues are read-only on this page

The Finance controller manages expense/revenue creation. The project detail page links the
related records but does not provide creation forms, per the acceptance criteria wording
("tables of linked financial data").

### Decision 6: `started_at` uses `datetime-local` input type

HTML `datetime-local` produces values in `YYYY-MM-DDTHH:mm` format. The Laravel `date` and
`datetime` cast handles this format correctly for `started_at` and `ended_at` on `TimeEntry`.

### Decision 7: Stop Timer uses `router.put`, not `useForm`

Stopping a timer is a single-action mutation with no form fields. Using `router.put` directly
is simpler than creating a `useForm` instance with no data. The existing route is:
`PUT /projects/{project}/time/{entry}/stop` → `ProjectController::stopTimer`.

---

## 8. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|----------------|
| `show()` eager-loads photos by sort_order | `'photos' => fn($q) => $q->orderBy('sort_order')` |
| notes by created_at desc | `'notes' => fn($q) => $q->orderBy('created_at', 'desc')` |
| timeEntries by started_at desc | `'timeEntries' => fn($q) => $q->orderBy('started_at', 'desc')` |
| materials with pivot | `'materials'` — pivot defined via `withPivot` in Project model |
| expenses by expense_date desc | `'expenses' => fn($q) => $q->orderBy('expense_date', 'desc')` |
| revenues by received_date desc | `'revenues' => fn($q) => $q->orderBy('received_date', 'desc')` |
| Passes `materials: Material::all(...)` | Second Inertia prop in `show()` |
| Page header with title, status badge, priority badge | Section 5.1 |
| Edit and Delete buttons | Section 5.1 |
| Delete uses `router.delete` with `window.confirm` | Section 5.1 `handleDelete()` |
| Overview section with all metadata | Section 5.2 |
| Photos thumbnail grid + upload form with `forceFormData:true` | Section 5.3 |
| Notes list newest-first + add note textarea form | Section 5.4 |
| Time Log table with duration format, total hours, Log Time form, Start Timer shortcut | Section 5.5 |
| Materials table with name/qty/cost/notes + Attach Material form | Section 5.6 |
| Expenses table of linked financial data | Section 5.7 |
| Revenues table of linked financial data | Section 5.8 |
| Flash messages via Alert from `usePage().props.flash` | Section 4.3 |
| All inline forms use `useForm` and post to correct routes | Sections 5.3–5.6 |
| No extra npm packages for markdown | Section 7, Decision 3 |

---

## 9. Dependencies

| Dependency | Source | Required By |
|------------|--------|-------------|
| `Project` relationships: `photos`, `notes`, `timeEntries`, `materials`, `expenses`, `revenues` | Existing `Project.php` model | `show()` eager load |
| `ProjectMaterial` pivot with `quantity_used`, `cost_at_time`, `notes` | Existing `ProjectMaterial.php` + `Project.php` `withPivot` | Materials table pivot data |
| `Material::all(['id','name','unit'])` | Existing `Material.php` | Attach Material select |
| Route `projects.upload-photo` (POST `/projects/{project}/photos`) | Existing `routes/web.php` | Photo upload form |
| Route `projects.log-time` (POST `/projects/{project}/time`) | Existing `routes/web.php` | Log Time form |
| Route `projects.stop-timer` (PUT `/projects/{project}/time/{entry}/stop`) | Existing `routes/web.php` | Stop Timer button |
| Route `projects.attach-material` (POST `/projects/{project}/materials`) | Existing `routes/web.php` | Attach Material form |
| Route `projects.add-note` (POST `/projects/{project}/notes`) | Existing `routes/web.php` | Add Note form |
| Route `projects.edit` (GET `/projects/{project}/edit`) | Laravel resource route | Edit button |
| Route `projects.destroy` (DELETE `/projects/{project}`) | Laravel resource route | Delete button |
| `flash` prop on Inertia shared props | Set by controllers in Tasks 01–04 | Flash Alert display |
| All UI components: Button, Badge, Card family, Input, Label, Select, Textarea, Table family, Alert | Existing `Components/ui/` | Page rendering |
| `AppLayout` | Existing `Layouts/AppLayout.jsx` | Page wrapper |

---

## 10. Risks

### Risk 1: `material.pivot` may be undefined if no pivot columns arrive

If the `Project::materials()` relationship `withPivot()` call is missing or incorrect, pivot
fields will be `undefined` on the frontend. Guard each pivot access with optional chaining:
`material.pivot?.quantity_used ?? '—'`.

**Mitigation:** The existing `Project.php` already declares `withPivot(['quantity_used',
'cost_at_time', 'notes'])`, so this is low risk. Add defensive `?.` access in the JSX anyway.

### Risk 2: Photo file path serving

`ProjectPhoto.file_path` and `thumbnail_path` are stored paths (e.g., `photos/abc123.jpg`).
They must be served from `public/storage` via `storage:link`. If the symlink is not set up,
images will 404. This task only renders `<img src={photo.thumbnail_path ?? photo.file_path}>`;
the storage configuration is an environment concern outside this task's scope.

**Mitigation:** Document in code comment that paths assume `storage:link` is active.

### Risk 3: Active timer row detection

The "Stop Timer" button and "Start Timer" disable logic both depend on checking
`entry.ended_at === null`. If the backend serialises `ended_at` as `null` in JSON this works
correctly. If it serialises as the string `"null"` or omits the key, the check will fail.
Laravel serialises null columns as JSON `null` by default, so this is low risk.

### Risk 4: `datetime-local` input and timezone

`datetime-local` inputs produce local-time strings without timezone info. If the server is in a
different timezone than the browser, `started_at` values may be stored off. For a single-user
local tool this is acceptable. Document the assumption in a comment.
