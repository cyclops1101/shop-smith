# Task 04 Implementation Plan — Eloquent Models with Relationships, Casts, and Traits

**Task ID:** 04
**Domain:** backend
**Parallel Group:** 3 (depends on Tasks 02 and 03)
**Complexity:** high

---

## 1. Approach

Create all 17 Eloquent model classes under `app/Models/`. Each model is defined once and completely — no stub-then-replace pattern. The work is mechanical but must be precise: wrong relationship names or cast types cause runtime failures in all downstream tasks (factories, controllers, tests).

The implementation order follows foreign key dependencies so each model can reference its related classes without circular import confusion:

1. Leaf models (no FK dependencies): `Tag`, `MaterialCategory`, `ToolCategory`, `Supplier`
2. Mid-tier models: `Project`, `Material`, `Tool`
3. Dependent models: `ProjectPhoto`, `ProjectNote`, `TimeEntry`, `ProjectMaterial`, `MaintenanceSchedule`, `MaintenanceLog`, `Expense`, `Revenue`, `CutListBoard`, `CutListPiece`

The `ProjectMaterial` model is the only one that extends `Pivot` instead of `Model` — this is required by Laravel for pivot models used in `belongsToMany` with `->withPivot()` or `->using()`.

The three searchable models (`Project`, `Material`, `Tool`) include the `Laravel\Scout\Searchable` trait and a `toSearchableArray()` method. Scout configuration is handled separately in Task 12, but the trait must be present in these models now so Task 12's configuration work is non-breaking.

---

## 2. Files to Create/Modify

All files are new creates. No existing files are modified by this task (Task 12 adds `toSearchableArray()` to existing models, but the trait inclusion here is a one-time setup).

| File | Action |
|------|--------|
| `app/Models/Tag.php` | Create |
| `app/Models/MaterialCategory.php` | Create |
| `app/Models/ToolCategory.php` | Create |
| `app/Models/Supplier.php` | Create |
| `app/Models/Project.php` | Create |
| `app/Models/Material.php` | Create |
| `app/Models/Tool.php` | Create |
| `app/Models/ProjectPhoto.php` | Create |
| `app/Models/ProjectNote.php` | Create |
| `app/Models/TimeEntry.php` | Create |
| `app/Models/ProjectMaterial.php` | Create |
| `app/Models/MaintenanceSchedule.php` | Create |
| `app/Models/MaintenanceLog.php` | Create |
| `app/Models/Expense.php` | Create |
| `app/Models/Revenue.php` | Create |
| `app/Models/CutListBoard.php` | Create |
| `app/Models/CutListPiece.php` | Create |

**Total: 17 new files**

---

## 3. Key Decisions

### Decision 1: HasUlids on every model including ProjectMaterial

`Illuminate\Database\Eloquent\Concerns\HasUlids` overrides `newUniqueId()` to return a ULID string and sets `$incrementing = false` with `$keyType = 'string'`. Even `ProjectMaterial` (which extends `Pivot`) needs `HasUlids` because the `project_materials` table has a `ulid('id')->primary()` column per Task 03 migrations.

When using `HasUlids` on a Pivot model, the trait must come after the class declaration. Laravel's `Pivot` base class already sets `$incrementing = false`, so the ULID trait's key generation is all that is added.

### Decision 2: SoftDeletes only on Project, Material, Tool

Only these three models have `deleted_at` columns (per spec and Task 03 migrations). Adding `SoftDeletes` to any other model will cause a database error (`Column not found: deleted_at`). This is explicitly documented per model below.

### Decision 3: Project slug auto-generation in booted()

The `booted()` static method on `Project` registers a `creating` observer callback. On every new record creation, if `slug` is not already set, it generates a unique slug from `title` using `Str::slug()` with a uniqueness loop.

```php
protected static function booted(): void
{
    static::creating(function (Project $project) {
        if (empty($project->slug)) {
            $base = Str::slug($project->title);
            $slug = $base;
            $i = 1;
            while (static::withTrashed()->where('slug', $slug)->exists()) {
                $slug = "{$base}-{$i}";
                $i++;
            }
            $project->slug = $slug;
        }
    });
}
```

`withTrashed()` is used in the uniqueness check so that soft-deleted project slugs are not recycled. This prevents a deleted project's slug from colliding with a new one if the user tries to reuse the same title.

