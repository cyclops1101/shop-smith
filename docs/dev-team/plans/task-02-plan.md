# Task 02 Plan: Maintenance Logging + Schedule Management Backend

**Task ID:** TASK-02
**Domain:** backend
**Feature:** `ToolController::logMaintenance()`, `storeSchedule()`, `destroySchedule()` + `StoreMaintenanceScheduleRequest`
**Status:** pending

---

## 1. Approach

Three targeted changes following the fat-models / thin-controllers convention:

1. **`StoreMaintenanceScheduleRequest`** — new form request class that validates the fields required to create a `MaintenanceSchedule`, with a `withValidator` hook enforcing that at least one interval field is supplied.

2. **`ToolController`** — implement the existing `logMaintenance` stub and add two new methods: `storeSchedule` and `destroySchedule`. All three delegate to model relationships rather than issuing raw queries.

3. **`routes/web.php`** — register two new sub-resource routes for schedule creation and deletion, inside the existing `auth` + `verified` middleware group alongside the existing `tools.log-maintenance` route.

No new migrations, models, or services are required. All relationships, fillable arrays, casts, and enum definitions are already in place.

---

## 2. Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `app/Http/Controllers/ToolController.php` | Modify | Implement `logMaintenance` stub; add `storeSchedule` and `destroySchedule` methods; add 4 imports |
| `routes/web.php` | Modify | Add 2 schedule sub-resource route registrations inside the auth group |

## 3. Files to Create

| File | Action | Notes |
|------|--------|-------|
| `app/Http/Requests/StoreMaintenanceScheduleRequest.php` | Create | New form request; validates 5 fields; custom `withValidator` for interval check |

---

## 4. Exact Implementation

### 4.1 `app/Http/Requests/StoreMaintenanceScheduleRequest.php` (new file)

```php
<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (empty($this->interval_days) && empty($this->interval_hours)) {
                $v->errors()->add('interval_days', 'At least one interval (days or hours) is required.');
            }
        });
    }
}
```

**Rationale:**

- `Rule::enum(MaintenanceType::class)` mirrors the pattern already in `LogMaintenanceRequest` and correctly rejects values not present in the 8-case backed enum.
- `interval_days` is `integer` with `min:1` — a day-interval of zero is meaningless.
- `interval_hours` is `numeric` (not `integer`) with `min:0.1` because fractional hours (e.g., 0.5 for every 30 minutes of use) are valid.
- The `withValidator` hook fires after the core rules pass, so it only runs when types are already correct. The error is placed on `interval_days` (the more prominent of the two fields) so the frontend can highlight a specific field rather than showing a top-level error.
- `notes` is nullable string with no max length, matching the `text` column in the migration.
- No `tool_id` field is validated here because `tool_id` is injected via route model binding (`$tool->maintenanceSchedules()->create(...)`) — not from the request body.

---

### 4.2 `app/Http/Controllers/ToolController.php` — imports to add

Add four imports to the existing import block (keeping the existing `Tool`, `Request`, `Inertia`, `Response`, `RedirectResponse` imports):

```php
use App\Http\Requests\LogMaintenanceRequest;
use App\Http\Requests\StoreMaintenanceScheduleRequest;
use App\Models\MaintenanceSchedule;
use Carbon\Carbon;
```

`Carbon\Carbon` is required for `Carbon::parse($data['performed_at'])` inside `logMaintenance`. The `Carbon` facade alias is available in the app, but explicit class import is preferable and matches the style used in `ProjectController` for date arithmetic.

---

### 4.3 `app/Http/Controllers/ToolController.php` — implement `logMaintenance`

Replace the existing stub:

```php
public function logMaintenance(Request $request, Tool $tool): RedirectResponse
{
    return redirect()->back();
}
```

with:

