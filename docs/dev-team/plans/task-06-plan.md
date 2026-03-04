# Task 06 Plan: Tools Show Page

**Task ID:** TASK-06
**Domain:** frontend
**File:** `resources/js/Pages/Tools/Show.jsx`

---

## 1. Approach

Replace the 16-line stub in `resources/js/Pages/Tools/Show.jsx` with a full detail page. The pattern reference is `resources/js/Pages/Materials/Show.jsx`, which demonstrates the established conventions: flash alerts at top, page header with action buttons, multiple `Card` sections, `useForm` instances at the top of the component, and inline form submission handlers.

The Tools Show page is the most complex page in Phase 4 because it has **two independent forms** (add schedule + log maintenance) and **two independent tables** (schedules + history), plus a toggle for showing/hiding the add-schedule form. This drives a key structural decision: both `useForm` calls and the `useState` toggle must sit at the top level of the exported component.

The implementation is a single-file full replacement. No new files or shared components need to be created.

---

## 2. Files to Modify

| Action | Path |
|--------|------|
| Full replacement | `resources/js/Pages/Tools/Show.jsx` |

No other files are touched by this task.

---

## 3. Route Analysis

From `routes/web.php`:

```php
Route::resource('tools', ToolController::class)->except(['destroy']);
Route::post('/tools/{tool}/maintenance', [ToolController::class, 'logMaintenance'])->name('tools.log-maintenance');
```

The `tools` resource does **not** include `destroy`. However, the task spec explicitly calls for a Delete tool button with `window.confirm → router.delete`. This means:

- Either a `destroy` route needs to be added (backend task, not in scope here), or
- The frontend code is written now and will only work once the route is registered.

Per the task spec data contract, the Delete button is required on this page. The plan includes it using `router.delete(route('tools.destroy', tool.id))`. The frontend code is correct and will function when the backend route exists.

Available named routes for this page:

| Route Name | Method | URL Pattern | Usage |
|---|---|---|---|
| `tools.show` | GET | `/tools/{tool}` | Current page |
| `tools.edit` | GET | `/tools/{tool}/edit` | Edit button link |
| `tools.destroy` | DELETE | `/tools/{tool}` | Delete button (route registration required) |
| `tools.log-maintenance` | POST | `/tools/{tool}/maintenance` | Log maintenance form submit |
| `tools.schedules.store` | POST | `/tools/{tool}/schedules` | Add schedule form submit (route registration required) |

The task spec references `tools.schedules.store` for the schedule form. This route is not in `web.php` yet. The plan includes the POST call; the route must be registered as a separate backend task.

---

## 4. Data Contract

Props received by `ToolShow({ tool, maintenanceTypes })`:

**`tool` object — all 11 fields plus relations:**

| Field | Type | Notes |
|---|---|---|
| `id` | string (ULID) | Route parameter for all sub-resource routes |
| `name` | string | Displayed as page h1 |
| `brand` | string\|null | Displayed as h2 subtitle in page header |
| `model_number` | string\|null | Details card |
| `serial_number` | string\|null | Details card |
| `category` | object\|null | Eager loaded; use `tool.category?.name` |
| `purchase_date` | string\|null | ISO date string, format for display |
| `purchase_price` | string\|null | decimal(10,2) as string; use `formatCurrency` |
| `warranty_expires` | string\|null | ISO date string, format for display |
| `location` | string\|null | Details card |
| `manual_url` | string\|null | Rendered as `<a target="_blank">` |
| `notes` | string\|null | Details card, full width |
| `total_usage_hours` | string | decimal(10,2) as string, default "0.00" |
| `maintenance_schedules` | array | Each item has: id, task, maintenance_type, interval_days, interval_hours, last_performed_at, next_due_at, notes, **is_overdue** (bool), **is_due_soon** (bool) |
| `maintenance_logs` | array | Each item has: id, maintenance_type, description, cost, performed_at, schedule_id, usage_hours_at |

**`maintenanceTypes` array:** `[{ value: 'blade_change', label: 'Blade Change' }, ...]` — maps to all `MaintenanceType` enum cases.

**Flash:** accessed via `usePage().props.flash`; keys: `success`, `error`.

---

## 5. Component Structure