The `updating` event does NOT regenerate the slug — slugs are stable identifiers. If a user renames a project, the slug stays the same. This is the standard behavior for URL slugs.

### Decision 4: getRouteKeyName() on Project only

Only `Project` returns `'slug'` from `getRouteKeyName()`. All other models use the default (`'id'`), which resolves by ULID. This matches the CLAUDE.md convention: "Route model binding with slug for projects, ULID for other models."

### Decision 5: Enum casts use the full enum class path

`$casts` entries for enum columns use the fully-qualified class name string: `'status' => ProjectStatus::class`. Laravel 12 resolves these to backed enum instances automatically. The enum classes are created by Task 02 — this task depends on Task 02 being complete before implementation.

### Decision 6: Decimal columns are NOT cast in $casts

Laravel's `decimal` cast is for formatting output. The database already stores them as `decimal(10,2)`, which PHP retrieves as a string (MySQL returns decimals as strings via PDO). Casting to `'decimal:2'` in `$casts` adds unnecessary processing and can cause float precision issues. Money columns are left as strings in PHP — formatted only at the presentation layer. Exception: if a calculated accessor is needed, it casts inline at that point.

### Decision 7: ProjectMaterial extends Pivot, not Model

When `Project` defines `belongsToMany(Material::class, 'project_materials')->using(ProjectMaterial::class)`, Laravel expects the pivot model to extend `Illuminate\Database\Eloquent\Relations\Pivot`. Using a plain `Model` subclass here would break pivot operations (e.g., syncing, attaching). The `HasUlids` trait still applies.

### Decision 8: Searchable trait included but toSearchableArray() is minimal

`Project`, `Material`, and `Tool` include `Laravel\Scout\Searchable`. Task 12 adds the full `toSearchableArray()` implementations. For now, each of these three models includes a stub `toSearchableArray()` that returns `$this->toArray()` — this is safe and correct for the database Scout driver until Task 12 refines it. If Scout is not yet installed when Task 04 runs, the `use Laravel\Scout\Searchable` line will cause a class-not-found error. The implementing agent must check whether `laravel/scout` is in `composer.json` and install it if needed (`composer require laravel/scout`).

### Decision 9: Nullable belongsTo uses withDefault(null) for safety

For nullable foreign keys (e.g., `Expense::project()`, `Material::supplier()`), the relationship method returns `null` by default when the FK is `null`. No `withDefault()` call is needed — Laravel returns `null` naturally for nullable belongsTo when the FK column is null. The implementing agent should NOT use `withDefault()` here as it would return an empty model instead of `null`, which would break null-checks in views.

### Decision 10: Tag morphedByMany uses 'taggable' morph name

The `Tag` model defines three `morphedByMany` relationships — one each for `Project`, `Material`, and `Tool`. The morph name is `'taggable'` in all three cases, matching the `taggables` pivot table's `taggable_type` / `taggable_id` columns created in Task 03.

```php
// In Tag.php
public function projects(): MorphToMany
{
    return $this->morphedByMany(Project::class, 'taggable');
}

public function materials(): MorphToMany
{
    return $this->morphedByMany(Material::class, 'taggable');
}

public function tools(): MorphToMany
{
    return $this->morphedByMany(Tool::class, 'taggable');
}
```

And in `Project`, `Material`, `Tool`:
```php
public function tags(): MorphToMany
{
    return $this->morphToMany(Tag::class, 'taggable');
}
```

---

## 4. Complete Model Specifications

### Tag.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Tag extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'color',
    ];

    public function projects(): MorphToMany
    {
        return $this->morphedByMany(Project::class, 'taggable');
    }

    public function materials(): MorphToMany
    {
        return $this->morphedByMany(Material::class, 'taggable');
    }

    public function tools(): MorphToMany
    {
        return $this->morphedByMany(Tool::class, 'taggable');
    }
}
```

Note: `tags` table has no `created_at`/`updated_at` columns per schema, so `$timestamps = false`.

---

### MaterialCategory.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaterialCategory extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'sort_order',
    ];

    public function materials(): HasMany
    {
        return $this->hasMany(Material::class, 'category_id');
    }
}
```

Note: `material_categories` has no `created_at`/`updated_at` per schema, so `$timestamps = false`.

---

