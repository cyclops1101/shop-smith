# Task 02 Plan: Stock Adjustment Backend

**Task ID:** 02
**Domain:** backend
**Feature:** `MaterialController::adjustStock()` + `Material` model helpers
**Status:** pending

---

## 1. Approach

Two targeted changes following the project's fat-models / thin-controllers convention:

1. **`Material` model** — add three methods:
   - `scopeLowStock(Builder $query)` — Eloquent query scope to filter materials that are at or below their low-stock threshold.
   - `isLowStock(): bool` — instance helper that returns whether the current model instance is in a low-stock state.
   - `adjustQuantity(float $delta): void` — mutates `quantity_on_hand` (floored at 0) and saves the model.

2. **`MaterialController::adjustStock()`** — replace the stub with the real implementation. It accepts the already-existing `AdjustStockRequest` (which validates `quantity` as required numeric and `notes` as nullable string), delegates mutation to `$material->adjustQuantity()`, builds a human-readable flash message using the `MaterialUnit::label()` method on the model's cast `unit` attribute, and redirects to `materials.show`.

No new files need to be created. No migrations, no new routes, no frontend changes are required.

---

## 2. Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `app/Models/Material.php` | Modify | Add `scopeLowStock`, `isLowStock`, `adjustQuantity`; add `Builder` import |
| `app/Http/Controllers/MaterialController.php` | Modify | Replace stub `adjustStock` body; swap `Request` type-hint for `AdjustStockRequest` |

No files are created. No other files are changed.

---

## 3. Exact Implementation

### 3.1 `app/Models/Material.php`

Add one import at the top of the file:

```php
use Illuminate\Database\Eloquent\Builder;
```

Add three methods to the `Material` class body (placement: after the `tags()` relation, before the closing brace):

```php
public function scopeLowStock(Builder $query): Builder
{
    return $query->whereNotNull('low_stock_threshold')
        ->whereColumn('quantity_on_hand', '<=', 'low_stock_threshold');
}

public function isLowStock(): bool
{
    return $this->low_stock_threshold !== null
        && $this->quantity_on_hand <= $this->low_stock_threshold;
}

public function adjustQuantity(float $delta): void
{
    $this->quantity_on_hand = max(0, $this->quantity_on_hand + $delta);
    $this->save();
}
```

The `scopeLowStock` scope uses `whereColumn` to compare two columns in the same row, which is translated to a SQL `WHERE quantity_on_hand <= low_stock_threshold` predicate. `whereNotNull('low_stock_threshold')` excludes materials for which no threshold has been set.

`adjustQuantity` uses `max(0, ...)` to ensure stock never goes negative — a business rule constraint that lives in the model rather than in the controller or request.

`isLowStock` checks the instance state without hitting the database, suitable for conditional rendering after an adjust operation or in a policy check.

### 3.2 `app/Http/Controllers/MaterialController.php`

Replace the existing import:

```php
use Illuminate\Http\Request;
```

with:

```php
use App\Http\Requests\AdjustStockRequest;
use Illuminate\Http\Request;
```

