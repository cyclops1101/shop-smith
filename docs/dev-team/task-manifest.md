# Phase 4: Tools & Equipment — Task Manifest

**Generated:** 2026-03-03
**Phase:** 4 — Tools & Equipment
**Status:** Pending

---

## Overview

Phase 4 implements full tool and equipment management. Phases 1–3 established all patterns: controller CRUD with Scout search and `when()` filters, form requests for all validation, Inertia responses, `useForm`/`router`/`usePage` on the frontend, and PHPUnit 11 `#[Test]` feature tests with `assertInertia`/`assertSoftDeleted`.

Phase 1 scaffolded all models, factories, form requests, and route stubs. This phase wires them into working features.

### Key Existing Assets (Do Not Recreate)

**Models:**
- `app/Models/Tool.php` — `HasUlids`, `SoftDeletes`, `Searchable`; relationships: `category`, `maintenanceSchedules`, `maintenanceLogs`, `tags`; fillable includes all 11 columns; casts `purchase_date` and `warranty_expires` to `date`
- `app/Models/ToolCategory.php` — `HasUlids`, no timestamps, fillable: `name`, `sort_order`
- `app/Models/MaintenanceSchedule.php` — `HasUlids`; fillable: `tool_id`, `maintenance_type`, `task`, `interval_days`, `interval_hours`, `last_performed_at`, `next_due_at`, `notes`; casts `maintenance_type` to `MaintenanceType` enum, date columns to `datetime`
- `app/Models/MaintenanceLog.php` — `HasUlids`, `UPDATED_AT = null`; fillable: `tool_id`, `schedule_id`, `maintenance_type`, `performed_at`, `cost`, `description`

**Enums:**
- `app/Enums/MaintenanceType.php` — 8 backed string cases with `label()` method: `BladeChange`, `Alignment`, `Cleaning`, `Lubrication`, `BeltReplacement`, `Calibration`, `FilterChange`, `Other`

**Form Requests:**
- `app/Http/Requests/StoreToolRequest.php` — validates: `name` (required), `category_id` (nullable ulid exists), `brand`, `model_number`, `serial_number`, `purchase_date`, `purchase_price`, `warranty_expires`, `location`, `manual_url`, `notes`
- `app/Http/Requests/UpdateToolRequest.php` — same rules all prefixed with `'sometimes'`
- `app/Http/Requests/LogMaintenanceRequest.php` — validates: `maintenance_type` (required enum), `description` (required), `performed_at` (required date), `cost` (nullable numeric), `schedule_id` (nullable ulid exists), `usage_hours_at` (nullable numeric)

**Controller:**
- `app/Http/Controllers/ToolController.php` — 7 stub methods (index, create, store, show, edit, update, logMaintenance); all return empty responses

**Routes:**
- `Route::resource('tools', ToolController::class)->except(['destroy'])` — registered; destroy excluded
- `Route::post('/tools/{tool}/maintenance', ...)->name('tools.log-maintenance')` — registered

**Factories:** `ToolFactory`, `ToolCategoryFactory`, `MaintenanceScheduleFactory`, `MaintenanceLogFactory` — all ready

**Frontend stubs:** `resources/js/Pages/Tools/{Index,Show,Create,Edit}.jsx` — all say "under construction"

**Tests:** `tests/Feature/ToolControllerTest.php` — 4 minimal placeholder tests (no assertions, no setUp pattern)

**UI Components available:** Button, Card, Badge, Input, Label, Select, Textarea, Table, Modal, Alert

### Conventions to Follow (from Phases 2 and 3)

- `index`: `search()->keys()` + `when()` filters + `with([...])` + `paginate(15)->withQueryString()`
- `create`/`edit`: enums as `collect(Enum::cases())->map(fn($c) => ['value' => $c->value, 'label' => $c->label()])`, lookups as `get(['id', 'name'])`
- `store`/`update`: form request injection, redirect with `->with('success', '...')`
- `destroy`: soft-delete + redirect to index
- Frontend: `useForm`, debounced search with `useRef`, `router.get()` for filter navigation, `usePage().props.flash` for flash messages
- Tests: PHPUnit 11 `#[Test]`, `RefreshDatabase`, `setUp` with `$this->user`, `assertInertia`, `assertSessionHasErrors`, `assertSoftDeleted`

---

## Task Groups

### Group 1 — Backend (no inter-task dependencies; run in parallel)

---

### TASK-01: ToolController CRUD Implementation

**Group:** 1 (Backend)
**Agent:** backend-laravel
**Depends on:** none
**Estimated complexity:** medium

#### Objective

Replace all 7 stub methods in `ToolController` with working implementations following the `MaterialController` pattern exactly. Add a `destroy` method and register its route. Tools use ULID for route model binding (not slug).

#### Files to Modify

- `app/Http/Controllers/ToolController.php` — replace all 7 stub methods; add `destroy`
- `routes/web.php` — remove `.except(['destroy'])` from the tools resource route; add `destroy` route

#### Files to Read First

- `app/Http/Controllers/MaterialController.php` — primary pattern reference
- `app/Models/Tool.php` — understand relationships and `toSearchableArray`
- `app/Http/Requests/StoreToolRequest.php`, `UpdateToolRequest.php`
- `app/Models/ToolCategory.php`
- `app/Enums/MaintenanceType.php`