### ToolCategory.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ToolCategory extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'sort_order',
    ];

    public function tools(): HasMany
    {
        return $this->hasMany(Tool::class, 'category_id');
    }
}
```

---

### Supplier.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasUlids;

    protected $fillable = [
        'name',
        'contact_name',
        'phone',
        'email',
        'website',
        'address',
        'notes',
    ];

    public function materials(): HasMany
    {
        return $this->hasMany(Material::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
```

---

### Project.php

```php
<?php

namespace App\Models;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class Project extends Model
{
    use HasUlids, SoftDeletes, Searchable;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'status',
        'priority',
        'estimated_hours',
        'estimated_cost',
        'actual_cost',
        'sell_price',
        'started_at',
        'completed_at',
        'deadline',
        'notes',
        'is_commission',
        'client_name',
        'client_contact',
    ];

    protected $casts = [
        'status'       => ProjectStatus::class,
        'priority'     => ProjectPriority::class,
        'is_commission' => 'boolean',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
        'deadline'     => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            if (empty($project->slug)) {
                $base = Str::slug($project->title);
                $slug = $base;
                $i = 1;
                while (static::withTrashed()->where('slug', $slug)->exists()) {
                    $slug = "{$base}-{$i}";
                    $i++;
                }
                $project->slug = $slug;
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function toSearchableArray(): array
    {
        return $this->toArray();
    }

    // Relationships
    public function photos(): HasMany
    {
        return $this->hasMany(ProjectPhoto::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(ProjectNote::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function projectMaterials(): HasMany
    {
        return $this->hasMany(ProjectMaterial::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    public function cutListBoards(): HasMany
    {
        return $this->hasMany(CutListBoard::class);
    }

    public function cutListPieces(): HasMany
    {
        return $this->hasMany(CutListPiece::class);
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class, 'project_materials')
                    ->using(ProjectMaterial::class)
                    ->withPivot(['quantity_used', 'cost_at_time', 'notes'])
                    ->withTimestamps();
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

---

### Material.php

```php
<?php

namespace App\Models;

