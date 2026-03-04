# TASK-03: MaintenanceSchedule Model Scopes and Helpers — Implementation Plan

**Task ID:** TASK-03
**Domain:** backend
**Feature:** Add `scopeOverdue`, `scopeDueSoon`, `isOverdue()`, `isDueSoon()`, and appended
accessors `is_overdue` / `is_due_soon` to `MaintenanceSchedule`.
**Status:** pending

---

## 1. Approach

All additions are purely additive to `app/Models/MaintenanceSchedule.php`. No migrations,
controllers, routes, or frontend files are touched.

The implementation follows the exact pattern established by `app/Models/Material.php`:

- Eloquent scopes type-hint `Builder $query` and return `Builder`.
- Instance helper methods are pure boolean checks using already-cast model attributes (no
  extra queries).
- Appended accessors delegate to the instance helpers so logic is never duplicated.

`next_due_at` is already cast to `'datetime'` in `casts()`, which means it is a `Carbon`
instance when not null. All temporal comparisons use native Carbon methods (`isPast()`, `lte()`).

---

## 2. File to Modify

| File | Action |
|------|--------|
| `app/Models/MaintenanceSchedule.php` | Modify — add constant, `$appends`, scopes, helpers, accessors |

No other files require changes.

---

## 3. Current State of `MaintenanceSchedule`

`app/Models/MaintenanceSchedule.php` (45 lines as read):

```php
<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceSchedule extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'tool_id',
        'maintenance_type',
        'task',
        'interval_days',
        'interval_hours',
        'last_performed_at',
        'next_due_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'maintenance_type'  => MaintenanceType::class,
            'last_performed_at' => 'datetime',
            'next_due_at'       => 'datetime',
        ];
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class, 'schedule_id');
    }
}
```

---

## 4. Detailed Changes

### 4.1 Add `Builder` import

Add `use Illuminate\Database\Eloquent\Builder;` alongside the existing use statements.

The full updated import block becomes:

```php
use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

### 4.2 Add `DUE_SOON_DAYS` constant

Immediately after the class declaration line, before `$fillable`:

```php
public const int DUE_SOON_DAYS = 7;
```

### 4.3 Add `$appends` property

After `$fillable`, before the `casts()` method:

```php
protected $appends = ['is_overdue', 'is_due_soon'];
```

### 4.4 Add `scopeOverdue` scope

After the `maintenanceLogs()` relation, in a new "Query Scopes" section:

```php
public function scopeOverdue(Builder $query): Builder
{
    return $query->whereNotNull('next_due_at')
        ->where('next_due_at', '<', now());
}
```

Logic: returns only rows where `next_due_at` is set and is strictly in the past.

### 4.5 Add `scopeDueSoon` scope

```php
public function scopeDueSoon(Builder $query): Builder
{
    return $query->whereNotNull('next_due_at')
        ->where('next_due_at', '>=', now())
        ->where('next_due_at', '<=', now()->addDays(self::DUE_SOON_DAYS));
}
```

Logic: returns only rows where `next_due_at` is set, is not yet past, and falls within the
next `DUE_SOON_DAYS` (7) days. Both `now()` calls execute at query-build time within the same
request lifecycle — no meaningful drift between the two calls.

### 4.6 Add `isOverdue()` instance helper

```php
public function isOverdue(): bool
{
    return $this->next_due_at !== null
        && $this->next_due_at->isPast();
}
```

Uses Carbon's `isPast()` on the already-cast `next_due_at` attribute. No database query.

### 4.7 Add `isDueSoon()` instance helper

```php
public function isDueSoon(): bool
{
    return $this->next_due_at !== null
        && ! $this->next_due_at->isPast()
        && $this->next_due_at->lte(now()->addDays(self::DUE_SOON_DAYS));
}
```

Logic: not null, not yet past, and within the due-soon window. The three conditions mirror the
`scopeDueSoon` logic exactly. No database query.

### 4.8 Add appended accessor methods

```php
public function getIsOverdueAttribute(): bool
{
    return $this->isOverdue();
}