#### Implementation Spec

**Required imports to add to controller:**
```php
use App\Enums\MaintenanceType;
use App\Http\Requests\StoreToolRequest;
use App\Http\Requests\UpdateToolRequest;
use App\Models\ToolCategory;
```

**`index(Request $request): Response`**
```php
$filters = $request->only(['search', 'category']);

$query = Tool::query();

if ($search = $filters['search'] ?? null) {
    $ids = Tool::search($search)->keys();
    $query->whereIn('id', $ids);
}

$query->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category_id', $v));

$tools = $query->with(['category'])->latest()->paginate(15)->withQueryString();

return Inertia::render('Tools/Index', [
    'tools'      => $tools,
    'filters'    => $filters,
    'categories' => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
]);
```

**`create(): Response`**
```php
return Inertia::render('Tools/Create', [
    'categories'        => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
    'maintenanceTypes'  => collect(MaintenanceType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
]);
```

**`store(StoreToolRequest $request): RedirectResponse`**
```php
$tool = Tool::create($request->validated());

return redirect()->route('tools.show', $tool)
    ->with('success', 'Tool created successfully.');
```

**`show(Tool $tool): Response`**
```php
$tool->load([
    'category',
    'maintenanceSchedules' => fn ($q) => $q->orderBy('next_due_at'),
    'maintenanceLogs'      => fn ($q) => $q->orderBy('performed_at', 'desc')->limit(20),
]);

return Inertia::render('Tools/Show', [
    'tool'              => $tool,
    'maintenanceTypes'  => collect(MaintenanceType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
]);
```

**`edit(Tool $tool): Response`**
```php
return Inertia::render('Tools/Edit', [
    'tool'       => $tool,
    'categories' => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
]);
```

**`update(UpdateToolRequest $request, Tool $tool): RedirectResponse`**
```php
$tool->update($request->validated());

return redirect()->route('tools.show', $tool)
    ->with('success', 'Tool updated successfully.');
```

**`destroy(Tool $tool): RedirectResponse`**
```php
$tool->delete();

return redirect()->route('tools.index')
    ->with('success', 'Tool deleted.');
```

**Routes change** — in `routes/web.php`, change:
```php
Route::resource('tools', ToolController::class)->except(['destroy']);
```
to:
```php
Route::resource('tools', ToolController::class);
```

#### Acceptance Criteria

- All 8 methods (7 stubs + new destroy) return correct Inertia responses or redirects
- `index` passes `tools` (paginated with category eager loaded), `filters`, `categories`
- `create` passes `categories` and `maintenanceTypes`
- `show` eager loads `category`, `maintenanceSchedules` (ordered by `next_due_at`), and `maintenanceLogs` (most recent 20, ordered by `performed_at` desc); passes `maintenanceTypes` for the log form
- `edit` passes `tool` and `categories`
- `store` creates record and redirects to show with flash success
- `update` saves and redirects to show with flash success
- `destroy` soft-deletes and redirects to index with flash success
- Destroy route is registered (`.except(['destroy'])` removed from web.php)

---

### TASK-02: Maintenance Logging + Schedule Management Backend

**Group:** 1 (Backend)
**Agent:** backend-laravel
**Depends on:** none (implement alongside TASK-01)
**Estimated complexity:** medium

#### Objective

Implement `logMaintenance` in `ToolController`. When logging against a schedule (`schedule_id` is provided), update `last_performed_at` and recompute `next_due_at` on the schedule. Add two new sub-resource routes for creating and deleting maintenance schedules. Add a `StoreMaintenanceScheduleRequest` form request.

#### Files to Modify

- `app/Http/Controllers/ToolController.php` — implement `logMaintenance`; add `storeSchedule` and `destroySchedule` methods
- `routes/web.php` — add schedule sub-resource routes (POST create, DELETE destroy)

#### Files to Create

- `app/Http/Requests/StoreMaintenanceScheduleRequest.php`

#### Files to Read First

- `app/Models/MaintenanceSchedule.php` — fields, casts, relationships
- `app/Models/MaintenanceLog.php` — fields, UPDATED_AT = null
- `app/Http/Requests/LogMaintenanceRequest.php` — all validated fields
- `app/Enums/MaintenanceType.php`

#### Implementation Spec

**`StoreMaintenanceScheduleRequest` validation rules:**
```php
public function authorize(): bool { return true; }

public function rules(): array
{
    return [
        'maintenance_type' => ['required', Rule::enum(MaintenanceType::class)],
        'task'             => ['required', 'string', 'max:255'],
        'interval_days'    => ['nullable', 'integer', 'min:1'],
        'interval_hours'   => ['nullable', 'numeric', 'min:0.1'],
        'notes'            => ['nullable', 'string'],
    ];
}
```

Note: at least one of `interval_days` or `interval_hours` must be provided. Add a custom `after` validation rule using `withValidator`:
```php
public function withValidator($validator): void
{
    $validator->after(function ($v) {
        if (empty($this->interval_days) && empty($this->interval_hours)) {
            $v->errors()->add('interval_days', 'At least one interval (days or hours) is required.');
        }
    });
}
```