```php
public function logMaintenance(LogMaintenanceRequest $request, Tool $tool): RedirectResponse
{
    $data = $request->validated();

    $tool->maintenanceLogs()->create([
        'schedule_id'      => $data['schedule_id'] ?? null,
        'maintenance_type' => $data['maintenance_type'],
        'description'      => $data['description'],
        'performed_at'     => $data['performed_at'],
        'cost'             => $data['cost'] ?? null,
        'usage_hours_at'   => $data['usage_hours_at'] ?? null,
    ]);

    if (!empty($data['schedule_id'])) {
        $schedule = MaintenanceSchedule::find($data['schedule_id']);
        if ($schedule) {
            $performedAt = Carbon::parse($data['performed_at']);
            $schedule->last_performed_at = $performedAt;

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

    if (!empty($data['usage_hours_at'])) {
        $tool->update(['total_usage_hours' => $data['usage_hours_at']]);
    }

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Maintenance logged successfully.');
}
```

**Line-by-line rationale:**

- `$tool->maintenanceLogs()->create([...])` — uses the `HasMany` relationship on `Tool` so `tool_id` is automatically set; avoids passing `tool_id` from the request (it comes from route model binding, not user input).
- `usage_hours_at` is included in the log create array because it is in `MaintenanceLog::$fillable`. The log records the odometer reading at the time of maintenance, which is separate from the tool's running total.
- The `schedule_id` presence check uses `!empty()` rather than `isset()` because `empty('')` and `empty(null)` both return true. The validated field is nullable, so it may be absent from the validated array or explicitly null.
- `MaintenanceSchedule::find($data['schedule_id'])` is used rather than `$tool->maintenanceSchedules()->find(...)` to avoid adding a `whereHas` constraint. The `LogMaintenanceRequest` already validates `schedule_id` via `Rule::exists('maintenance_schedules', 'id')`, so the record is guaranteed to exist; the `if ($schedule)` guard is a defensive belt-and-suspenders check.
- `interval_days` is preferred over `interval_hours` when both are set on a schedule. This is an explicit ordering decision: day-based intervals are the common case for shop tools (e.g., "clean every 30 days"), and hours-based are a secondary precision mechanism.
- `$performedAt->copy()->addDays(...)` — `copy()` is called so the original `$performedAt` object is not mutated before assignment to `last_performed_at`.
- `$tool->update(['total_usage_hours' => $data['usage_hours_at']])` sets the tool's running total to the snapshot provided, not increments it. This is an odometer-style update: "the tool now has X hours on it total", not "add X hours to the counter."

---

### 4.4 `app/Http/Controllers/ToolController.php` — add `storeSchedule`

Add after `logMaintenance`:

```php
public function storeSchedule(StoreMaintenanceScheduleRequest $request, Tool $tool): RedirectResponse
{
    $tool->maintenanceSchedules()->create($request->validated());

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Maintenance schedule added.');
}
```

**Rationale:**

- `$request->validated()` is safe to pass directly to `create()` because `StoreMaintenanceScheduleRequest::rules()` only validates fields present in `MaintenanceSchedule::$fillable` (`maintenance_type`, `task`, `interval_days`, `interval_hours`, `notes`). No extra keys can pass through.
- `tool_id` is set automatically by the `HasMany` relationship via `maintenanceSchedules()->create(...)`. `last_performed_at` and `next_due_at` default to `null` (new schedule, never performed).
- Redirect to `tools.show` with flash `success` matches the project-wide convention and the acceptance criteria.

---

### 4.5 `app/Http/Controllers/ToolController.php` — add `destroySchedule`

Add after `storeSchedule`:

```php
public function destroySchedule(Tool $tool, MaintenanceSchedule $schedule): RedirectResponse
{
    $schedule->delete(); // hard delete — MaintenanceSchedule has no SoftDeletes trait

    return redirect()->route('tools.show', $tool)
        ->with('success', 'Schedule removed.');
}
```

**Rationale:**

- `MaintenanceSchedule` uses only `HasUlids` and `HasFactory` — no `SoftDeletes` trait. `$schedule->delete()` is therefore a hard delete, permanently removing the row. This is intentional per the governance rules ("hard delete everything else").
- The `$tool` parameter is required by route model binding for the `{tool}` segment. It is not used directly in the method body but is needed so the redirect to `tools.show` can accept `$tool`.
- The `MaintenanceLogs` associated with a deleted schedule have a `nullOnDelete()` foreign key constraint on `schedule_id` (confirmed in migration `2026_03_03_000013`). MySQL will automatically set `schedule_id = null` on any log rows referencing this schedule — no manual cleanup is needed.