(The plain `Request` import is retained because the existing `store` and `update` stubs still reference it. Only `adjustStock`'s signature changes.)

Replace the stub method body:

```php
public function adjustStock(Request $request, Material $material): RedirectResponse
{
    return redirect()->back();
}
```

with:

```php
public function adjustStock(AdjustStockRequest $request, Material $material): RedirectResponse
{
    $data = $request->validated();
    $delta = (float) $data['quantity'];
    $material->adjustQuantity($delta);
    $direction = $delta >= 0 ? 'Added' : 'Removed';
    $abs = abs($delta);
    $unitLabel = $material->unit->label();
    $after = $material->quantity_on_hand;
    $message = "{$direction} {$abs} {$unitLabel} — stock now: {$after}";
    if (!empty($data['notes'])) {
        $message .= " ({$data['notes']})";
    }
    return redirect()->route('materials.show', $material)->with('success', $message);
}
```

Note: `$material->quantity_on_hand` is read *after* `adjustQuantity()` has called `save()`, so it reflects the updated database value.

---

## 4. Decisions and Rationale

### Decision 1: Keep business logic in the model (`adjustQuantity`)

The governance rules mandate "fat models, thin controllers." The `max(0, ...)` floor is a business rule: stock cannot go negative. Placing it in `adjustQuantity()` on the model ensures any future caller (a queued job, an Artisan command, another controller) cannot accidentally produce negative stock by calling the model directly.

### Decision 2: `adjustQuantity` uses `$this->save()` not `$this->update()`

`$this->update(['quantity_on_hand' => ...])` goes through mass-assignment filtering. Since `quantity_on_hand` is already in `$fillable` this would work, but using direct property assignment + `save()` is more explicit and avoids re-filtering. It also makes the intent clear: this is a targeted save of a computed value, not a user-supplied mass-assignment.

### Decision 3: `scopeLowStock` uses `whereColumn` not a PHP-side filter

`whereColumn('quantity_on_hand', '<=', 'low_stock_threshold')` lets MySQL do the comparison in a single query without fetching all rows. This is important for the future dashboard widget or inventory report that will list low-stock items. A PHP-side filter (e.g., `->get()->filter(fn($m) => $m->isLowStock())`) would load the full materials table into memory.

### Decision 4: Flash message built in the controller, not the model

The message string is UI-layer concern — it combines a business value (the delta and new quantity) with a human-readable unit label. The model's `adjustQuantity()` returns `void` and has no knowledge of the HTTP layer. The controller constructs the string from public model attributes and the `MaterialUnit::label()` enum method after the save completes.

### Decision 5: `AdjustStockRequest` already exists — no new form request needed

`app/Http/Requests/AdjustStockRequest.php` is already in place with correct rules (`quantity` required numeric, `notes` nullable string). The controller stub accepted `Request $request` — the only change required is swapping the type-hint to `AdjustStockRequest`.

### Decision 6: Redirect to `materials.show`, not `redirect()->back()`

The stub uses `redirect()->back()`. The task spec redirects to `materials.show` with the material as the route parameter. Route model binding on the `materials` resource uses the model's ULID (`{material}` key). Passing the `$material` instance to `redirect()->route('materials.show', $material)` lets Laravel resolve the ULID automatically via the model's route key (`getRouteKey()`).

---

## 5. Verified Dependencies

| Requirement | Status |
|-------------|--------|
| `Material` model at `app/Models/Material.php` | Confirmed — file read, class exists |
| `HasUlids`, `SoftDeletes`, `Searchable` traits on `Material` | Confirmed in model file |
| `quantity_on_hand` in `$fillable` | Confirmed — line 26 of the model |
| `low_stock_threshold` column on `materials` table | Confirmed — `decimal(10,2)` nullable in migration `2026_03_03_000006_create_materials_table.php` |
| `quantity_on_hand` column on `materials` table | Confirmed — `decimal(10,2)` default 0, indexed |
| `unit` cast to `MaterialUnit` enum | Confirmed — `casts()` method returns `['unit' => MaterialUnit::class]` |
| `MaterialUnit::label()` method | Confirmed — all 14 cases covered in `app/Enums/MaterialUnit.php` |
| `AdjustStockRequest` exists with correct rules | Confirmed — `app/Http/Requests/AdjustStockRequest.php` validates `quantity` (required, numeric) and `notes` (nullable, string) |
| Route `materials.adjust-stock` — `POST /materials/{material}/adjust` | Confirmed in `routes/web.php` line 45, resolves to `MaterialController@adjustStock` |
| Route `materials.show` named route | Confirmed — `Route::resource('materials', MaterialController::class)` generates `materials.show` |
| `MaterialController::adjustStock` stub exists | Confirmed — current stub at line 43–46 accepts `Request $request`, returns `redirect()->back()` |
| `MaterialFactory` with `quantity_on_hand` and `low_stock_threshold` | Confirmed — factory generates random float for quantity, null for threshold |
| `MaterialControllerTest` uses `RefreshDatabase` and `Material::factory()` | Confirmed — existing test file at `tests/Feature/MaterialControllerTest.php` |
| `Illuminate\Database\Eloquent\Builder` — available for type-hint in scope | Confirmed — standard Laravel Eloquent; no package install required |

---

## 6. Risks and Mitigations

### Risk 1: Floating-point precision in `quantity_on_hand` after `adjustQuantity`

**Risk:** The database column is `decimal(10,2)`. PHP's `float` type can introduce rounding errors (e.g., `10.1 + 0.2 = 10.299999...`). After `adjustQuantity`, `$material->quantity_on_hand` will reflect whatever PHP computed before the save. MySQL will round the stored value to two decimal places on write, but the value read back within the same request cycle (for the flash message) is the PHP float value, which may not match the stored DB value.

**Mitigation:** For the flash message, the discrepancy (if any) is cosmetic and sub-cent in magnitude. The stored value in MySQL is always correctly rounded. If precise display is needed, the implementer may apply `round($this->quantity_on_hand + $delta, 2)` inside `adjustQuantity`. The task spec does not require this — accept the risk as low severity.

### Risk 2: Race condition on concurrent adjustments

**Risk:** Two simultaneous POST requests to `materials/{material}/adjust` both read `quantity_on_hand`, compute the delta, and write back. One update will silently overwrite the other.

**Mitigation:** Out of scope for this task (single-user tool per CLAUDE.md: "solo woodworker"). Not addressed here. If concurrent access becomes a concern, a future task could wrap `adjustQuantity` in a `DB::transaction` with a pessimistic lock (`lockForUpdate()`).

### Risk 3: `$material->quantity_on_hand` in the flash message is the pre-save PHP value

**Risk:** `$material->save()` persists to the database. Reading `$material->quantity_on_hand` immediately after is the in-memory property, not a fresh DB read. If MySQL rounds the decimal differently from PHP, the flash message shows the PHP value.

**Mitigation:** The difference is at most 0.005 units (sub-penny rounding). The flash message is informational only, not used for financial calculations. Accepted as-is per spec.

### Risk 4: `scopeLowStock` does not account for soft-deleted records

**Risk:** `scopeLowStock` uses `whereNotNull` + `whereColumn` but does not add `whereNull('deleted_at')`. Without the global soft-delete scope, soft-deleted materials could appear as low-stock.

**Mitigation:** `Material` uses `SoftDeletes`, which applies a global scope automatically. Any Eloquent query builder on the `Material` model already excludes soft-deleted rows unless `->withTrashed()` is explicitly called. `scopeLowStock` is always chained on the `Material` query builder, so soft-deleted records are excluded by the global scope before `scopeLowStock` runs.

---

## 7. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| `scopeLowStock` added to `Material` model | Added as `public function scopeLowStock(Builder $query): Builder` — callable as `Material::query()->lowStock()` |
| Scope filters to rows where `quantity_on_hand <= low_stock_threshold` and threshold is not null | `whereNotNull('low_stock_threshold')->whereColumn('quantity_on_hand', '<=', 'low_stock_threshold')` |
| `isLowStock()` added to `Material` model | Added as `public function isLowStock(): bool` — checks instance state without a DB call |
| `adjustQuantity(float $delta)` added to `Material` model | Added as `public function adjustQuantity(float $delta): void` — floors at 0, persists with `save()` |
| `adjustStock` controller uses `AdjustStockRequest` (not plain `Request`) | Type-hint changed to `AdjustStockRequest $request` — Laravel fires validation before the method body runs |
| No validation logic in the controller | All validation rules remain in `AdjustStockRequest::rules()` — controller only calls `$request->validated()` |
| Delta applied via model method, not inline in controller | Controller calls `$material->adjustQuantity($delta)` — no arithmetic in the controller |
| Flash message includes direction, absolute quantity, unit label, new stock level, and optional notes | Message string built from `$direction`, `$abs`, `$unitLabel`, `$after`, and `$data['notes']` |
| Redirect goes to `materials.show` with the material | `redirect()->route('materials.show', $material)->with('success', $message)` |
| Stock cannot go below zero | `max(0, ...)` in `adjustQuantity` enforces the floor at the model level |
