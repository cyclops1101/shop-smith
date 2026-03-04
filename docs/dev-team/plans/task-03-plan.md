# Task 03 Plan: Time Entry Backend and Active Timer Shared Data

**Task ID:** 03
**Domain:** backend
**Files modified:** 3
**Status:** pending

---

## 1. Objective

Implement `ProjectController::logTime()` and `ProjectController::stopTimer()`, add a `runningTimer()` scope to `TimeEntry`, and extend `HandleInertiaRequests::share()` with an `activeTimer` prop.

---

## 2. Files to Modify

| File | Change |
|------|--------|
| `app/Models/TimeEntry.php` | Add `scopeRunning()` query scope and `computeDuration()` helper method |
| `app/Http/Controllers/ProjectController.php` | Implement `logTime()` and `stopTimer()` |
| `app/Http/Middleware/HandleInertiaRequests.php` | Add `activeTimer` to shared props |

No new files are needed. `LogTimeRequest` is already correct and requires no changes.

---

## 3. Approach

### Fat model, thin controller

Business logic goes in `TimeEntry`, keeping both controller methods short. Two additions to `TimeEntry`:

- `scopeRunning(Builder $query)` — filters entries where `ended_at IS NULL`
- `computeDuration(Carbon $start, Carbon $end): int` — returns whole minutes between two Carbon instances, minimum 1

The controller calls the scope and the helper rather than embedding query/calculation logic inline.

### Auto-stop logic

Only one running timer is allowed at a time. `logTime()` must stop any existing running entry for any project before starting a new one. The auto-stop logic is identical to what `stopTimer()` does: set `ended_at = now()`, compute and store `duration_minutes`.

### `const UPDATED_AT = null` constraint

`TimeEntry` already declares `const UPDATED_AT = null`. This means:
- `TimeEntry::create()` sets `created_at` automatically.
- Calling `->save()` on an existing `TimeEntry` does NOT attempt to write `updated_at`.
- No `updated_at` column exists in the `time_entries` table; attempting to set it would cause a DB error.

This constraint is safe: `logTime()` calls `create()` (new record) and `stopTimer()` calls `save()` on an existing record with only `ended_at` and `duration_minutes` changed.

---

## 4. Detailed Implementation

### 4.1 `TimeEntry` model additions

**File:** `app/Models/TimeEntry.php`

Add two imports at the top:
```php
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
```

Add a query scope to filter running timers (no `ended_at`):
```php
public function scopeRunning(Builder $query): void
{
    $query->whereNull('ended_at');
}
```

Add a helper that computes duration in whole minutes between two Carbon instances, returning at least 1:
```php
public static function computeDuration(Carbon $start, Carbon $end): int
{
    return max(1, (int) $start->diffInMinutes($end));
}
```

Placing `computeDuration` on the model follows the fat-model convention: it is directly related to time entry data and is needed in both `logTime()` and `stopTimer()`.

### 4.2 `ProjectController::logTime()`

**File:** `app/Http/Controllers/ProjectController.php`

Replace the stub with:

```php
public function logTime(LogTimeRequest $request, Project $project): RedirectResponse
{
    $validated = $request->validated();

    // Auto-stop any existing running timer before creating a new one.
    $running = TimeEntry::running()->first();
    if ($running) {
        $now = now();
        $running->ended_at       = $now;
        $running->duration_minutes = TimeEntry::computeDuration($running->started_at, $now);
        $running->save();
    }

    // Determine duration_minutes.
    $durationMinutes = null;
    if (isset($validated['ended_at'])) {
        $start           = \Illuminate\Support\Carbon::parse($validated['started_at']);
        $end             = \Illuminate\Support\Carbon::parse($validated['ended_at']);
        $durationMinutes = $validated['duration_minutes']
            ?? TimeEntry::computeDuration($start, $end);
    } elseif (isset($validated['duration_minutes'])) {
        $durationMinutes = $validated['duration_minutes'];
    }
    // If ended_at is null and no duration_minutes, this is a running timer — leave null.

    $project->timeEntries()->create([
        'started_at'       => $validated['started_at'],
        'ended_at'         => $validated['ended_at'] ?? null,
        'description'      => $validated['description'] ?? null,
        'duration_minutes' => $durationMinutes,
    ]);

    return redirect()->back()->with('success', 'Time logged.');
}
```