**New routes to add in `routes/web.php`** (inside the auth+verified group, after the existing maintenance route):
```php
Route::post('/tools/{tool}/schedules', [ToolController::class, 'storeSchedule'])->name('tools.schedules.store');
Route::delete('/tools/{tool}/schedules/{schedule}', [ToolController::class, 'destroySchedule'])->name('tools.schedules.destroy');
```

**`logMaintenance(LogMaintenanceRequest $request, Tool $tool): RedirectResponse`**
```php
public function logMaintenance(LogMaintenanceRequest $request, Tool $tool): RedirectResponse
{
    $data = $request->validated();

    // Create the maintenance log entry
    $log = $tool->maintenanceLogs()->create([
        'schedule_id'      => $data['schedule_id'] ?? null,
        'maintenance_type' => $data['maintenance_type'],
        'description'      => $data['description'],
        'performed_at'     => $data['performed_at'],
        'cost'             => $data['cost'] ?? null,
    ]);

    // If logging against a schedule, update its tracking fields and compute next due date
    if (!empty($data['schedule_id'])) {
        $schedule = MaintenanceSchedule::find($data['schedule_id']);
        if ($schedule) {
            $performedAt = \Carbon\Carbon::parse($data['performed_at']);
            $schedule->last_performed_at = $performedAt;

            // Compute next_due_at: prefer interval_days over interval_hours
            if ($schedule->interval_days) {
                $schedule->next_due_at = $performedAt->copy()->addDays($schedule->interval_days);
            } elseif ($schedule->interval_hours) {
                $schedule->next_due_at = $performedAt->copy()->addHours($schedule->interval_hours);
            } else {
                $schedule->next_due_at = null;
            }

            $schedule->save();
        }
    }

    // If usage_hours_at is provided, update tool's total_usage_hours
    if (!empty($data['usage_hours_at'])) {
        $tool->update(['total_usage_hours' => $data['usage_hours_at']]);
    }

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Maintenance logged successfully.');
}
```

**`storeSchedule(StoreMaintenanceScheduleRequest $request, Tool $tool): RedirectResponse`**
```php
public function storeSchedule(StoreMaintenanceScheduleRequest $request, Tool $tool): RedirectResponse
{
    $tool->maintenanceSchedules()->create($request->validated());

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Maintenance schedule added.');
}
```

**`destroySchedule(Tool $tool, MaintenanceSchedule $schedule): RedirectResponse`**
```php
public function destroySchedule(Tool $tool, MaintenanceSchedule $schedule): RedirectResponse
{
    $schedule->delete(); // hard delete — no soft deletes on schedules per CLAUDE.md

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Schedule removed.');
}
```

Add required imports to the controller:
```php
use App\Http\Requests\LogMaintenanceRequest;
use App\Http\Requests\StoreMaintenanceScheduleRequest;
use App\Models\MaintenanceSchedule;
use Carbon\Carbon;
```

#### Acceptance Criteria

- POST `/tools/{tool}/maintenance` with valid data creates a `MaintenanceLog` row linked to the tool
- When `schedule_id` is provided, the referenced `MaintenanceSchedule` has its `last_performed_at` updated to `performed_at` and `next_due_at` recalculated from the interval
- When `usage_hours_at` is provided, `tools.total_usage_hours` is updated
- POST `/tools/{tool}/schedules` with valid data creates a `MaintenanceSchedule` row
- `StoreMaintenanceScheduleRequest` rejects requests where both `interval_days` and `interval_hours` are null/absent
- DELETE `/tools/{tool}/schedules/{schedule}` hard-deletes the schedule (assertDatabaseMissing)
- All three actions redirect to `tools.show` with flash success

---

### TASK-03: MaintenanceSchedule Model Scopes and Helpers

**Group:** 1 (Backend)
**Agent:** backend-laravel
**Depends on:** none
**Estimated complexity:** low

#### Objective

Add `scopeOverdue`, `scopeDueSoon`, `isOverdue()`, and `isDueSoon()` to `MaintenanceSchedule`. These power the dashboard "upcoming maintenance" widget and the status badges on the Tools Show page. "Due soon" means `next_due_at` is within the next 7 days (configurable via constant). "Overdue" means `next_due_at` is in the past.

#### Files to Modify

- `app/Models/MaintenanceSchedule.php` — add scopes and helpers

#### Files to Read First

- `app/Models/Material.php` — see how `scopeLowStock` and `isLowStock()` are implemented as a pattern

#### Implementation Spec

Add `use Illuminate\Database\Eloquent\Builder;` to the model imports if not already present.