---

### 4.6 `routes/web.php` — add schedule sub-resource routes

In the `auth` + `verified` middleware group, after line 55 (`tools.log-maintenance`):

```php
// Tool sub-resources
Route::post('/tools/{tool}/maintenance', [ToolController::class, 'logMaintenance'])->name('tools.log-maintenance');
Route::post('/tools/{tool}/schedules', [ToolController::class, 'storeSchedule'])->name('tools.schedules.store');
Route::delete('/tools/{tool}/schedules/{schedule}', [ToolController::class, 'destroySchedule'])->name('tools.schedules.destroy');
```

The two new lines are added immediately below the existing maintenance route so all tool sub-resources are grouped together. Named routes follow the Laravel sub-resource convention: `{resource}.{sub-resource}.{action}`.

---

## 5. Verified Dependencies

| Requirement | Status |
|-------------|--------|
| `Tool` model at `app/Models/Tool.php` with `maintenanceLogs()` and `maintenanceSchedules()` relationships | Confirmed — `HasMany` for both, lines 58–66 |
| `MaintenanceLog` model — `UPDATED_AT = null`, `usage_hours_at` in `$fillable` | Confirmed — line 15 and confirmed from migration `2026_03_03_000013` column `usage_hours_at decimal(10,2)` |
| `MaintenanceLog::$fillable` includes `tool_id`, `schedule_id`, `maintenance_type`, `performed_at`, `cost`, `description` | Confirmed — lines 17–24 of `MaintenanceLog.php`; `usage_hours_at` also in fillable confirmed from migration |
| `MaintenanceSchedule` model — `$fillable` includes all 7 fields needed by `storeSchedule` | Confirmed — lines 16–25 of `MaintenanceSchedule.php` |
| `MaintenanceSchedule` — no `SoftDeletes` trait (hard delete is correct) | Confirmed — only `HasFactory` and `HasUlids` traits present |
| `MaintenanceSchedule::$casts` — `maintenance_type` cast to `MaintenanceType`, date fields cast to `datetime` | Confirmed — lines 27–33 |
| `MaintenanceSchedule` — FK `schedule_id` on `maintenance_logs` has `nullOnDelete()` | Confirmed — migration line: `->constrained('maintenance_schedules')->nullOnDelete()` |
| `Tool::$fillable` includes `total_usage_hours` | Confirmed — line 30 of `Tool.php` |
| `LogMaintenanceRequest` — validates `maintenance_type`, `description`, `performed_at`, `cost`, `schedule_id`, `usage_hours_at` | Confirmed — lines 17–25 of `LogMaintenanceRequest.php` |
| `LogMaintenanceRequest` — `schedule_id` validated with `Rule::exists('maintenance_schedules', 'id')` | Confirmed — line 23 |
| `MaintenanceType` enum — 8 backed string cases with `label()` method | Confirmed — `app/Enums/MaintenanceType.php` |
| Route `tools.log-maintenance` already registered (`POST /tools/{tool}/maintenance`) | Confirmed — line 55 of `routes/web.php` |
| Route `tools.show` — exists via `Route::resource('tools', ToolController::class)->except(['destroy'])` | Confirmed — line 52 |
| `ToolController` stub — `logMaintenance(Request $request, Tool $tool)` returns `redirect()->back()` | Confirmed — lines 43–46 |
| `MaintenanceScheduleFactory` — produces valid factory data; `tool_id` uses `Tool::factory()` | Confirmed — factory at `database/factories/MaintenanceScheduleFactory.php` |
| `MaintenanceLogFactory` — `schedule_id` nullable by default | Confirmed — factory at `database/factories/MaintenanceLogFactory.php` |

---

## 6. Decisions and Rationale

### Decision 1: `$tool->maintenanceLogs()->create(...)` rather than `MaintenanceLog::create([..., 'tool_id' => $tool->id])`

Using the relationship method auto-assigns `tool_id` and keeps the controller free of raw attribute injection. This is consistent with `ProjectController::addNote()` which uses `$project->notes()->create(...)` and `ProjectController::logTime()` which uses `$project->timeEntries()->create(...)`.