```
ToolShow({ tool, maintenanceTypes })
  const { flash } = usePage().props
  const [showScheduleForm, setShowScheduleForm] = useState(false)   ← toggle
  const scheduleForm = useForm({...})   ← add schedule form
  const logForm = useForm({...})        ← log maintenance form

  function handleAddSchedule(e) { ... }
  function handleLogMaintenance(e) { ... }
  function handleRemoveSchedule(scheduleId) { ... }
  function handleDelete() { ... }

  <AppLayout>
    <Head title={tool.name} />
    <div className="py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        flash alerts (success + error)
        page header: h1 tool.name, p brand, Edit Link + Delete Button
        <Card> Section 1: Tool Details
        <Card> Section 2: Maintenance Schedules (table + toggle form)
        <Card> Section 3: Log Maintenance Form
        <Card> Section 4: Maintenance History Table
      </div>
    </div>
  </AppLayout>
```

---

## 6. Import List

```jsx
import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
```

All imports are verified to exist. `Select` and `Textarea` are required for the two forms on this page. `useState` is needed for the `showScheduleForm` toggle.

---

## 7. Decisions and Rationale

### Decision 1: Two `useForm` instances at top level

The page has two independent forms:
1. **Schedule form** — adds a new `MaintenanceSchedule` record for this tool.
2. **Log form** — records a `MaintenanceLog` (actual maintenance performed).

React's rules of hooks require both `useForm` calls to be unconditional and at the top level of the exported component. They cannot be inside sub-functions. Both are initialized at the top of `ToolShow`.

```jsx
const scheduleForm = useForm({
    maintenance_type: '',
    task: '',
    interval_days: '',
    interval_hours: '',
    notes: '',
});

const logForm = useForm({
    maintenance_type: '',
    description: '',
    performed_at: new Date().toISOString().slice(0, 10), // today as YYYY-MM-DD
    cost: '',
    schedule_id: '',
    usage_hours_at: '',
});
```

### Decision 2: Toggle for add-schedule form using `useState`

The task spec says the add-schedule form is "toggle-able inline". A boolean `useState` value controls visibility:

```jsx
const [showScheduleForm, setShowScheduleForm] = useState(false);
```

When the user clicks "Add Schedule", `setShowScheduleForm(true)` is called. After a successful submit, `onSuccess` calls `scheduleForm.reset()` and `setShowScheduleForm(false)`.

### Decision 3: Delete handler uses `window.confirm`

Follows the established pattern from `Materials/Show.jsx`:

```jsx
function handleDelete() {
    if (window.confirm('Delete this tool? This cannot be undone.')) {
        router.delete(route('tools.destroy', tool.id));
    }
}
```

Note: The `tools.destroy` route does not currently exist in `web.php` (the resource is registered with `.except(['destroy'])`). The frontend code is written correctly. A backend task must register the route.

### Decision 4: Remove schedule uses `router.delete` inline

Each row in the schedules table has a Remove button. The handler:

```jsx
function handleRemoveSchedule(scheduleId) {
    if (window.confirm('Remove this maintenance schedule?')) {
        router.delete(route('tools.schedules.destroy', { tool: tool.id, schedule: scheduleId }));
    }
}
```

This route also does not currently exist but is referenced in the task spec.

### Decision 5: `performed_at` defaults to today

The `logForm` initializes `performed_at` with today's date string in `YYYY-MM-DD` format using `new Date().toISOString().slice(0, 10)`. This is evaluated once at component mount. The input type is `date`, which the browser renders as a date picker.

### Decision 6: `schedule_id` in log form is optional

The log form's `schedule_id` field allows the user to associate a log entry with an existing schedule. It is rendered as a `<Select>` with a "None (ad-hoc)" placeholder option. Options are built from `tool.maintenance_schedules`:

```jsx
options={[
    { value: '', label: 'None (ad-hoc)' },
    ...tool.maintenance_schedules.map(s => ({
        value: s.id,
        label: s.task,
    })),
]}
```

### Decision 7: Overdue and due-soon badges in the schedules table

The `maintenance_schedules` items include `is_overdue` and `is_due_soon` booleans computed by the backend. The "Next Due" column displays:

- The formatted `next_due_at` date (or "—" if null)
- An **Overdue** badge (`variant="destructive"`) if `is_overdue === true`
- A **Due Soon** badge (`color="#d97706"` amber) if `is_due_soon === true` and not overdue

```jsx
<TableCell>
    <span className="mr-2">{schedule.next_due_at ? formatDate(schedule.next_due_at) : '—'}</span>
    {schedule.is_overdue && <Badge variant="destructive">Overdue</Badge>}
    {!schedule.is_overdue && schedule.is_due_soon && (
        <Badge color="#d97706">Due Soon</Badge>
    )}
</TableCell>
```

### Decision 8: `formatDate` and `formatCurrency` local helpers

No shared utility module exists. Both helpers are defined locally in the file:

```jsx
function formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
```

### Decision 9: Manual URL rendered as external link

`manual_url` is the only field requiring special rendering — it is an anchor tag, not plain text:

```jsx
<dd className="mt-1 text-sm text-gray-900">
    {tool.manual_url
        ? <a href={tool.manual_url} target="_blank" rel="noopener noreferrer"
               className="text-amber-600 underline hover:text-amber-700">
              View Manual
          </a>
        : '—'}
</dd>
```

### Decision 10: Maintenance type displayed as label in tables

The `maintenance_type` field on schedules and logs is the raw enum value (e.g., `'blade_change'`). The `maintenanceTypes` prop provides `{ value, label }` pairs. A lookup helper converts raw values to labels for display:

```jsx
function getTypeLabel(value) {
    const found = maintenanceTypes.find(t => t.value === value);
    return found ? found.label : value;
}
```

This is used in both the schedules table and the history table.

### Decision 11: Schedules table empty state

If `tool.maintenance_schedules.length === 0`, display:

```jsx
<p className="text-sm text-gray-500">No maintenance schedules defined yet.</p>
```

The "Add Schedule" toggle button is always visible regardless of whether schedules exist.

### Decision 12: History table empty state

If `tool.maintenance_logs.length === 0`, display:

```jsx
<p className="text-sm text-gray-500">No maintenance history recorded yet.</p>
```

### Decision 13: Interval display in schedules table

The schedules table "Interval" column shows both day-based and hour-based intervals together when both are set:

```jsx
function formatInterval(schedule) {
    const parts = [];
    if (schedule.interval_days) parts.push(`Every ${schedule.interval_days} days`);
    if (schedule.interval_hours) parts.push(`Every ${schedule.interval_hours} hrs`);
    return parts.length > 0 ? parts.join(' / ') : '—';
}
```

### Decision 14: Cost field in log form uses `step="0.01"` and `min="0"`

The cost field is optional (nullable on the backend). The input:

```jsx
<Input
    id="log-cost"
    type="number"
    step="0.01"
    min="0"
    placeholder="0.00"
    value={logForm.data.cost}
    ...
/>
```

Empty string is submitted for null cost, which the backend should treat as nullable.

---

## 8. Detailed UI Markup Plan

### Helper functions (defined above the return)

```jsx
function formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function getTypeLabel(value) {
    const found = maintenanceTypes.find(t => t.value === value);
    return found ? found.label : value;
}

function formatInterval(schedule) {
    const parts = [];
    if (schedule.interval_days) parts.push(`Every ${schedule.interval_days} days`);
    if (schedule.interval_hours) parts.push(`Every ${schedule.interval_hours} hrs`);
    return parts.length > 0 ? parts.join(' / ') : '—';
}
```

### Flash messages

```jsx
{flash?.success && <Alert variant="success">{flash.success}</Alert>}
{flash?.error && <Alert variant="error">{flash.error}</Alert>}
```

### Page header

```jsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
        <h1 className="text-2xl font-semibold text-gray-900">{tool.name}</h1>
        {tool.brand && (
            <p className="mt-1 text-sm text-gray-500">{tool.brand}</p>
        )}
    </div>
    <div className="flex shrink-0 items-center gap-2">
        <Link href={route('tools.edit', tool.id)}>
            <Button variant="outline" size="sm">Edit</Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
        </Button>
    </div>
</div>
```

### Section 1: Tool Details Card