```php
// Number of days ahead to consider "due soon"
const DUE_SOON_DAYS = 7;

// Scope: schedules where next_due_at is in the past (and not null)
public function scopeOverdue(Builder $query): Builder
{
    return $query->whereNotNull('next_due_at')
        ->where('next_due_at', '<', now());
}

// Scope: schedules where next_due_at is within the next DUE_SOON_DAYS days (and not overdue)
public function scopeDueSoon(Builder $query): Builder
{
    return $query->whereNotNull('next_due_at')
        ->where('next_due_at', '>=', now())
        ->where('next_due_at', '<=', now()->addDays(self::DUE_SOON_DAYS));
}

// Is this schedule currently overdue?
public function isOverdue(): bool
{
    return $this->next_due_at !== null && $this->next_due_at->isPast();
}

// Is this schedule due within DUE_SOON_DAYS days (and not yet overdue)?
public function isDueSoon(): bool
{
    return $this->next_due_at !== null
        && !$this->next_due_at->isPast()
        && $this->next_due_at->lte(now()->addDays(self::DUE_SOON_DAYS));
}
```

Also add an accessor to expose these as serialized fields on the model so they are available in Inertia props without extra computation in controllers:

```php
protected function appends(): array
{
    return ['is_overdue', 'is_due_soon'];
}

public function getIsOverdueAttribute(): bool
{
    return $this->isOverdue();
}

public function getIsDueSoonAttribute(): bool
{
    return $this->isDueSoon();
}
```

#### Acceptance Criteria

- `MaintenanceSchedule::overdue()` returns only schedules where `next_due_at` is not null and in the past
- `MaintenanceSchedule::dueSoon()` returns only schedules where `next_due_at` is not null, not past, and within 7 days
- `$schedule->isOverdue()` returns `true` for past `next_due_at`, `false` otherwise
- `$schedule->isDueSoon()` returns `true` when within 7-day window and not overdue
- Both return `false` when `next_due_at` is null
- `is_overdue` and `is_due_soon` are included in serialized model output (accessible in Inertia props as `schedule.is_overdue`)

---

## Group 2 — Frontend (depends on Group 1 completions)

---

### TASK-04: Tools Index Page

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-01
**Estimated complexity:** medium

#### Objective

Replace the stub `resources/js/Pages/Tools/Index.jsx` with a full working page. Follow the `Materials/Index.jsx` pattern exactly — same layout, same debounced search, same pagination, same filter bar structure but with a category filter instead of supplier.

#### Files to Modify

- `resources/js/Pages/Tools/Index.jsx` — full replacement

#### Files to Read First

- `resources/js/Pages/Materials/Index.jsx` — primary pattern reference

#### Data Contract (from TASK-01 controller)

Props: `{ tools, filters, categories }`
- `tools`: Laravel paginator `{ data[], current_page, last_page, total, links: { prev, next } }`
- `tools.data[n]`: `{ id, name, brand, model_number, location, total_usage_hours, category: { id, name } | null }`
- `filters`: `{ search, category }`
- `categories`: `[{ id, name }]`

#### UI Spec

**Page header:** "Tools" title + total count subtitle (`{tools.total} tool{tools.total !== 1 ? 's' : ''} total`) + "+ New Tool" button linking to `/tools/create`.

**Filter bar (2 controls):**
1. Text search input — debounced 300ms — updates `?search=` via `router.get('/tools', params, { preserveState: true, replace: true })`
2. Category select — options mapped from `categories` prop as `{ value: id, label: name }`, placeholder "All categories"

**Tools table columns:**

| Column | Notes |
|--------|-------|
| Name | `<Link href={'/tools/' + tool.id}>` in amber text |
| Brand | `tool.brand` or `—` if null |
| Model | `tool.model_number` or `—` if null |
| Category | `tool.category?.name` or `—` if null |
| Location | `tool.location` or `—` if null |
| Usage Hours | `tool.total_usage_hours` — render as number; `0` if falsy |
| Actions | "Edit" link to `/tools/{id}/edit` |

**Pagination:** Previous/Next links using `tools.links.prev` and `tools.links.next`. Show `Page {current_page} of {last_page} ({total} total)` on the left.

**Empty state:** Single `<TableCell colSpan={7}>` centered "No tools found."

#### Acceptance Criteria

- Renders at Inertia component `Tools/Index`
- Search and category filters update URL and re-render without full page reload
- Pagination controls render and navigate correctly
- All columns render; nulls display as `—`; `total_usage_hours` shows `0` when falsy
- Wraps in `AppLayout` with `<Head title="Tools" />`

---

### TASK-05: Tools Create and Edit Forms

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-01
**Estimated complexity:** medium

#### Objective

Replace stub `Create.jsx` and `Edit.jsx` with complete working forms. Follow the `Materials/Create.jsx` and `Materials/Edit.jsx` patterns — multi-section Card layout, `useForm`, inline validation errors, loading state on submit button.

#### Files to Modify

- `resources/js/Pages/Tools/Create.jsx` — full replacement
- `resources/js/Pages/Tools/Edit.jsx` — full replacement

#### Data Contract

Create props: `{ categories, maintenanceTypes }`
Edit props: `{ tool, categories }`
- `categories`: `[{ id, name }]` — map to `{ value: id, label: name }` inside the component
- `maintenanceTypes`: `[{ value: 'blade_change', label: 'Blade Change' }, ...]` (only on create; not needed on edit)

#### Form Fields

**Section: Basic Info**
- `name` — text input, required, placeholder "e.g. DeWalt DW735 Planer", `autoFocus`
- `brand` — text input, optional, placeholder "e.g. DeWalt"
- `model_number` — text input, optional, placeholder "e.g. DW735X"
- `serial_number` — text input, optional, placeholder "e.g. SN-12345"
- `category_id` — Select from `categories` as `{ value: id, label: name }`, placeholder "No category", nullable