Key decisions:
- `LogTimeRequest` is used instead of `Request` — the method signature changes.
- `TimeEntry::running()->first()` queries globally across all projects (the spec requires only one running timer at a time, not one per project).
- When `ended_at` is provided, `duration_minutes` is computed from the diff unless the client has already sent a value.
- When `ended_at` is null, `duration_minutes` is null — this entry is a running timer.

Add `LogTimeRequest` to the controller's use statements:
```php
use App\Http\Requests\LogTimeRequest;
```

The existing `use Illuminate\Http\Request;` import remains for the other stub methods.

### 4.3 `ProjectController::stopTimer()`

**File:** `app/Http/Controllers/ProjectController.php`

Replace the stub with:

```php
public function stopTimer(Project $project, TimeEntry $entry): RedirectResponse
{
    $now = now();
    $entry->ended_at         = $now;
    $entry->duration_minutes = TimeEntry::computeDuration($entry->started_at, $now);
    $entry->save();

    return redirect()->back()->with('success', 'Timer stopped.');
}
```

Key decisions:
- `now()` is called once and stored in `$now` so `ended_at` and the diff use exactly the same instant.
- `Carbon::diffInMinutes` is wrapped by `computeDuration`, which enforces the minimum-1-minute rule.
- `save()` is safe because `const UPDATED_AT = null` prevents Eloquent from touching a nonexistent `updated_at` column.
- No explicit guard for "already stopped" entries: the route will be hit only when the UI knows a timer is running. If needed, a check (`if ($entry->ended_at)`) could be added, but it is not required by the acceptance criteria.

### 4.4 `HandleInertiaRequests::share()` — `activeTimer` prop

**File:** `app/Http/Middleware/HandleInertiaRequests.php`

Add `TimeEntry` and `Carbon` imports:
```php
use App\Models\TimeEntry;
```

Extend the `share()` return array with:
```php
'activeTimer' => function () use ($request) {
    if (! $request->user()) {
        return null;
    }

    $entry = TimeEntry::running()
        ->with('project:id,slug,title')
        ->first();

    if (! $entry) {
        return null;
    }

    return [
        'id'            => $entry->id,
        'project_id'    => $entry->project_id,
        'project_slug'  => $entry->project->slug,
        'project_title' => $entry->project->title,
        'started_at'    => $entry->started_at,
    ];
},
```

Key decisions:
- A closure (lazy prop) is used so the DB query runs only when the Inertia response is actually rendered, not on every middleware pass including non-Inertia requests.
- `with('project:id,slug,title')` eager-loads only the three project columns needed, avoiding a full project SELECT.
- The null guard on `$request->user()` prevents the query from running on unauthenticated requests (login page, portfolio, etc.).
- `started_at` is returned as a Carbon instance; Inertia/JSON serialization will convert it to an ISO 8601 string automatically.
- The shape matches the acceptance criteria exactly: `{ id, project_id, project_slug, project_title, started_at }`.

---

## 5. Complete File Diffs

### 5.1 `TimeEntry.php` — final state

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class TimeEntry extends Model
{
    use HasFactory, HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'started_at',
        'ended_at',
        'duration_minutes',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'started_at'       => 'datetime',
            'ended_at'         => 'datetime',
            'duration_minutes' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function scopeRunning(Builder $query): void
    {
        $query->whereNull('ended_at');
    }

    public static function computeDuration(Carbon $start, Carbon $end): int
    {
        return max(1, (int) $start->diffInMinutes($end));
    }
}
```

### 5.2 `ProjectController.php` — relevant methods (final state)

```php
use App\Http\Requests\LogTimeRequest;
// (existing imports remain)

public function logTime(LogTimeRequest $request, Project $project): RedirectResponse
{
    $validated = $request->validated();

    $running = TimeEntry::running()->first();
    if ($running) {
        $now = now();
        $running->ended_at         = $now;
        $running->duration_minutes = TimeEntry::computeDuration($running->started_at, $now);
        $running->save();
    }

    $durationMinutes = null;
    if (isset($validated['ended_at'])) {
        $start           = \Illuminate\Support\Carbon::parse($validated['started_at']);
        $end             = \Illuminate\Support\Carbon::parse($validated['ended_at']);
        $durationMinutes = $validated['duration_minutes']
            ?? TimeEntry::computeDuration($start, $end);
    } elseif (isset($validated['duration_minutes'])) {
        $durationMinutes = $validated['duration_minutes'];
    }

    $project->timeEntries()->create([
        'started_at'       => $validated['started_at'],
        'ended_at'         => $validated['ended_at'] ?? null,
        'description'      => $validated['description'] ?? null,
        'duration_minutes' => $durationMinutes,
    ]);

    return redirect()->back()->with('success', 'Time logged.');
}