Two-column `<dl>` with all 11 fields. Fields with possible null values render `|| '—'`. `manual_url` renders as an external link. `notes` spans full width.

```jsx
<Card>
    <CardHeader>
        <CardTitle>Tool Details</CardTitle>
    </CardHeader>
    <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
                <dt className="text-sm font-medium text-gray-500">Brand</dt>
                <dd className="mt-1 text-sm text-gray-900">{tool.brand || '—'}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Model Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{tool.model_number || '—'}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{tool.serial_number || '—'}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{tool.category?.name || '—'}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(tool.purchase_date)}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Purchase Price</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatCurrency(tool.purchase_price)}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Warranty Expires</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(tool.warranty_expires)}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{tool.location || '—'}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Total Usage Hours</dt>
                <dd className="mt-1 text-sm text-gray-900">{tool.total_usage_hours ?? '0.00'}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500">Manual</dt>
                <dd className="mt-1 text-sm text-gray-900">
                    {tool.manual_url
                        ? (
                            <a
                                href={tool.manual_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-600 underline hover:text-amber-700"
                            >
                                View Manual
                            </a>
                        )
                        : '—'}
                </dd>
            </div>
            <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{tool.notes || '—'}</dd>
            </div>
        </dl>
    </CardContent>
</Card>
```

### Section 2: Maintenance Schedules Card

CardHeader uses a flex row to put the title and the "Add Schedule" toggle button side by side.

```jsx
<Card>
    <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle>Maintenance Schedules</CardTitle>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleForm(v => !v)}
            >
                {showScheduleForm ? 'Cancel' : 'Add Schedule'}
            </Button>
        </div>
    </CardHeader>
    <CardContent>
        {/* Toggle-able Add Schedule form */}
        {showScheduleForm && (
            <form onSubmit={handleAddSchedule} className="mb-6 space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">New Schedule</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="schedule-type">Type</Label>
                        <Select
                            id="schedule-type"
                            className="mt-1"
                            options={maintenanceTypes}
                            placeholder="Select type..."
                            value={scheduleForm.data.maintenance_type}
                            error={!!scheduleForm.errors.maintenance_type}
                            onChange={(e) => scheduleForm.setData('maintenance_type', e.target.value)}
                        />
                        {scheduleForm.errors.maintenance_type && (
                            <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.maintenance_type}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="schedule-task">Task Description</Label>
                        <Input
                            id="schedule-task"
                            type="text"
                            placeholder="e.g. Replace planer blades"
                            className="mt-1"
                            value={scheduleForm.data.task}
                            error={!!scheduleForm.errors.task}
                            onChange={(e) => scheduleForm.setData('task', e.target.value)}
                        />
                        {scheduleForm.errors.task && (
                            <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.task}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="schedule-interval-days">Interval (days)</Label>
                        <Input
                            id="schedule-interval-days"
                            type="number"
                            min="1"
                            placeholder="e.g. 90"
                            className="mt-1"
                            value={scheduleForm.data.interval_days}
                            error={!!scheduleForm.errors.interval_days}
                            onChange={(e) => scheduleForm.setData('interval_days', e.target.value)}
                        />
                        {scheduleForm.errors.interval_days && (
                            <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.interval_days}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="schedule-interval-hours">Interval (usage hours)</Label>
                        <Input
                            id="schedule-interval-hours"
                            type="number"
                            min="1"
                            placeholder="e.g. 50"
                            className="mt-1"
                            value={scheduleForm.data.interval_hours}
                            error={!!scheduleForm.errors.interval_hours}
                            onChange={(e) => scheduleForm.setData('interval_hours', e.target.value)}
                        />
                        {scheduleForm.errors.interval_hours && (
                            <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.interval_hours}</p>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="schedule-notes">Notes (optional)</Label>
                        <Textarea
                            id="schedule-notes"
                            rows={2}
                            placeholder="Additional details..."
                            className="mt-1"
                            value={scheduleForm.data.notes}
                            error={!!scheduleForm.errors.notes}
                            onChange={(e) => scheduleForm.setData('notes', e.target.value)}
                        />
                        {scheduleForm.errors.notes && (
                            <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.notes}</p>
                        )}
                    </div>
                </div>
                <Button type="submit" size="sm" loading={scheduleForm.processing}>
                    Save Schedule
                </Button>
            </form>
        )}

        {/* Schedules table */}
        {tool.maintenance_schedules.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Interval</TableHead>
                            <TableHead>Last Done</TableHead>
                            <TableHead>Next Due</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tool.maintenance_schedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                                <TableCell className="font-medium">{schedule.task}</TableCell>
                                <TableCell>{getTypeLabel(schedule.maintenance_type)}</TableCell>
                                <TableCell>{formatInterval(schedule)}</TableCell>
                                <TableCell>{formatDate(schedule.last_performed_at)}</TableCell>
                                <TableCell>
                                    <span className="mr-2">{formatDate(schedule.next_due_at)}</span>
                                    {schedule.is_overdue && (
                                        <Badge variant="destructive">Overdue</Badge>
                                    )}
                                    {!schedule.is_overdue && schedule.is_due_soon && (
                                        <Badge color="#d97706">Due Soon</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveSchedule(schedule.id)}
                                    >
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : (
            <p className="text-sm text-gray-500">No maintenance schedules defined yet.</p>
        )}
    </CardContent>
</Card>
```