**Section: Purchase & Warranty**
- `purchase_date` — date input, optional
- `purchase_price` — number input, step=0.01, min=0, optional, placeholder "0.00"; Label shows "Purchase Price ($)"
- `warranty_expires` — date input, optional; Label shows "Warranty Expires"

**Section: Location & Notes**
- `location` — text input, optional, placeholder "e.g. Main shop, left wall"
- `manual_url` — url input, optional, placeholder "https://..."
- `notes` — Textarea, optional, rows=4

**Create form initial state:**
```js
const form = useForm({
    name: '', brand: '', model_number: '', serial_number: '',
    category_id: '', purchase_date: '', purchase_price: '',
    warranty_expires: '', location: '', manual_url: '', notes: '',
});
// submit: form.post(route('tools.store'))
```
Cancel link goes to `route('tools.index')`.

**Edit form initial state:**
```js
const form = useForm({
    name: tool.name,
    brand: tool.brand ?? '',
    model_number: tool.model_number ?? '',
    serial_number: tool.serial_number ?? '',
    category_id: tool.category_id ?? '',
    purchase_date: tool.purchase_date ?? '',
    purchase_price: tool.purchase_price ?? '',
    warranty_expires: tool.warranty_expires ?? '',
    location: tool.location ?? '',
    manual_url: tool.manual_url ?? '',
    notes: tool.notes ?? '',
});
// submit: form.patch(route('tools.update', tool.id))
```
Cancel link goes to `route('tools.show', tool.id)`.

Both forms show inline validation errors below each field using `form.errors.{field}`, and a loading-state submit button using `loading={form.processing}`.

#### Acceptance Criteria

- Create form POSTs to `tools.store`; validation errors display inline below each field
- Edit form PATCHes to `tools.update`; pre-populated with existing tool values
- All 11 fields render and bind correctly via `form.setData`
- Cancel links navigate to correct destination
- Submit button shows loading state while `form.processing` is true
- Wraps in `AppLayout` with `<Head title="New Tool" />` (create) and `<Head title="Edit Tool" />` (edit)

---

### TASK-06: Tools Show Page

**Group:** 2 (Frontend)
**Agent:** frontend-react
**Depends on:** TASK-01, TASK-02, TASK-03
**Estimated complexity:** high

#### Objective

Replace stub `resources/js/Pages/Tools/Show.jsx` with a full detail page. This is the most complex page in Phase 4. It must display tool details, render maintenance schedules with overdue/due-soon status badges, show maintenance log history, and provide two inline forms: one for logging maintenance and one for adding a new schedule.

#### Files to Modify

- `resources/js/Pages/Tools/Show.jsx` — full replacement

#### Data Contract (from TASK-01 controller show method)

Props: `{ tool, maintenanceTypes }`

`tool` shape after eager loading:
```js
{
  id, name, brand, model_number, serial_number,
  purchase_date,    // ISO date string or null
  purchase_price,   // decimal string or null
  warranty_expires, // ISO date string or null
  location, manual_url, notes,
  total_usage_hours, // number
  category: { id, name } | null,
  maintenance_schedules: [{
    id, tool_id, maintenance_type, task,
    interval_days, interval_hours,
    last_performed_at, next_due_at,
    notes,
    is_overdue,  // boolean — from model accessor (TASK-03)
    is_due_soon, // boolean — from model accessor (TASK-03)
  }],
  maintenance_logs: [{
    id, tool_id, schedule_id, maintenance_type,
    performed_at, cost, description,
    created_at,
  }],
}
```

`maintenanceTypes`: `[{ value: 'blade_change', label: 'Blade Change' }, ...]`

Flash: `usePage().props.flash` for `flash.success` / `flash.error`.

#### UI Spec

**Flash messages** at the top of content area:
```jsx
{flash?.success && <Alert variant="success">{flash.success}</Alert>}
{flash?.error && <Alert variant="error">{flash.error}</Alert>}
```

**Page header:**
- `<h1>` with `tool.name`
- Subtitle: `tool.brand` if present
- Edit button: `<Link href={route('tools.edit', tool.id)}>`
- Delete button: `window.confirm` then `router.delete(route('tools.destroy', tool.id))`, redirect handled server-side

**Section 1: Tool Details Card**

Two-column definition list (`<dl>`):
- Name, Brand (`—` if null), Model Number (`—` if null), Serial Number (`—` if null)
- Category (`—` if null), Location (`—` if null)
- Purchase Date (formatted as locale date string or `—`), Purchase Price (`$X.XX` or `—`)
- Warranty Expires (formatted date or `—`), Total Usage Hours (`{tool.total_usage_hours} hrs`)
- Manual URL (as `<a href={tool.manual_url} target="_blank">View Manual</a>` or `—`)
- Notes (full-width, `—` if null)

**Section 2: Maintenance Schedules Card**

Header: "Maintenance Schedules" + "Add Schedule" button that toggles an inline add-schedule form below.

**Schedule table** (if schedules exist):

