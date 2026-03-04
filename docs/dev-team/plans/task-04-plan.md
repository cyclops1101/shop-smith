# Task 04: Notes and Material Attachment Backend — Implementation Plan

**Task ID:** 04
**Domain:** backend
**Scope:** Implement `ProjectController::addNote()` and `ProjectController::attachMaterial()`

---

## 1. Approach

Both methods are currently stubs returning `redirect()->back()` with no logic. The implementation replaces each stub with real persistence code by wiring the correct form request type-hints and interacting with the existing `ProjectNote` model and the `project_materials` BelongsToMany pivot.

No new files are needed. No migrations, no new models, no new request classes, and no frontend changes are required for this task.

The single file to modify is `app/Http/Controllers/ProjectController.php`.

---

## 2. Files to Modify

| File | Action |
|---|---|
| `app/Http/Controllers/ProjectController.php` | Replace two stubs with real implementations; add three new `use` imports |

No other files need changes.

---

## 3. Existing Code Inventory

### `ProjectController.php` — current state

```php
// addNote stub (line 69)
public function addNote(Request $request, Project $project): RedirectResponse
{
    return redirect()->back();
}

// attachMaterial stub (line 64)
public function attachMaterial(Request $request, Project $project): RedirectResponse
{
    return redirect()->back();
}
```

Current imports include `Illuminate\Http\Request` but do not include `AddNoteRequest`, `AttachMaterialRequest`, or `Material`.

### `AddNoteRequest.php` — already complete

```php
public function rules(): array
{
    return [
        'content' => ['required', 'string'],
    ];
}
```

### `AttachMaterialRequest.php` — already complete

```php
public function rules(): array
{
    return [
        'material_id'   => ['required', 'ulid', Rule::exists('materials', 'id')],
        'quantity_used' => ['required', 'numeric', 'min:0.01'],
        'notes'         => ['nullable', 'string', 'max:255'],
    ];
}
```

### `ProjectNote.php` — already complete

- Extends `Model`, uses `HasFactory`, `HasUlids`
- `$fillable`: `['project_id', 'content']`
- `project()` BelongsTo relationship defined

### `ProjectMaterial.php` — already complete

- Extends `Pivot`, uses `HasFactory`, `HasUlids`
- `const UPDATED_AT = null`
- `$fillable`: `['project_id', 'material_id', 'quantity_used', 'cost_at_time', 'notes']`

### `Project.php` — relevant relationships already defined

```php
public function notes(): HasMany
{
    return $this->hasMany(ProjectNote::class);
}

public function materials(): BelongsToMany
{
    return $this->belongsToMany(Material::class, 'project_materials')
        ->using(ProjectMaterial::class)
        ->withPivot(['quantity_used', 'cost_at_time', 'notes']);
}
```

### `Material.php` — relevant field

`unit_cost` is declared in `$fillable`. It is stored as `decimal(10,2)` (nullable). PHP/PDO returns decimal columns as strings.

---

## 4. Implementation

### 4.1 New imports to add to `ProjectController.php`

```php
use App\Http\Requests\AddNoteRequest;
use App\Http\Requests\AttachMaterialRequest;
use App\Models\Material;
```

`Illuminate\Http\Request` should remain because other stub methods in the controller still use it.

### 4.2 `addNote()` — full implementation

Replace:

```php
public function addNote(Request $request, Project $project): RedirectResponse
{
    return redirect()->back();
}
```

With:

```php
public function addNote(AddNoteRequest $request, Project $project): RedirectResponse
{
    $project->notes()->create([
        'content' => $request->validated('content'),
    ]);

    return redirect()->back()->with('success', 'Note added.');
}
```

**How it works:**

- `AddNoteRequest` replaces the generic `Request` type-hint. Laravel automatically validates the request before the method body runs; invalid requests redirect with errors before reaching this code.
- `$project->notes()` is the `HasMany` relationship on `Project`. Calling `->create()` on it automatically sets `project_id = $project->id` on the new `ProjectNote` record.
- `HasUlids` on `ProjectNote` auto-generates the ULID `id` during the `creating` event. Do not pass `id` into the `create()` call.
- The flash key `'success'` is a convention that the frontend can read from the shared Inertia props.

### 4.3 `attachMaterial()` — full implementation

Replace:

```php
public function attachMaterial(Request $request, Project $project): RedirectResponse
{
    return redirect()->back();
}
```