### Section 3: Log Maintenance Card

```jsx
<Card>
    <CardHeader>
        <CardTitle>Log Maintenance</CardTitle>
    </CardHeader>
    <CardContent>
        <form onSubmit={handleLogMaintenance} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor="log-type">Maintenance Type</Label>
                    <Select
                        id="log-type"
                        className="mt-1"
                        options={maintenanceTypes}
                        placeholder="Select type..."
                        value={logForm.data.maintenance_type}
                        error={!!logForm.errors.maintenance_type}
                        onChange={(e) => logForm.setData('maintenance_type', e.target.value)}
                    />
                    {logForm.errors.maintenance_type && (
                        <p className="mt-1 text-xs text-red-600">{logForm.errors.maintenance_type}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="log-performed-at">Date Performed</Label>
                    <Input
                        id="log-performed-at"
                        type="date"
                        className="mt-1"
                        value={logForm.data.performed_at}
                        error={!!logForm.errors.performed_at}
                        onChange={(e) => logForm.setData('performed_at', e.target.value)}
                    />
                    {logForm.errors.performed_at && (
                        <p className="mt-1 text-xs text-red-600">{logForm.errors.performed_at}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="log-cost">Cost (optional)</Label>
                    <Input
                        id="log-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="mt-1"
                        value={logForm.data.cost}
                        error={!!logForm.errors.cost}
                        onChange={(e) => logForm.setData('cost', e.target.value)}
                    />
                    {logForm.errors.cost && (
                        <p className="mt-1 text-xs text-red-600">{logForm.errors.cost}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="log-usage-hours">Usage Hours at Service (optional)</Label>
                    <Input
                        id="log-usage-hours"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 47.5"
                        className="mt-1"
                        value={logForm.data.usage_hours_at}
                        error={!!logForm.errors.usage_hours_at}
                        onChange={(e) => logForm.setData('usage_hours_at', e.target.value)}
                    />
                    {logForm.errors.usage_hours_at && (
                        <p className="mt-1 text-xs text-red-600">{logForm.errors.usage_hours_at}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="log-schedule">Link to Schedule (optional)</Label>
                    <Select
                        id="log-schedule"
                        className="mt-1"
                        options={[
                            { value: '', label: 'None (ad-hoc)' },
                            ...tool.maintenance_schedules.map(s => ({
                                value: s.id,
                                label: s.task,
                            })),
                        ]}
                        value={logForm.data.schedule_id}
                        error={!!logForm.errors.schedule_id}
                        onChange={(e) => logForm.setData('schedule_id', e.target.value)}
                    />
                    {logForm.errors.schedule_id && (
                        <p className="mt-1 text-xs text-red-600">{logForm.errors.schedule_id}</p>
                    )}
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor="log-description">Description</Label>
                    <Textarea
                        id="log-description"
                        rows={3}
                        placeholder="What was done, parts replaced, observations..."
                        className="mt-1"
                        value={logForm.data.description}
                        error={!!logForm.errors.description}
                        onChange={(e) => logForm.setData('description', e.target.value)}
                    />
                    {logForm.errors.description && (
                        <p className="mt-1 text-xs text-red-600">{logForm.errors.description}</p>
                    )}
                </div>
            </div>
            <Button type="submit" size="sm" loading={logForm.processing}>
                Log Maintenance
            </Button>
        </form>
    </CardContent>
</Card>
```