| Column | Notes |
|--------|-------|
| Task | schedule.task |
| Type | `maintenanceTypes.find(t => t.value === schedule.maintenance_type)?.label` |
| Interval | `{schedule.interval_days} days` or `{schedule.interval_hours} hrs` |
| Last Done | Formatted date or `—` |
| Next Due | Formatted date + status badge |
| Actions | "Remove" button |

Status badge logic for Next Due column:
- If `schedule.is_overdue`: red Badge "Overdue"
- Else if `schedule.is_due_soon`: yellow/amber Badge "Due Soon"
- No badge otherwise

"Remove" button: `router.delete(route('tools.schedules.destroy', [tool.id, schedule.id]))` with `window.confirm`.

**Add Schedule inline form** (shown/hidden via `useState(false)` toggle on "Add Schedule" button):
```js
const scheduleForm = useForm({
    maintenance_type: '',
    task: '',
    interval_days: '',
    interval_hours: '',
    notes: '',
});
// submit: scheduleForm.post(route('tools.schedules.store', tool.id), { onSuccess: () => { scheduleForm.reset(); setShowScheduleForm(false); } })
```

Fields in the inline form:
- `maintenance_type` — Select from `maintenanceTypes`, required
- `task` — text input, required, placeholder "e.g. Clean blade, check alignment"
- `interval_days` — number input, min=1, optional, placeholder "e.g. 30"
- `interval_hours` — number input, step=0.1, optional, placeholder "e.g. 40"
- Helper text: "Provide at least one interval (days or hours)"
- `notes` — Textarea, optional, rows=2
- Submit: "Add Schedule" button + Cancel link that resets form and hides panel

**Empty state** (no schedules): "No maintenance schedules defined. Add one above."

**Section 3: Log Maintenance Card**

Header: "Log Maintenance"

Log form:
```js
const logForm = useForm({
    maintenance_type: '',
    description: '',
    performed_at: '',
    cost: '',
    schedule_id: '',
    usage_hours_at: '',
});
// submit: logForm.post(route('tools.log-maintenance', tool.id), { onSuccess: () => logForm.reset() })
```

Fields:
- `maintenance_type` — Select from `maintenanceTypes`, required
- `schedule_id` — Select with options from `tool.maintenance_schedules` as `{ value: schedule.id, label: schedule.task }`, placeholder "Not linked to schedule", optional
- `description` — Textarea, required, rows=3, placeholder "Describe what was done"
- `performed_at` — date input, required; default to today's date: `new Date().toISOString().split('T')[0]`
- `cost` — number input, step=0.01, min=0, optional, Label "Cost ($)", placeholder "0.00"
- `usage_hours_at` — number input, step=0.1, min=0, optional, Label "Current Usage Hours", placeholder "e.g. 150.5"
- Submit: "Log Maintenance" button

**Section 4: Maintenance History Card**

Header: "Maintenance History"

Table:
| Date | Type | Description | Cost | Schedule |
|------|------|-------------|------|----------|
- Date: `log.performed_at` formatted as locale date string
- Type: resolved label from `maintenanceTypes`
- Description: `log.description`
- Cost: `$X.XX` or `—`
- Schedule: link the schedule task name if `log.schedule_id` is present by matching against `tool.maintenance_schedules`, otherwise `—`

**Empty state** (no logs): "No maintenance has been logged yet."

#### Acceptance Criteria

- Tool details section renders all 11 fields; nulls display as `—`; Manual URL links open in new tab
- Maintenance schedules table renders with correct status badges (overdue = red, due soon = amber, otherwise none)
- "Remove schedule" triggers confirm dialog then DELETE request
- Add Schedule form toggles open/closed; submits POST, resets on success
- Log Maintenance form submits POST to `tools.log-maintenance`; resets on success
- Maintenance history table renders logs in reverse chronological order; empty state shows when empty
- Delete tool button confirms then issues `router.delete`
- Flash messages appear from `usePage().props.flash`
- Wraps in `AppLayout` with `<Head title={tool.name} />`

---

## Group 3 — Tests (depends on Group 1 completions)

---

### TASK-07: Tool Controller and Maintenance Feature Tests

**Group:** 3 (Tests)
**Agent:** backend-laravel
**Depends on:** TASK-01, TASK-02, TASK-03
**Estimated complexity:** medium

#### Objective

Fully replace `tests/Feature/ToolControllerTest.php` with a comprehensive test suite covering all controller actions, maintenance logging, schedule management, and the `MaintenanceSchedule` model scopes. Follow the `MaterialControllerTest.php` pattern exactly for structure and assertion style.

#### Files to Modify

- `tests/Feature/ToolControllerTest.php` — full replacement

#### Files to Read First

- `tests/Feature/MaterialControllerTest.php` — primary pattern reference
- `app/Http/Controllers/ToolController.php` (post TASK-01 and TASK-02)
- `app/Models/MaintenanceSchedule.php` (post TASK-03)
- `database/factories/ToolFactory.php`, `ToolCategoryFactory.php`, `MaintenanceScheduleFactory.php`, `MaintenanceLogFactory.php`

#### Test Class Structure