With:

```php
public function attachMaterial(AttachMaterialRequest $request, Project $project): RedirectResponse
{
    $data     = $request->validated();
    $material = Material::findOrFail($data['material_id']);

    $costAtTime = $material->unit_cost !== null
        ? round($material->unit_cost * $data['quantity_used'], 2)
        : null;

    $pivotData = [
        'quantity_used' => $data['quantity_used'],
        'cost_at_time'  => $costAtTime,
        'notes'         => $data['notes'] ?? null,
    ];

    $alreadyAttached = $project->materials()
        ->where('material_id', $material->id)
        ->exists();

    if ($alreadyAttached) {
        $project->materials()->updateExistingPivot($material->id, $pivotData);
    } else {
        $project->materials()->attach($material->id, $pivotData);
    }

    return redirect()->back()->with('success', 'Material attached.');
}
```

**Step-by-step explanation:**

1. `$request->validated()` returns the validated array: `material_id`, `quantity_used`, `notes`. The request's `Rule::exists('materials', 'id')` rule already confirms the material exists (and is not soft-deleted), so `findOrFail` will always succeed — it is kept here for defensive retrieval of the full model object.

2. `cost_at_time` computation:
   - `$material->unit_cost` is a nullable `decimal(10,2)` column. PHP/PDO returns it as a string (e.g., `"12.50"`) or `null`.
   - A strict `!== null` check is used rather than a truthy check. This ensures that a `unit_cost` of `"0.00"` is treated as zero (not null) and correctly computes `cost_at_time = 0`.
   - `round(..., 2)` keeps the result at two decimal places, consistent with `decimal(10,2)` storage. PHP string * PHP numeric yields a float, which is safe to round before storing.
   - If `unit_cost` is null, `cost_at_time` is stored as `null`.

3. Pivot payload `$pivotData` does **not** include `id`. `HasUlids` on `ProjectMaterial` hooks into the `creating` Eloquent event, which fires during `attach()`. The ULID `id` is generated automatically. `updateExistingPivot()` does not create a new row, so `HasUlids` does not fire and the existing `id` is untouched.

4. Attach vs. update logic:
   - `$project->materials()->where('material_id', $material->id)->exists()` queries the `project_materials` pivot table for a row matching both `project_id` (scoped by the relationship) and `material_id`. Returns a boolean.
   - If false (first time): `attach($material->id, $pivotData)` inserts a new pivot row. Laravel's BelongsToMany `attach()` sets `project_id` automatically from the relationship scope.
   - If true (already attached): `updateExistingPivot($material->id, $pivotData)` issues an `UPDATE` on the existing pivot row, replacing `quantity_used`, `cost_at_time`, and `notes` with the new values.
   - `UPDATED_AT = null` on `ProjectMaterial` means no `updated_at` column exists in the table. `updateExistingPivot()` respects this because it uses the pivot model's `UPDATED_AT` constant — it will not attempt to write an `updated_at` value.

5. The flash key `'success'` signals the frontend that the operation completed successfully.

---

## 5. Final Controller Method Block (for reference)

After applying both changes, the two methods in `ProjectController` look like this:

```php
public function attachMaterial(AttachMaterialRequest $request, Project $project): RedirectResponse
{
    $data     = $request->validated();
    $material = Material::findOrFail($data['material_id']);

    $costAtTime = $material->unit_cost !== null
        ? round($material->unit_cost * $data['quantity_used'], 2)
        : null;

    $pivotData = [
        'quantity_used' => $data['quantity_used'],
        'cost_at_time'  => $costAtTime,
        'notes'         => $data['notes'] ?? null,
    ];

    $alreadyAttached = $project->materials()
        ->where('material_id', $material->id)
        ->exists();

    if ($alreadyAttached) {
        $project->materials()->updateExistingPivot($material->id, $pivotData);
    } else {
        $project->materials()->attach($material->id, $pivotData);
    }

    return redirect()->back()->with('success', 'Material attached.');
}

public function addNote(AddNoteRequest $request, Project $project): RedirectResponse
{
    $project->notes()->create([
        'content' => $request->validated('content'),
    ]);

    return redirect()->back()->with('success', 'Note added.');
}
```

And the imports block gains three lines:

```php
use App\Http\Requests\AddNoteRequest;
use App\Http\Requests\AttachMaterialRequest;
use App\Models\Material;
```

---

## 6. Edge Cases and Constraints