use App\Enums\MaterialUnit;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Material extends Model
{
    use HasUlids, SoftDeletes, Searchable;

    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'description',
        'unit',
        'quantity_on_hand',
        'low_stock_threshold',
        'unit_cost',
        'supplier_id',
        'location',
        'notes',
    ];

    protected $casts = [
        'unit' => MaterialUnit::class,
    ];

    public function toSearchableArray(): array
    {
        return $this->toArray();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MaterialCategory::class, 'category_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function projectMaterials(): HasMany
    {
        return $this->hasMany(ProjectMaterial::class);
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_materials')
                    ->using(ProjectMaterial::class)
                    ->withPivot(['quantity_used', 'cost_at_time', 'notes'])
                    ->withTimestamps();
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

---

### Tool.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Tool extends Model
{
    use HasUlids, SoftDeletes, Searchable;

    protected $fillable = [
        'category_id',
        'name',
        'brand',
        'model_number',
        'serial_number',
        'purchase_date',
        'purchase_price',
        'warranty_expires',
        'location',
        'manual_url',
        'notes',
        'total_usage_hours',
    ];

    protected $casts = [
        'purchase_date'    => 'date',
        'warranty_expires' => 'date',
    ];

    public function toSearchableArray(): array
    {
        return $this->toArray();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ToolCategory::class, 'category_id');
    }

    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

---

### ProjectPhoto.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectPhoto extends Model
{
    use HasUlids;

    public $timestamps = false; // only has created_at, no updated_at per schema

    // Note: schema shows only created_at. If migration uses timestamps(), add updated_at to fillable.
    // If migration uses $table->timestamp('created_at'), set CREATED_AT and no updated_at.
    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'file_path',
        'thumbnail_path',
        'caption',
        'taken_at',
        'sort_order',
        'is_portfolio',
    ];

    protected $casts = [
        'taken_at'     => 'datetime',
        'is_portfolio' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
```

---

### ProjectNote.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectNote extends Model
{
    use HasUlids;

    protected $fillable = [
        'project_id',
        'content',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
```

---

### TimeEntry.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    use HasUlids;

    public $timestamps = false; // only created_at per schema
    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'description',
        'started_at',
        'ended_at',
        'duration_minutes',
    ];

    protected $casts = [
        'started_at'       => 'datetime',
        'ended_at'         => 'datetime',
        'duration_minutes' => 'integer',
        'created_at'       => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
```

---

### ProjectMaterial.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectMaterial extends Pivot
{
    use HasUlids;

    public $timestamps = false; // only created_at per schema
    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'material_id',
        'quantity_used',
        'cost_at_time',
        'notes',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
```

---

### MaintenanceSchedule.php

```php
<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceSchedule extends Model
{
    use HasUlids;

    protected $fillable = [
        'tool_id',
        'task',
        'maintenance_type',
        'interval_hours',
        'interval_days',
        'last_performed_at',
        'next_due_at',
        'notes',
    ];

    protected $casts = [
        'maintenance_type'  => MaintenanceType::class,
        'last_performed_at' => 'datetime',
        'next_due_at'       => 'datetime',
    ];

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

### MaintenanceLog.php

```php
<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceLog extends Model
{
    use HasUlids;

    public $timestamps = false; // only created_at per schema
    const UPDATED_AT = null;

    protected $fillable = [
        'tool_id',
        'schedule_id',
        'maintenance_type',
        'description',
        'cost',
        'performed_at',
        'usage_hours_at',
    ];

    protected $casts = [
        'maintenance_type' => MaintenanceType::class,
        'performed_at'     => 'datetime',
    ];

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(MaintenanceSchedule::class, 'schedule_id');
    }
}
```

---

### Expense.php

```php
<?php

namespace App\Models;

use App\Enums\ExpenseCategory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasUlids;

    protected $fillable = [
        'project_id',
        'category',
        'description',
        'amount',
        'supplier_id',
        'receipt_path',
        'expense_date',
    ];

    protected $casts = [
        'category'     => ExpenseCategory::class,
        'expense_date' => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
```

---

### Revenue.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Revenue extends Model
{
    use HasUlids;

    protected $fillable = [
        'project_id',
        'description',
        'amount',
        'payment_method',
        'received_date',
        'client_name',
    ];

    protected $casts = [
        'received_date' => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
```

---

### CutListBoard.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CutListBoard extends Model
{
    use HasUlids;

    public $timestamps = false; // only created_at per schema
    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'material_id',
        'label',
        'length',
        'width',
        'thickness',
        'quantity',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
```

---

### CutListPiece.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CutListPiece extends Model
{
    use HasUlids;

    public $timestamps = false; // only created_at per schema
    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'label',
        'length',
        'width',
        'thickness',
        'quantity',
        'grain_direction',
    ];

    protected $casts = [
        'grain_direction' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
```

---

## 5. Verified Dependencies

| Dependency | Required By | Status |
|------------|-------------|--------|
| Task 02 — PHP Enum classes | `$casts` arrays reference `ProjectStatus::class`, `ProjectPriority::class`, `MaterialUnit::class`, `ExpenseCategory::class`, `MaintenanceType::class` | Must complete before Task 04 |
| Task 03 — Database migrations | `php artisan migrate` must have run; models reference table structures | Must complete before Task 04 |
| `laravel/scout` package | `Project`, `Material`, `Tool` use `Laravel\Scout\Searchable` | May need `composer require laravel/scout` if not already in `composer.json`. Check before writing models. |
| Laravel 12.53.0 | `HasUlids` trait (`Illuminate\Database\Eloquent\Concerns\HasUlids`) available since Laravel 9 | Confirmed installed |
| PHP 8.3.6 | PHP enums are used in `$casts`; requires PHP 8.1+ | Confirmed installed |

---

## 6. Risks

### Risk 1: laravel/scout not installed

The `Searchable` trait is from `laravel/scout`, which may not be in `composer.json` on a fresh install. If `use Laravel\Scout\Searchable` fails, PHP will throw a class-not-found error on any request.

**Mitigation:** Check `composer.json` for `laravel/scout` before writing the models. If absent, run `composer require laravel/scout` first. This does not conflict with Task 12 (Scout configuration) — Task 12 configures the driver and `toSearchableArray()`, while Task 04 only adds the trait.

### Risk 2: ProjectMaterial extends Pivot — HasUlids compatibility

`Pivot` has its own booting logic. `HasUlids` modifies `newUniqueId()` and `usesUniqueIds()`. These methods exist on `Model` (which `Pivot` extends), so they are available. However, if the `project_materials` migration used a regular primary key instead of `ulid('id')->primary()`, the `HasUlids` trait would generate ULIDs but the database column would be an integer — causing an insert error.

**Mitigation:** The Task 03 migration for `project_materials` must use `$table->ulid('id')->primary()`. Verify the migration before running `migrate:fresh`. If the migration used `$table->id()` by mistake, fix Task 03 first.

### Risk 3: Slug uniqueness check with soft-deleted projects

Using `static::withTrashed()->where('slug', $slug)->exists()` requires the `SoftDeletes` trait to be loaded when `booted()` runs. Since `SoftDeletes` is in the same class, this is fine. However, `withTrashed()` on a model without `SoftDeletes` would cause an error. If someone removes `SoftDeletes` from `Project` later, the `booted()` method must be updated.

**Mitigation:** Document in a code comment that `withTrashed()` requires `SoftDeletes` to be present on the model.

### Risk 4: $timestamps = false on models with only created_at

`ProjectPhoto`, `TimeEntry`, `ProjectMaterial`, `MaintenanceLog`, `CutListBoard`, `CutListPiece` have only `created_at` per the spec schema — no `updated_at`. Setting `$timestamps = false` and `const UPDATED_AT = null` with `const CREATED_AT = 'created_at'` is the correct pattern. If `$timestamps = false` is set without the const, Eloquent will not auto-fill `created_at` either.

**Mitigation:** Use `const UPDATED_AT = null` while leaving `$timestamps = true` OR use `$timestamps = false` and set `created_at` in `$fillable`. The preferred approach is `const UPDATED_AT = null` with `$timestamps = true` (the default) — this tells Eloquent to auto-set `created_at` but not touch `updated_at`. This is cleaner than `$timestamps = false`.

**Revised approach:** Use `const UPDATED_AT = null;` instead of `$timestamps = false`. This preserves auto-`created_at` management while skipping `updated_at`. The model code above shows `$timestamps = false` + `const UPDATED_AT = null` — change this to just `const UPDATED_AT = null;` and remove `$timestamps = false` in the actual implementation.

### Risk 5: Enum casting requires Task 02 to be complete

If Task 04 runs before Task 02, `ProjectStatus::class`, `ProjectPriority::class`, etc. will cause PHP errors (class not found). Task ordering (Group 3 depends on Group 2) prevents this in normal execution, but if the implementing agent runs tasks out of order, this will fail.

**Mitigation:** Check that `app/Enums/` contains all 5 enum files before creating model files.

### Risk 6: belongsToMany withTimestamps() on project_materials

The `project_materials` table has `created_at` but no `updated_at` per the spec. Calling `->withTimestamps()` on the `belongsToMany` relationship will try to set both `created_at` and `updated_at` on sync/attach operations. If `updated_at` does not exist in the table, this will throw a SQL error.

**Mitigation:** If the `project_materials` migration does not include `updated_at`, use `->withPivot(['created_at'])->withTimestamps()` carefully, or omit `->withTimestamps()` entirely and let `created_at` be set manually or via the `ProjectMaterial` pivot model's booted observer. The safest approach: check the Task 03 migration for `project_materials`. If it only has `$table->timestamp('created_at')`, remove `->withTimestamps()` from the relationship definition and handle `created_at` in `ProjectMaterial::booted()`.

---

## 7. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| All 17 model files exist under `app/Models/` | All 17 files listed in section 2 are created |
| All models use `HasUlids`; none use `$incrementing = true` with integers | `HasUlids` trait applied to all models; trait sets `$incrementing = false` and `$keyType = 'string'` automatically |
| `Project`, `Material`, `Tool` use `SoftDeletes` | `SoftDeletes` trait applied in those three model definitions |
| All enum columns cast to the correct Enum class | `$casts` arrays map every enum column to its PHP enum class (e.g., `'status' => ProjectStatus::class`) |
| `Project::getRouteKeyName()` returns `'slug'` | Implemented in `Project.php` as shown in section 4 |
| `Project` auto-generates a unique slug from title on create | `booted()` static hook with `creating` callback and uniqueness loop |
| `ProjectMaterial` extends `Pivot` | Class declaration: `class ProjectMaterial extends Pivot` |
| `Project`, `Material`, `Tool` use `Laravel\Scout\Searchable` | Trait applied to all three; stub `toSearchableArray()` returns `$this->toArray()` |
| `php artisan migrate:fresh` + tinker relationship calls throw no errors | All relationship methods are defined with correct foreign key column names matching Task 03 migration columns |