```php
class ToolControllerTest extends TestCase
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

#### Required Tests

**Auth / Access:**
```php
#[Test]
public function guest_is_redirected_from_tools(): void
// GET /tools → assertRedirect('/login')
```

**Index:**
```php
#[Test]
public function authenticated_user_can_view_tools_index(): void
// assertInertia: component 'Tools/Index', has 'tools', 'filters', 'categories'

#[Test]
public function index_filters_by_category(): void
// Create ToolCategory A and B, create one tool per category
// GET /tools?category={categoryA->id}
// assertInertia: has('tools.data', 1)

#[Test]
public function index_search_returns_tools(): void
// Create tool with known unique name, GET /tools?search={name}
// assertOk() — Scout database driver returns results
```

**Create:**
```php
#[Test]
public function create_page_returns_categories_and_maintenance_types(): void
// GET /tools/create
// assertInertia: component 'Tools/Create', has 'categories', has 'maintenanceTypes'
```

**Store:**
```php
#[Test]
public function store_creates_tool_and_redirects_to_show(): void
// POST /tools with valid data (name required, others optional)
// assertDatabaseHas('tools', ['name' => 'Test Tool'])
// assertRedirect to tools.show

#[Test]
public function store_requires_name(): void
// POST /tools without name → assertSessionHasErrors(['name'])

#[Test]
public function store_rejects_invalid_category_id(): void
// POST /tools with category_id='not-a-valid-ulid' → assertSessionHasErrors(['category_id'])

#[Test]
public function store_rejects_invalid_manual_url(): void
// POST /tools with manual_url='not-a-url' → assertSessionHasErrors(['manual_url'])
```

**Show:**
```php
#[Test]
public function show_returns_tool_with_maintenance_data(): void
// Tool::factory()->create()
// GET /tools/{tool->id}
// assertInertia: component 'Tools/Show', has 'tool', has 'maintenanceTypes'
```

**Edit:**
```php
#[Test]
public function edit_returns_tool_with_categories(): void
// GET /tools/{tool->id}/edit
// assertInertia: component 'Tools/Edit', has 'tool', has 'categories'
```

**Update:**
```php
#[Test]
public function update_saves_changes_and_redirects_to_show(): void
// PATCH /tools/{tool->id} with ['name' => 'Updated Name']
// assertDatabaseHas('tools', ['id' => $tool->id, 'name' => 'Updated Name'])
// assertRedirect to tools.show

#[Test]
public function update_with_invalid_purchase_price_returns_error(): void
// PATCH with ['purchase_price' => 'not-a-number'] → assertSessionHasErrors(['purchase_price'])
```

**Destroy:**
```php
#[Test]
public function destroy_soft_deletes_tool(): void
// DELETE /tools/{tool->id}
// assertSoftDeleted('tools', ['id' => $tool->id])
// assertRedirect to tools.index
```

**Log Maintenance:**
```php
#[Test]
public function log_maintenance_creates_log_entry(): void
// POST /tools/{tool->id}/maintenance with valid data
// assertDatabaseHas('maintenance_logs', ['tool_id' => $tool->id, 'description' => 'Test maintenance'])
// assertRedirect to tools.show

#[Test]
public function log_maintenance_requires_maintenance_type(): void
// POST without maintenance_type → assertSessionHasErrors(['maintenance_type'])

#[Test]
public function log_maintenance_requires_description(): void
// POST without description → assertSessionHasErrors(['description'])

#[Test]
public function log_maintenance_requires_performed_at(): void
// POST without performed_at → assertSessionHasErrors(['performed_at'])

#[Test]
public function log_maintenance_updates_schedule_next_due_at(): void
// Create tool, create MaintenanceSchedule with interval_days=30 for that tool
// POST /tools/{tool->id}/maintenance with schedule_id={schedule->id}, performed_at='2026-03-01'
// Reload schedule from DB
// Assert schedule->last_performed_at == '2026-03-01'
// Assert schedule->next_due_at == '2026-03-31'
```

**Schedule Management:**
```php
#[Test]
public function store_schedule_creates_maintenance_schedule(): void
// POST /tools/{tool->id}/schedules with valid data
// assertDatabaseHas('maintenance_schedules', ['tool_id' => $tool->id, 'task' => 'Sharpen blade'])
// assertRedirect to tools.show

#[Test]
public function store_schedule_requires_task(): void
// POST without task → assertSessionHasErrors(['task'])

#[Test]
public function store_schedule_requires_at_least_one_interval(): void
// POST with task but no interval_days and no interval_hours
// assertSessionHasErrors(['interval_days'])

#[Test]
public function destroy_schedule_hard_deletes_schedule(): void
// Create MaintenanceSchedule for tool
// DELETE /tools/{tool->id}/schedules/{schedule->id}
// assertDatabaseMissing('maintenance_schedules', ['id' => $schedule->id])
// assertRedirect to tools.show
```

**MaintenanceSchedule Model Scopes (no HTTP; model-level tests):**
```php
#[Test]
public function overdue_scope_returns_schedules_with_past_next_due_at(): void
// Create schedule with next_due_at = now()->subDay() → overdue
// Create schedule with next_due_at = now()->addDays(14) → not overdue
// Create schedule with next_due_at = null → excluded
// Assert MaintenanceSchedule::overdue()->count() === 1