### `HasUlids` on `ProjectMaterial` (Pivot)

`ProjectMaterial` extends `Pivot` and uses `HasUlids`. Laravel's `attach()` internally calls `newPivot()` followed by `save()`, which fires the standard Eloquent model events including `creating`. `HasUlids` boots via `static::creating()` and calls `$model->setAttribute($model->getKeyName(), $model->newUniqueId())` — this auto-populates the `id` column before the INSERT. No manual `id` assignment is needed in `$pivotData` and none must be made.

`updateExistingPivot()` issues a direct `UPDATE` query via the pivot query builder — it does not instantiate a new model or fire `creating`, so `HasUlids` does not fire and the existing `id` stays intact.

### `UPDATED_AT = null` on `ProjectMaterial`

`ProjectMaterial` declares `const UPDATED_AT = null`. When `updateExistingPivot()` builds its `UPDATE` statement, it checks `$this->using` (which resolves to `ProjectMaterial`) and respects the `UPDATED_AT` constant. No `updated_at` value is included in the `UPDATE`. The `project_materials` table therefore does not need an `updated_at` column.

### Nullable `unit_cost`

`Material::unit_cost` is nullable in the schema. The computation uses a strict `!== null` check rather than `!empty()` or a truthy check, to correctly handle the edge case of a material with `unit_cost = 0.00`.

### Validation already prevents bad `material_id`

`AttachMaterialRequest` applies `Rule::exists('materials', 'id')`, which only matches non-soft-deleted rows. If a soft-deleted material ID is passed, validation fails before the controller body runs. The `Material::findOrFail()` call is therefore guaranteed to succeed and is included purely for ORM model retrieval, not as a secondary validation gate.

### Route model binding for `$project`

`Project::getRouteKeyName()` returns `'slug'`. The route `/projects/{project}/materials` (POST) binds `{project}` via slug. This is already configured and requires no changes.

---

## 7. Testing Guidance

Feature tests should cover the following scenarios:

### `addNote` tests

| Scenario | Expected outcome |
|---|---|
| Unauthenticated POST to `/projects/{slug}/notes` | Redirects to login |
| Valid `content` submitted by authenticated user | `ProjectNote` created with correct `project_id` and `content`; response redirects back with `session('success')` set |
| Missing `content` field | Validation error returned (redirect back with errors); no `ProjectNote` created |
| Empty string `content` | Validation error (required rule fails); no `ProjectNote` created |

### `attachMaterial` tests

| Scenario | Expected outcome |
|---|---|
| Unauthenticated POST to `/projects/{slug}/materials` | Redirects to login |
| Valid payload, material not yet attached | New pivot row in `project_materials`; `quantity_used`, `cost_at_time`, and `notes` stored correctly |
| Valid payload, material already attached | Existing pivot row updated; no duplicate row created |
| `unit_cost` is null on material | `cost_at_time` stored as null |
| `unit_cost` is `0.00` on material | `cost_at_time` stored as `0.00` (not null) |
| `quantity_used` = `0` or negative | Validation error; no pivot row created |
| Non-existent `material_id` | Validation error (exists rule fails); no pivot row created |
| `notes` omitted from payload | `notes` column stored as null |

---

## 8. Acceptance Criteria Checklist

| Criterion | Implementation detail |
|---|---|
| `addNote()` uses `AddNoteRequest` | Type-hint changed from `Request` to `AddNoteRequest` |
| Creates `ProjectNote` with `project_id` and `content` | `$project->notes()->create(['content' => ...])` sets `project_id` via relationship scope |
| Redirects back with flash | `redirect()->back()->with('success', 'Note added.')` |
| `attachMaterial()` uses `AttachMaterialRequest` | Type-hint changed from `Request` to `AttachMaterialRequest` |
| Attaches if not yet attached | `attach($material->id, $pivotData)` branch when `exists()` returns false |
| Updates pivot if already attached | `updateExistingPivot($material->id, $pivotData)` branch when `exists()` returns true |
| `cost_at_time` = `unit_cost * quantity_used` | Computed as `round($material->unit_cost * $data['quantity_used'], 2)` |
| `cost_at_time` = null when `unit_cost` is null | Strict `!== null` check before multiplication |
| Do not manually set `id` on `ProjectNote` or `ProjectMaterial` | `HasUlids` auto-generates both; `id` is absent from all `create()` and `attach()` payloads |