### Section 4: Maintenance History Card

```jsx
<Card>
    <CardHeader>
        <CardTitle>Maintenance History</CardTitle>
    </CardHeader>
    <CardContent>
        {tool.maintenance_logs.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Schedule</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tool.maintenance_logs.map((log) => {
                            const linkedSchedule = log.schedule_id
                                ? tool.maintenance_schedules.find(s => s.id === log.schedule_id)
                                : null;
                            return (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {formatDate(log.performed_at)}
                                    </TableCell>
                                    <TableCell>{getTypeLabel(log.maintenance_type)}</TableCell>
                                    <TableCell>{log.description || '—'}</TableCell>
                                    <TableCell>{formatCurrency(log.cost)}</TableCell>
                                    <TableCell>
                                        {linkedSchedule ? linkedSchedule.task : '—'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        ) : (
            <p className="text-sm text-gray-500">No maintenance history recorded yet.</p>
        )}
    </CardContent>
</Card>
```

---

## 9. Form Handler Implementations

```jsx
function handleAddSchedule(e) {
    e.preventDefault();
    scheduleForm.post(route('tools.schedules.store', tool.id), {
        onSuccess: () => {
            scheduleForm.reset();
            setShowScheduleForm(false);
        },
    });
}

function handleLogMaintenance(e) {
    e.preventDefault();
    logForm.post(route('tools.log-maintenance', tool.id), {
        onSuccess: () => logForm.reset(),
    });
}

function handleRemoveSchedule(scheduleId) {
    if (window.confirm('Remove this maintenance schedule?')) {
        router.delete(route('tools.schedules.destroy', { tool: tool.id, schedule: scheduleId }));
    }
}

function handleDelete() {
    if (window.confirm('Delete this tool? This cannot be undone.')) {
        router.delete(route('tools.destroy', tool.id));
    }
}
```

---

## 10. Verified UI Component API

| Component | Key Props Used | Source File |
|---|---|---|
| `Alert` | `variant="success"`, `variant="error"` | `Components/ui/Alert.jsx` |
| `Badge` | `variant="destructive"`, `color="#d97706"` | `Components/ui/Badge.jsx` |
| `Button` | `variant`, `size`, `loading`, `onClick`, `type` | `Components/ui/Button.jsx` |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | standard layout | `Components/ui/Card.jsx` |
| `Input` | `type`, `step`, `min`, `placeholder`, `value`, `error`, `onChange`, `className` | `Components/ui/Input.jsx` |
| `Label` | `htmlFor` | `Components/ui/Label.jsx` |
| `Select` | `options`, `placeholder`, `value`, `error`, `onChange`, `className` | `Components/ui/Select.jsx` |
| `Textarea` | `rows`, `placeholder`, `value`, `error`, `onChange`, `className` | `Components/ui/Textarea.jsx` |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | standard table | `Components/ui/Table.jsx` |

**`Select` component note:** The `Select` component uses `options={[{ value, label }]}` array and an optional `placeholder` string for a disabled first option. The `value` prop is passed directly to the native `<select>` element via `{...props}`. The `onChange` handler receives a native DOM event `(e) => setData('field', e.target.value)`.

---

## 11. Risks

### Risk 1: `tools.destroy` and `tools.schedules.store` / `tools.schedules.destroy` routes do not exist

The `tools` resource is registered with `.except(['destroy'])`. The maintenance schedules sub-routes are not registered at all in `web.php`. The frontend code in this plan references:

- `route('tools.destroy', tool.id)` — Delete tool button
- `route('tools.schedules.store', tool.id)` — Add schedule form
- `route('tools.schedules.destroy', { tool: tool.id, schedule: scheduleId })` — Remove schedule button

If any of these are called before the backend registers them, Ziggy will throw a JavaScript error. The page will render correctly and statically; the error will only occur when the user tries to perform those specific actions.