public function stopTimer(Project $project, TimeEntry $entry): RedirectResponse
{
    $now = now();
    $entry->ended_at         = $now;
    $entry->duration_minutes = TimeEntry::computeDuration($entry->started_at, $now);
    $entry->save();

    return redirect()->back()->with('success', 'Timer stopped.');
}
```

### 5.3 `HandleInertiaRequests.php` — final state

```php
<?php

namespace App\Http\Middleware;

use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user()
                    ? $request->user()->only(['id', 'name', 'email'])
                    : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info'    => $request->session()->get('info'),
            ],
            'appName' => config('app.name'),
            'activeTimer' => function () use ($request) {
                if (! $request->user()) {
                    return null;
                }

                $entry = TimeEntry::running()
                    ->with('project:id,slug,title')
                    ->first();

                if (! $entry) {
                    return null;
                }

                return [
                    'id'            => $entry->id,
                    'project_id'    => $entry->project_id,
                    'project_slug'  => $entry->project->slug,
                    'project_title' => $entry->project->title,
                    'started_at'    => $entry->started_at,
                ];
            },
        ]);
    }
}
```

---

## 6. Edge Cases and Decisions

### Decision 1: Global auto-stop, not per-project

`TimeEntry::running()->first()` queries across all projects. The spec says "only one running timer at a time" globally, not per-project. If a user starts a timer on Project A while a timer is running on Project B, the Project B timer is stopped automatically.

### Decision 2: `duration_minutes` when client sends both `ended_at` and `duration_minutes`

The client-supplied `duration_minutes` takes precedence when `ended_at` is also present. This supports manual time entry where a user may round or adjust the duration. The server-computed value is used only as a fallback (`?? TimeEntry::computeDuration(...)`).

### Decision 3: `diffInMinutes` truncates, not rounds

`Carbon::diffInMinutes()` truncates to whole minutes (floor). A session of 1 minute 59 seconds returns 1 minute. The `max(1, ...)` guard in `computeDuration` ensures a session shorter than 60 seconds still records as 1 minute rather than 0.

### Decision 4: Lazy prop closure in `share()`

Using a closure for `activeTimer` makes it a lazy Inertia prop. Inertia evaluates closures only when building the response, which means the DB query is skipped entirely on non-Inertia partial reloads that do not include `activeTimer` in the requested props. This is the correct pattern for shared data that requires a DB query.

### Decision 5: `with('project:id,slug,title')` column selection

The eager-load uses the colon syntax (`project:id,slug,title`) to select only the three columns needed for the `activeTimer` shape. This avoids loading the full project row (description, notes, etc.) for every Inertia page load.

### Decision 6: `$project` parameter in `logTime` and `stopTimer`

Both methods receive `$project` via route model binding (slug). The `logTime()` method uses `$project->timeEntries()->create()` to ensure the new entry's `project_id` is set correctly. The `stopTimer()` method receives both `$project` and `$entry`; the `$project` binding validates that the entry's project matches the URL (implicit scoping — Laravel's implicit route model binding scopes the child model to the parent when both are present in the route definition).

---

## 7. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| `logTime()` uses `LogTimeRequest` | Method signature is `logTime(LogTimeRequest $request, Project $project)` |
| `logTime()` creates a `TimeEntry` | `$project->timeEntries()->create([...])` |
| When `ended_at` provided, compute `duration_minutes` from diff if not sent | `?? TimeEntry::computeDuration($start, $end)` fallback |
| When `ended_at` null, entry is a running timer | `duration_minutes` left as `null` |
| Only one running timer: auto-stop existing before creating new | `TimeEntry::running()->first()` + stop logic before `create()` |
| `stopTimer()` sets `ended_at = now()` | `$entry->ended_at = $now` |
| `stopTimer()` computes `duration_minutes` via Carbon diff | `TimeEntry::computeDuration($entry->started_at, $now)` |
| `stopTimer()` saves and redirects with flash | `$entry->save()` + `redirect()->back()->with('success', ...)` |
| `share()` adds `activeTimer` | Added as lazy closure |
| `activeTimer` is null when no running timer | `if (! $entry) return null` |
| `activeTimer` shape: `{ id, project_id, project_slug, project_title, started_at }` | Returned array matches exactly |
| `const UPDATED_AT = null` respected — no `updated_at` written | `save()` on existing entry only sets `ended_at` and `duration_minutes`; Eloquent skips `updated_at` due to the constant |