public function getIsDueSoonAttribute(): bool
{
    return $this->isDueSoon();
}
```

With `$appends = ['is_overdue', 'is_due_soon']` declared, Eloquent will call these during
`toArray()` / `toJson()`. Inertia serialises model props via `toArray()`, so `is_overdue` and
`is_due_soon` will appear automatically in every Inertia response that includes a
`MaintenanceSchedule` instance.

---

## 5. Final File (complete, ready for implementation)

```php
<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceSchedule extends Model
{
    use HasFactory, HasUlids;

    public const int DUE_SOON_DAYS = 7;

    protected $fillable = [
        'tool_id',
        'maintenance_type',
        'task',
        'interval_days',
        'interval_hours',
        'last_performed_at',
        'next_due_at',
        'notes',
    ];

    protected $appends = ['is_overdue', 'is_due_soon'];

    protected function casts(): array
    {
        return [
            'maintenance_type'  => MaintenanceType::class,
            'last_performed_at' => 'datetime',
            'next_due_at'       => 'datetime',
        ];
    }

    // ── Relations ──────────────────────────────────────────────────────────

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class, 'schedule_id');
    }

    // ── Query Scopes ───────────────────────────────────────────────────────

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->whereNotNull('next_due_at')
            ->where('next_due_at', '<', now());
    }

    public function scopeDueSoon(Builder $query): Builder
    {
        return $query->whereNotNull('next_due_at')
            ->where('next_due_at', '>=', now())
            ->where('next_due_at', '<=', now()->addDays(self::DUE_SOON_DAYS));
    }

    // ── Instance Helpers ───────────────────────────────────────────────────

    public function isOverdue(): bool
    {
        return $this->next_due_at !== null
            && $this->next_due_at->isPast();
    }

    public function isDueSoon(): bool
    {
        return $this->next_due_at !== null
            && ! $this->next_due_at->isPast()
            && $this->next_due_at->lte(now()->addDays(self::DUE_SOON_DAYS));
    }

    // ── Appended Accessors ─────────────────────────────────────────────────

    public function getIsOverdueAttribute(): bool
    {
        return $this->isOverdue();
    }

    public function getIsDueSoonAttribute(): bool
    {
        return $this->isDueSoon();
    }
}
```

---

## 6. Key Decisions and Rationale

### Decision 1: Follow the Material model scope pattern exactly

`Material` has `scopeLowStock(Builder $query): Builder` and `isLowStock(): bool`. The same
two-layer pattern (scope for DB queries, instance method for in-memory checks) is replicated
here. This keeps the codebase internally consistent and predictable.

### Decision 2: Appended accessors delegate to instance helpers

The accessors `getIsOverdueAttribute` and `getIsDueSoonAttribute` do nothing except call
`isOverdue()` and `isDueSoon()`. This ensures there is exactly one place where the boolean
logic lives. If the threshold changes from 7 days, only `DUE_SOON_DAYS` and the two helper
methods need updating — the accessors and scopes reference `self::DUE_SOON_DAYS` automatically.

### Decision 3: `DUE_SOON_DAYS` as a typed class constant

`public const int DUE_SOON_DAYS = 7` is a PHP 8.3 typed constant. It is declared `public`
so callers (e.g., frontend-facing query builders or tests) can reference
`MaintenanceSchedule::DUE_SOON_DAYS` without hardcoding `7`. Using `self::DUE_SOON_DAYS`
inside the class avoids magic numbers throughout.

### Decision 4: Scope boundary for overdue vs. due soon

`scopeOverdue` uses strict `<` (less than now), and `scopeDueSoon` uses `>=` (greater than or
equal to now). This mirrors Carbon's `isPast()` which returns `true` when the datetime is
strictly before the current time. A record where `next_due_at` is exactly the current second
would be `isPast()` true, making it overdue — not due soon. The SQL and PHP logic are aligned.

### Decision 5: `$appends` and serialisation performance

Adding `$appends` means every `toArray()` / `toJson()` call computes both accessors. Both
are pure in-memory boolean evaluations with no additional queries. The overhead is negligible
for a single-user tool. No lazy-loading concern exists.

### Decision 6: No migration required

`next_due_at` is already in `$fillable` and cast to `'datetime'`. This task adds no columns,
no indexes, and no schema changes.

---

## 7. Edge Cases

| Case | Scope Behaviour | Helper Behaviour |
|------|----------------|-----------------|
| `next_due_at` is `null` | Excluded by `whereNotNull` | Both helpers return `false` |
| `next_due_at` is in the past | `scopeOverdue` includes it | `isOverdue()` returns `true`, `isDueSoon()` returns `false` |
| `next_due_at` is within 7 days (future) | `scopeDueSoon` includes it | `isDueSoon()` returns `true`, `isOverdue()` returns `false` |
| `next_due_at` is more than 7 days out | Neither scope includes it | Both helpers return `false` |
| `next_due_at` is exactly now | Treated as overdue (`isPast()` is `true` for non-future instants) | `isOverdue()` returns `true`, `isDueSoon()` returns `false` |

A record cannot be simultaneously overdue and due soon — the conditions are mutually exclusive.

---

## 8. Acceptance Criteria

| Criterion | Covered By |
|-----------|-----------|
| `MaintenanceSchedule::overdue()` scope returns only past `next_due_at` records | `scopeOverdue` — section 4.4 |
| `MaintenanceSchedule::dueSoon()` scope returns only within-7-day future records | `scopeDueSoon` — section 4.5 |
| Records with `next_due_at = null` excluded from both scopes | `whereNotNull('next_due_at')` guard in both scopes |
| `$schedule->isOverdue()` returns correct boolean in-memory | `isOverdue()` — section 4.6 |
| `$schedule->isDueSoon()` returns correct boolean in-memory | `isDueSoon()` — section 4.7 |
| `$schedule->toArray()` includes `is_overdue` and `is_due_soon` keys | `$appends` + accessors — sections 4.3 and 4.8 |
| `is_overdue` and `is_due_soon` appear in Inertia props automatically | Inertia serialises via `toArray()`; `$appends` ensures inclusion |
| `DUE_SOON_DAYS = 7` constant used throughout (no magic numbers) | `self::DUE_SOON_DAYS` referenced in scope and helper |
| No existing behaviour broken | Only additive changes; no existing methods modified |
| No migrations required | Confirmed — `next_due_at` column and cast already exist |