Mitigation: backend tasks must register these routes. The log maintenance route (`tools.log-maintenance`) is already registered.

### Risk 2: `is_overdue` and `is_due_soon` must be computed by the backend controller

The `maintenance_schedules` items are expected to have `is_overdue` and `is_due_soon` boolean properties. These are not database columns — they are computed attributes. The `ToolController@show` method must compute and attach them before passing to Inertia. If the controller passes raw Eloquent models without these computed fields, the badge logic `{schedule.is_overdue && ...}` will silently not render (falsy undefined), which is safe but will show no badges.

Mitigation: the frontend code degrades gracefully. Both booleans default to falsy if absent.

### Risk 3: `performed_at` default initialized once at component mount

`new Date().toISOString().slice(0, 10)` evaluates once when the component mounts. If the user leaves the form open past midnight, the date will not update. This is acceptable for a shop management tool — the user can manually change the date field.

### Risk 4: `maintenance_type` raw string vs enum value

The backend casts `maintenance_type` to the `MaintenanceType` enum but Inertia serializes it as the enum's `value` property (the string, e.g., `'blade_change'`). The `maintenanceTypes` prop from the controller is `[{value, label}]`. The `getTypeLabel` lookup matches on `value`. This is consistent and correct as long as the controller serializes enums to their backing string value, which is the default Inertia/Laravel behavior.

### Risk 5: Decimal fields from MySQL arrive as strings

`purchase_price`, `total_usage_hours`, `cost`, and `usage_hours_at` are `decimal(10,2)` columns. Eloquent without explicit cast returns them as strings. `formatCurrency` passes the string to `Intl.NumberFormat` which coerces strings to numbers correctly. No explicit `parseFloat` is needed for display, but if arithmetic is ever added, `parseFloat` must be applied.

---

## 12. Acceptance Criteria Coverage

| Criterion (from Task Spec) | How Covered |
|---|---|
| Wraps in `AppLayout` with `<Head title={tool.name} />` | Top-level `<AppLayout>` + `<Head>` |
| Flash messages via `usePage().props.flash` | `flash?.success` and `flash?.error` rendered as `<Alert>` above header |
| Page header: `tool.name` as h1, `tool.brand` as subtitle, Edit link, Delete button | Implemented; Delete uses `window.confirm` then `router.delete` |
| Section 1: Two-column dl with all 11 fields, Manual URL as external link, nulls as "—" | All 11 fields in `<dl>` grid; `manual_url` as `<a target="_blank">`; every null-able field uses `|| '—'` or `formatDate`/`formatCurrency` which return `'—'` for null |
| Section 2: Table with Task/Type/Interval/Last Done/Next Due (overdue/due-soon badges)/Actions(Remove) | All 6 columns implemented; badges use `is_overdue` and `is_due_soon` booleans |
| Section 2: Toggle-able "Add Schedule" form using `scheduleForm = useForm({...})` | `useState(false)` toggle; form renders when true; button label changes; form hides on success |
| Section 2: Add Schedule form POSTs to `tools.schedules.store` | `scheduleForm.post(route('tools.schedules.store', tool.id), {...})` |
| Section 3: Log form with `logForm = useForm({...})` with all 6 fields | All 6 fields: `maintenance_type`, `description`, `performed_at`, `cost`, `schedule_id`, `usage_hours_at` |
| Section 3: `performed_at` defaults to today | `new Date().toISOString().slice(0, 10)` in `useForm` initial state |
| Section 3: Log form POSTs to `tools.log-maintenance` | `logForm.post(route('tools.log-maintenance', tool.id), {...})` |
| Section 4: History table with Date/Type/Description/Cost/Schedule columns | All 5 columns; schedule name looked up from `tool.maintenance_schedules`; empty state message |
| Delete button: `window.confirm` then `router.delete` | `handleDelete` guards with `window.confirm('Delete this tool? ...')` |
| `scheduleForm` fields: `maintenance_type`, `task`, `interval_days`, `interval_hours`, `notes` | All 5 fields initialized in `useForm` and rendered in the form |
| `logForm` fields: `maintenance_type`, `description`, `performed_at`, `cost`, `schedule_id`, `usage_hours_at` | All 6 fields initialized in `useForm` and rendered in the form |