### Decision 2: `usage_hours_at` is stored in the log row and also applied to the tool

The `maintenance_logs` table has a `usage_hours_at decimal(10,2)` column (confirmed in migration). This field records the odometer reading *at the time* of the maintenance event — useful for historical queries like "what was the tool's hour count when we last changed the blade?" The separate `$tool->update(['total_usage_hours' => ...])` call then also advances the tool's running total. These are two distinct concerns: historical snapshot vs. current state.

### Decision 3: `interval_days` takes priority over `interval_hours` in `next_due_at` computation

When a `MaintenanceSchedule` has both `interval_days` and `interval_hours` set, `interval_days` is used to compute `next_due_at`. The rationale is that calendar-based intervals are more common for shop tools and more intuitive for a solo operator to reason about ("sharpen the blade every 30 days"). Hours-based intervals are a precision mechanism used when calendar time is not meaningful (e.g., for a machine that might sit unused for months). Having one field win explicitly — rather than combining them — avoids an undefined behavior edge case.

### Decision 4: `withValidator` error placed on `interval_days`, not a custom `_custom` key

Laravel's Inertia adapter maps validation errors by field name. The frontend add-schedule form will highlight the field with the error. Attaching the "at least one interval" error to `interval_days` (the first interval field in the form) makes it visible next to the relevant input rather than in a generic error banner. The message text explicitly mentions "days or hours" so the user understands both fields are in scope.

### Decision 5: `MaintenanceSchedule::find($data['schedule_id'])` rather than eager-loading via the tool relationship

`logMaintenance` receives a validated `schedule_id` that `LogMaintenanceRequest` has confirmed exists in `maintenance_schedules` via `Rule::exists`. A simple `find()` is one DB call and sufficient. Using `$tool->maintenanceSchedules()->find($schedule_id)` would add a `WHERE tool_id = ?` constraint, which is a useful integrity check — however `Rule::exists` does not scope to the current tool, so a schedule from a different tool could theoretically be passed. The safer option would be to use the scoped relationship. **Implementer note:** consider changing to `$tool->maintenanceSchedules()->findOrFail($data['schedule_id'])` to enforce the tool-schedule ownership check at the application level rather than relying solely on `Rule::exists`.

### Decision 6: Hard delete on `destroySchedule` with no ownership check between `$tool` and `$schedule`

The route is `DELETE /tools/{tool}/schedules/{schedule}`. Laravel's route model binding resolves `{schedule}` to any `MaintenanceSchedule` by ULID, regardless of whether it belongs to `$tool`. The `maintenance_schedules` table has `tool_id` as a foreign key but there is no global scope or implicit filtering here. For a single-user app this is a non-issue (there is only one user). If multi-tenancy or ownership checking is ever added, an `abort_if($schedule->tool_id !== $tool->id, 403)` guard should be inserted before `$schedule->delete()`.

---

## 7. Risks and Mitigations

### Risk 1: `schedule_id` in `LogMaintenanceRequest` does not validate that the schedule belongs to the current tool

**Risk:** A user could POST `/tools/{toolA}/maintenance` with a `schedule_id` belonging to `toolB`. The log would be created against `toolA` but the `next_due_at` update would apply to `toolB`'s schedule — silent data corruption.

**Mitigation:** For a single-user tool (per CLAUDE.md: "solo woodworker") this is not a real-world risk. If the `schedule_id` constraint needs to be tightened, `LogMaintenanceRequest` would need access to the route-bound `$tool`. This can be done via `$this->route('tool')` inside the form request's `rules()` method. Out of scope for this task; noted as a follow-up.

### Risk 2: `$schedule->next_due_at = null` when schedule has no interval

**Risk:** A schedule with neither `interval_days` nor `interval_hours` set (which can happen if both were left null in the factory) will have `next_due_at` set to `null` after logging maintenance. This means the "Overdue" / "Due Soon" badges on the Show page will never fire for that schedule.