#[Test]
public function due_soon_scope_returns_schedules_within_seven_days(): void
// Create schedule with next_due_at = now()->addDays(3) → due soon
// Create schedule with next_due_at = now()->addDays(14) → not due soon
// Create schedule with next_due_at = now()->subDay() → overdue, not due soon
// Create schedule with next_due_at = null → excluded
// Assert MaintenanceSchedule::dueSoon()->count() === 1

#[Test]
public function is_overdue_returns_correct_boolean(): void
// $schedule->next_due_at = now()->subDay(); → isOverdue() === true
// $schedule->next_due_at = now()->addDay(); → isOverdue() === false
// $schedule->next_due_at = null; → isOverdue() === false

#[Test]
public function is_due_soon_returns_correct_boolean(): void
// next_due_at = now()->addDays(3) → isDueSoon() === true
// next_due_at = now()->addDays(14) → isDueSoon() === false
// next_due_at = now()->subDay() → isDueSoon() === false (overdue, not due soon)
// next_due_at = null → isDueSoon() === false
```

#### Acceptance Criteria

- All tests pass: `./vendor/bin/sail artisan test --filter=ToolControllerTest`
- Every controller action covered with at least one happy-path test
- Validation tests use `assertSessionHasErrors`
- Soft delete on tool uses `assertSoftDeleted`; hard delete on schedule uses `assertDatabaseMissing`
- `log_maintenance_updates_schedule_next_due_at` verifies precise date arithmetic
- All four scope/helper tests make direct model assertions without HTTP calls
- No hardcoded IDs — always use factories
- `setUp` uses `$this->user = User::factory()->create()` pattern; all requests use `actingAs($this->user)`

---

## Dependency Graph

```
TASK-01 (ToolController CRUD) ──────┐
                                    ├──► TASK-04 (Tools Index Page)
                                    ├──► TASK-05 (Tools Create/Edit Forms)
                                    │
TASK-02 (Maintenance Backend) ──────┼──► TASK-06 (Tools Show Page)
                                    │
TASK-03 (Model Scopes) ─────────────┤
                                    │
                                    └──► TASK-07 (Tool Tests)
```

**Group 1** tasks (01, 02, 03) have no dependencies and can run in parallel.
**Group 2** tasks (04–06) each require their specific backend task(s) to be complete first. TASK-06 depends on TASK-01, TASK-02, and TASK-03 because the Show page uses schedule sub-resource routes (TASK-02) and renders `is_overdue`/`is_due_soon` accessors (TASK-03).
**Group 3** task (07) requires all three Group 1 tasks to be complete.

---

## File Ownership Map

| Task | Files Modified / Created |
|------|--------------------------|
| TASK-01 | `app/Http/Controllers/ToolController.php` (index, create, store, show, edit, update, destroy methods); `routes/web.php` (remove `.except(['destroy'])` from tools resource route) |
| TASK-02 | `app/Http/Controllers/ToolController.php` (logMaintenance, storeSchedule, destroySchedule methods); `app/Http/Requests/StoreMaintenanceScheduleRequest.php` (create new); `routes/web.php` (add 2 schedule sub-resource routes) |
| TASK-03 | `app/Models/MaintenanceSchedule.php` (add scopes, helpers, appends) |
| TASK-04 | `resources/js/Pages/Tools/Index.jsx` |
| TASK-05 | `resources/js/Pages/Tools/Create.jsx`; `resources/js/Pages/Tools/Edit.jsx` |
| TASK-06 | `resources/js/Pages/Tools/Show.jsx` |
| TASK-07 | `tests/Feature/ToolControllerTest.php` |

> **Note on shared files:** TASK-01 and TASK-02 both write to `ToolController.php` — TASK-01 owns methods 1–7 (index through destroy), TASK-02 adds three new methods (logMaintenance, storeSchedule, destroySchedule). TASK-01 and TASK-02 both touch `routes/web.php` in non-overlapping locations (TASK-01 modifies the existing `Route::resource` line; TASK-02 adds two new route registrations below it). If executing sequentially with a single agent, apply in order: TASK-01 → TASK-02 → TASK-03.

---

## Summary Table

| Task ID | Title | Group | Agent | Depends On | Complexity |
|---------|-------|-------|-------|------------|------------|
| TASK-01 | ToolController CRUD | 1 | backend-laravel | — | medium |
| TASK-02 | Maintenance Logging + Schedule Backend | 1 | backend-laravel | — | medium |
| TASK-03 | MaintenanceSchedule Model Scopes | 1 | backend-laravel | — | low |
| TASK-04 | Tools Index Page | 2 | frontend-react | TASK-01 | medium |
| TASK-05 | Tools Create/Edit Forms | 2 | frontend-react | TASK-01 | medium |
| TASK-06 | Tools Show Page | 2 | frontend-react | TASK-01, TASK-02, TASK-03 | high |
| TASK-07 | Tool Controller + Maintenance Tests | 3 | backend-laravel | TASK-01, TASK-02, TASK-03 | medium |

**Total tasks: 7** (within the 8–10 target range)