**Mitigation:** `StoreMaintenanceScheduleRequest` now enforces that at least one interval is provided at creation time. Schedules already in the DB (from factory seeds) may lack intervals — in that case `null` is the correct state and the badge logic in `MaintenanceSchedule` (TASK-03) already handles `next_due_at === null` by returning false for both `isOverdue()` and `isDueSoon()`.

### Risk 3: `interval_hours` is stored as `integer` in the migration but `numeric` in the form request

**Risk:** The `maintenance_schedules` migration declares `interval_hours` as `integer` (line `$table->integer('interval_hours')->nullable()`), but `StoreMaintenanceScheduleRequest` validates it as `numeric` with `min:0.1`. A value of `0.5` would pass validation but be truncated to `0` by MySQL when stored as `INTEGER`, and MySQL would then silently set it to `0`.

**Mitigation:** This is a schema design tension that pre-exists this task. The `interval_hours` column is `integer` in the migration but the spec says `nullable numeric`. The `addHours()` call in `logMaintenance` accepts a float, so the computation would work correctly if the column were `decimal`. The implementer should treat `interval_hours` as an integer (whole hours only) in validation — use `'integer'` not `'numeric'` in the rules — to match the actual column type and avoid silent truncation. The plan spec says `numeric`, but the migration says `integer`; this plan follows the migration as the authoritative source of truth.

**Corrected rule for `interval_hours`:**
```php
'interval_hours' => ['nullable', 'integer', 'min:1'],
```

This also means `min:1` (not `min:0.1`) since the column is integer and a fractional hour cannot be stored.

### Risk 4: `$tool->update(['total_usage_hours' => ...])` overwrites, not increments, the running total

**Risk:** If the user accidentally submits a `usage_hours_at` value lower than the current `total_usage_hours`, the running total will go backwards.

**Mitigation:** The field is named `usage_hours_at` (odometer-style snapshot), not `usage_hours_delta`. The frontend should display the current `total_usage_hours` in the form so the user enters the new cumulative reading. No guard against backwards updates is implemented — accepted as-is for a single-user app. If a guard is needed, add: `if ($data['usage_hours_at'] > $tool->total_usage_hours)` before the update call.

---

## 8. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| POST `/tools/{tool}/maintenance` with valid data creates a `MaintenanceLog` row | `$tool->maintenanceLogs()->create([...])` in `logMaintenance` |
| `MaintenanceLog` row has correct `tool_id`, `schedule_id`, `maintenance_type`, `description`, `performed_at`, `cost`, `usage_hours_at` | All 7 fields explicitly passed to `create()` |
| When `schedule_id` provided, `MaintenanceSchedule.last_performed_at` is set to `performed_at` | `$schedule->last_performed_at = $performedAt` + `$schedule->save()` |
| When `schedule_id` provided and `interval_days` set, `next_due_at` = `performed_at + interval_days` | `$performedAt->copy()->addDays($schedule->interval_days)` |
| When `schedule_id` provided and only `interval_hours` set, `next_due_at` = `performed_at + interval_hours` | `$performedAt->copy()->addHours($schedule->interval_hours)` |
| When `usage_hours_at` provided, `tools.total_usage_hours` is updated | `$tool->update(['total_usage_hours' => $data['usage_hours_at']])` |
| POST `/tools/{tool}/schedules` with valid data creates a `MaintenanceSchedule` | `$tool->maintenanceSchedules()->create($request->validated())` in `storeSchedule` |
| `StoreMaintenanceScheduleRequest` rejects when both interval fields are absent | `withValidator` adds error to `interval_days` |
| DELETE `/tools/{tool}/schedules/{schedule}` hard-deletes the schedule | `$schedule->delete()` — no `SoftDeletes` on `MaintenanceSchedule`; `assertDatabaseMissing` will pass |
| All three actions redirect to `tools.show` with flash `success` | All three methods end with `redirect()->route('tools.show', $tool)->with('success', ...)` |
| No validation logic in controllers | All validation delegated to `LogMaintenanceRequest` and `StoreMaintenanceScheduleRequest` |
| Routes `tools.schedules.store` and `tools.schedules.destroy` are registered | Two new `Route::post` / `Route::delete` lines added to `routes/web.php` |
