# Task 08 Plan: Model Factories for All Models

## 1. Approach

Create Eloquent factory classes for all 17 application models under `database/factories/`. Each factory extends `Illuminate\Database\Eloquent\Factories\Factory` and implements `definition(): array` returning a realistic Faker-generated data array. All factories must work with both `make()` (no DB interaction) and `create()` (requires a migrated database).

Rules enforced across all factories:
- Enum columns: `fake()->randomElement(EnumClass::cases())->value` — draws a random enum case and returns its string backing value
- Money columns: `fake()->randomFloat(2, 10, 500)` — produces a positive float with 2 decimal places in the range [10, 500]
- `Project` factory must NOT set `slug` — the model's `booted()` observer (Task 04) auto-generates it
- Nullable FK columns default to `null` — FK relationships are expressed via factory states, not in `definition()`
- `Tag.color` must be a valid 7-character hex string

Also create `tests/Unit/FactoryTest.php` — a smoke test that calls `Model::factory()->make()` for every model to confirm the factory `definition()` returns valid data without touching the database.

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `database/factories/ProjectFactory.php` |
| Create | `database/factories/ProjectPhotoFactory.php` |
| Create | `database/factories/ProjectNoteFactory.php` |
| Create | `database/factories/TimeEntryFactory.php` |
| Create | `database/factories/MaterialFactory.php` |
| Create | `database/factories/MaterialCategoryFactory.php` |
| Create | `database/factories/ProjectMaterialFactory.php` |
| Create | `database/factories/SupplierFactory.php` |
| Create | `database/factories/ToolFactory.php` |
| Create | `database/factories/ToolCategoryFactory.php` |
| Create | `database/factories/MaintenanceScheduleFactory.php` |
| Create | `database/factories/MaintenanceLogFactory.php` |
| Create | `database/factories/ExpenseFactory.php` |
| Create | `database/factories/RevenueFactory.php` |
| Create | `database/factories/CutListBoardFactory.php` |
| Create | `database/factories/CutListPieceFactory.php` |
| Create | `database/factories/TagFactory.php` |
| Create | `tests/Unit/FactoryTest.php` |

## 3. Factory Definitions

### ProjectFactory

```php
use App\Enums\ProjectStatus;
use App\Enums\ProjectPriority;

public function definition(): array
{
    return [
        'title'           => fake()->sentence(3),
        // slug intentionally omitted — model generates it
        'description'     => fake()->optional(0.8)->paragraph(),
        'status'          => fake()->randomElement(ProjectStatus::cases())->value,
        'priority'        => fake()->randomElement(ProjectPriority::cases())->value,
        'estimated_hours' => fake()->optional(0.7)->randomFloat(2, 1, 200),
        'estimated_cost'  => fake()->optional(0.7)->randomFloat(2, 10, 500),
        'actual_cost'     => fake()->optional(0.5)->randomFloat(2, 10, 500),
        'sell_price'      => fake()->optional(0.4)->randomFloat(2, 10, 500),
        'started_at'      => fake()->optional(0.6)->dateTimeBetween('-1 year', 'now'),
        'completed_at'    => null,
        'deadline'        => fake()->optional(0.5)->dateTimeBetween('now', '+6 months'),
        'notes'           => fake()->optional(0.5)->paragraph(),
        'is_commission'   => fake()->boolean(20), // 20% chance of being a commission
        'client_name'     => null, // set in withCommission state
        'client_contact'  => null,
    ];
}

public function commission(): static
{
    return $this->state(fn (array $attributes) => [
        'is_commission'  => true,
        'client_name'    => fake()->name(),
        'client_contact' => fake()->email(),
    ]);
}

public function inProgress(): static
{
    return $this->state(fn (array $attributes) => [
        'status'     => ProjectStatus::InProgress->value,
        'started_at' => fake()->dateTimeBetween('-3 months', '-1 week'),
    ]);
}

public function completed(): static
{
    return $this->state(fn (array $attributes) => [
        'status'       => ProjectStatus::Completed->value,
        'completed_at' => fake()->dateTimeBetween('-6 months', 'now'),
    ]);
}
```

Key: `slug` is NOT in the definition. The `Project` model's `booted()` static method fires a `creating` observer that generates `slug` from `title` using `Str::slug()`. If `slug` were set in the factory, it would still be overwritten by the observer — but omitting it makes the intent clear and avoids confusion.

### ProjectPhotoFactory

```php
public function definition(): array
{
    return [
        'project_id'     => Project::factory(),
        'file_path'      => 'projects/' . fake()->uuid() . '/photos/' . fake()->uuid() . '.jpg',
        'thumbnail_path' => 'projects/' . fake()->uuid() . '/photos/thumb_' . fake()->uuid() . '.jpg',
        'caption'        => fake()->optional(0.6)->sentence(),
        'taken_at'       => fake()->optional(0.7)->dateTimeBetween('-1 year', 'now'),
        'sort_order'     => fake()->numberBetween(0, 20),
        'is_portfolio'   => fake()->boolean(30),
    ];
}
```

`project_id => Project::factory()` creates a new Project when calling `ProjectPhoto::factory()->create()`. To attach to an existing project, use `ProjectPhoto::factory()->for($project)->create()`.

### ProjectNoteFactory

```php
public function definition(): array
{
    return [
        'project_id' => Project::factory(),
        'content'    => fake()->paragraphs(2, true),
    ];
}
```

### TimeEntryFactory

```php
public function definition(): array
{
    $startedAt = fake()->dateTimeBetween('-6 months', '-1 hour');
    $endedAt   = fake()->optional(0.8)->dateTimeBetween($startedAt, 'now');

    return [
        'project_id'       => Project::factory(),
        'description'      => fake()->optional(0.6)->sentence(),
        'started_at'       => $startedAt,
        'ended_at'         => $endedAt,
        'duration_minutes' => $endedAt
            ? (int) ((new \DateTime($endedAt->format('Y-m-d H:i:s')))->getTimestamp() -
                     (new \DateTime($startedAt->format('Y-m-d H:i:s')))->getTimestamp()) / 60
            : null,
    ];
}

public function running(): static
{
    return $this->state(fn (array $attributes) => [
        'ended_at'         => null,
        'duration_minutes' => null,
    ]);
}
```

Note on `duration_minutes`: The model observer auto-computes this on `saving`. However, in tests that use `make()` (no DB), the observer does not fire. Setting `duration_minutes` in the factory ensures `make()` returns a complete object. When `create()` is used, the observer recomputes it — values stay consistent.

### MaterialCategoryFactory

```php
public function definition(): array
{
    $categories = ['Hardwood', 'Plywood', 'Softwood', 'Hardware', 'Finish', 'Sheet Goods', 'Adhesives'];

    return [
        'name'       => fake()->randomElement($categories) . ' ' . fake()->word(),
        'sort_order' => fake()->numberBetween(0, 10),
    ];
}
```

Using a domain-specific list mixed with faker prevents meaningless values like "Reprehenderit Category".

### MaterialFactory

```php
use App\Enums\MaterialUnit;

public function definition(): array
{
    return [
        'category_id'         => null, // use withCategory() state
        'name'                => fake()->words(3, true),
        'sku'                 => fake()->optional(0.6)->bothify('??-###-###'),
        'description'         => fake()->optional(0.5)->sentence(),
        'unit'                => fake()->randomElement(MaterialUnit::cases())->value,
        'quantity_on_hand'    => fake()->randomFloat(2, 0, 50),
        'low_stock_threshold' => fake()->optional(0.7)->randomFloat(2, 1, 10),
        'unit_cost'           => fake()->optional(0.8)->randomFloat(2, 10, 500),
        'supplier_id'         => null,
        'location'            => fake()->optional(0.6)->bothify('Rack ?, Shelf #'),
        'notes'               => fake()->optional(0.3)->sentence(),
    ];
}

public function withCategory(): static
{
    return $this->state(fn (array $attributes) => [
        'category_id' => MaterialCategory::factory(),
    ]);
}

public function withSupplier(): static
{
    return $this->state(fn (array $attributes) => [
        'supplier_id' => Supplier::factory(),
    ]);
}

public function lowStock(): static
{
    return $this->state(fn (array $attributes) => [
        'quantity_on_hand'    => fake()->randomFloat(2, 0, 2),
        'low_stock_threshold' => 5.0,
    ]);
}
```

### ProjectMaterialFactory

`ProjectMaterial` extends `Pivot` and represents the join between a project and a material. Its factory must create both parent models.

```php
public function definition(): array
{
    return [
        'project_id'    => Project::factory(),
        'material_id'   => Material::factory(),
        'quantity_used' => fake()->randomFloat(2, 0.5, 20),
        'cost_at_time'  => fake()->optional(0.7)->randomFloat(2, 10, 500),
        'notes'         => fake()->optional(0.3)->sentence(),
    ];
}
```

`ProjectMaterial::factory()->create()` will create a new Project and a new Material. To attach to existing models:

```php
ProjectMaterial::factory()->create([
    'project_id'  => $project->id,
    'material_id' => $material->id,
]);
```

### SupplierFactory

```php
public function definition(): array
{
    $suppliers = ['Rockler', 'Woodcraft', 'Home Depot', 'Lowe\'s', 'Lee Valley', 'Amazon', 'Local Hardwood Dealer'];

    return [
        'name'         => fake()->randomElement($suppliers) . ' ' . fake()->city(),
        'contact_name' => fake()->optional(0.5)->name(),
        'phone'        => fake()->optional(0.6)->phoneNumber(),
        'email'        => fake()->optional(0.5)->safeEmail(),
        'website'      => fake()->optional(0.6)->url(),
        'address'      => fake()->optional(0.5)->address(),
        'notes'        => fake()->optional(0.3)->sentence(),
    ];
}
```

### ToolCategoryFactory

```php
public function definition(): array
{
    $categories = ['Power Tools', 'Hand Tools', 'Jigs', 'Dust Collection', 'Measuring', 'Finishing'];

    return [
        'name'       => fake()->randomElement($categories) . ' ' . fake()->word(),
        'sort_order' => fake()->numberBetween(0, 10),
    ];
}
```

### ToolFactory

```php
public function definition(): array
{
    $brands = ['DeWalt', 'Festool', 'Bosch', 'Makita', 'Jet', 'Powermatic', 'Lie-Nielsen', 'Veritas'];
    $tools  = ['Table Saw', 'Planer', 'Jointer', 'Band Saw', 'Router', 'Drill Press', 'Sander', 'Miter Saw'];

    return [
        'category_id'       => null,
        'name'              => fake()->randomElement($brands) . ' ' . fake()->randomElement($tools),
        'brand'             => fake()->optional(0.9)->randomElement($brands),
        'model_number'      => fake()->optional(0.8)->bothify('??-####'),
        'serial_number'     => fake()->optional(0.6)->bothify('??###???##'),
        'purchase_date'     => fake()->optional(0.7)->dateTimeBetween('-5 years', 'now'),
        'purchase_price'    => fake()->optional(0.7)->randomFloat(2, 10, 500),
        'warranty_expires'  => fake()->optional(0.5)->dateTimeBetween('now', '+3 years'),
        'location'          => fake()->optional(0.7)->bothify('Bay ?, Station #'),
        'manual_url'        => fake()->optional(0.4)->url(),
        'notes'             => fake()->optional(0.3)->sentence(),
        'total_usage_hours' => fake()->randomFloat(2, 0, 500),
    ];
}

public function withCategory(): static
{
    return $this->state(fn (array $attributes) => [
        'category_id' => ToolCategory::factory(),
    ]);
}
```

### MaintenanceScheduleFactory

```php
use App\Enums\MaintenanceType;

public function definition(): array
{
    return [
        'tool_id'           => Tool::factory(),
        'task'              => fake()->sentence(4),
        'maintenance_type'  => fake()->randomElement(MaintenanceType::cases())->value,
        'interval_hours'    => fake()->optional(0.5)->numberBetween(10, 200),
        'interval_days'     => fake()->optional(0.5)->numberBetween(30, 365),
        'last_performed_at' => fake()->optional(0.6)->dateTimeBetween('-6 months', 'now'),
        'next_due_at'       => fake()->optional(0.6)->dateTimeBetween('now', '+6 months'),
        'notes'             => fake()->optional(0.3)->sentence(),
    ];
}
```

### MaintenanceLogFactory

```php
use App\Enums\MaintenanceType;

public function definition(): array
{
    return [
        'tool_id'          => Tool::factory(),
        'schedule_id'      => null, // nullable — ad-hoc maintenance has no schedule
        'maintenance_type' => fake()->randomElement(MaintenanceType::cases())->value,
        'description'      => fake()->paragraph(),
        'cost'             => fake()->optional(0.5)->randomFloat(2, 10, 500),
        'performed_at'     => fake()->dateTimeBetween('-1 year', 'now'),
        'usage_hours_at'   => fake()->optional(0.5)->randomFloat(2, 0, 500),
    ];
}

public function withSchedule(): static
{
    return $this->state(fn (array $attributes) => [
        'schedule_id' => MaintenanceSchedule::factory()->state([
            'tool_id' => $attributes['tool_id'],
        ]),
    ]);
}
```

`schedule_id` defaults to `null` per the spec (ad-hoc maintenance). The `withSchedule()` state links to a schedule on the same tool.

### ExpenseFactory

```php
use App\Enums\ExpenseCategory;

public function definition(): array
{
    return [
        'project_id'   => null,
        'category'     => fake()->randomElement(ExpenseCategory::cases())->value,
        'description'  => fake()->sentence(5),
        'amount'       => fake()->randomFloat(2, 10, 500),
        'supplier_id'  => null,
        'receipt_path' => null,
        'expense_date' => fake()->dateTimeBetween('-1 year', 'now'),
    ];
}

public function forProject(): static
{
    return $this->state(fn (array $attributes) => [
        'project_id' => Project::factory(),
    ]);
}

public function withSupplier(): static
{
    return $this->state(fn (array $attributes) => [
        'supplier_id' => Supplier::factory(),
    ]);
}
```

### RevenueFactory

```php
public function definition(): array
{
    $paymentMethods = ['cash', 'check', 'venmo', 'paypal', 'zelle', 'bank transfer'];

    return [
        'project_id'     => null,
        'description'    => fake()->sentence(5),
        'amount'         => fake()->randomFloat(2, 10, 500),
        'payment_method' => fake()->optional(0.7)->randomElement($paymentMethods),
        'received_date'  => fake()->dateTimeBetween('-1 year', 'now'),
        'client_name'    => fake()->optional(0.5)->name(),
    ];
}

public function forProject(): static
{
    return $this->state(fn (array $attributes) => [
        'project_id' => Project::factory(),
    ]);
}
```

### CutListBoardFactory

```php
public function definition(): array
{
    return [
        'project_id'  => null,
        'material_id' => null,
        'label'       => 'Board #' . fake()->numberBetween(1, 100),
        'length'      => fake()->randomFloat(2, 24, 120), // inches
        'width'       => fake()->randomFloat(2, 3, 12),   // inches
        'thickness'   => fake()->randomElement([0.75, 1.0, 1.5, 1.75, 2.0]),
        'quantity'    => fake()->numberBetween(1, 5),
    ];
}
```

Thickness values use realistic woodworking dimensions (3/4", 1", 1-1/2", etc.) rather than fully random values.

### CutListPieceFactory

```php
public function definition(): array
{
    $labels = ['Front Panel', 'Back Panel', 'Side Panel A', 'Side Panel B', 'Shelf', 'Door', 'Drawer Front', 'Bottom'];

    return [
        'project_id'     => Project::factory(),
        'label'          => fake()->randomElement($labels) . ' ' . fake()->numberBetween(1, 10),
        'length'         => fake()->randomFloat(2, 6, 48),
        'width'          => fake()->randomFloat(2, 3, 12),
        'thickness'      => fake()->randomElement([0.75, 1.0, 1.5, 1.75, 2.0]),
        'quantity'       => fake()->numberBetween(1, 4),
        'grain_direction'=> fake()->boolean(30),
    ];
}
```

### TagFactory

```php
public function definition(): array
{
    $tagNames = ['commission', 'gift', 'prototype', 'shop improvement', 'furniture', 'storage', 'jig', 'holiday'];

    return [
        'name'  => fake()->randomElement($tagNames) . ' ' . fake()->word(),
        'color' => sprintf('#%06x', fake()->numberBetween(0, 0xFFFFFF)),
    ];
}
```

`sprintf('#%06x', ...)` produces a 7-character lowercase hex color like `#a3f2c1`. This is the most reliable approach — `fake()->hexColor()` sometimes returns values without the `#` prefix depending on Faker version. The `sprintf` approach is deterministic and always produces a valid 7-char hex.

## 4. Key Decisions

### Decision 1: Nullable FKs default to `null` in definitions, use factory states for FK creation

All nullable foreign keys (`category_id`, `supplier_id`, `project_id`, etc.) default to `null` in the base `definition()`. This means `Model::factory()->make()` works without hitting the database or creating parent models. When tests need the relationship populated, they use factory states: `Material::factory()->withCategory()->create()`.

This is the correct Factory pattern for relationships with nullable FKs. It prevents cascading factory creation that is hard to reason about and slows tests.

### Decision 2: Required FKs use `ModelName::factory()` as the default value

For required (non-nullable) FK columns — `project_id` on `ProjectNote`, `ProjectPhoto`, `TimeEntry`, `CutListPiece`; `tool_id` on `MaintenanceSchedule`, `MaintenanceLog` — the factory definition uses `Project::factory()` as the default. Laravel resolves this by creating a new parent model when `create()` is called.

For `make()` calls (no DB), nested `factory()` calls in the definition will resolve to `make()` as well — no DB interaction occurs.

### Decision 3: `ProjectMaterial` factory creates independent parent models

`ProjectMaterial` is a Pivot model. Its factory creates independent `Project` and `Material` records by default. Tests that want to assert a specific project-material association must pass the IDs explicitly or use `->for($project)->for($material)`.

### Decision 4: Money fields use `randomFloat(2, 10, 500)`

The range [10, 500] produces realistic values for a woodworking shop context. The task manifest specifies this exact Faker call. All money columns across all factories use this range consistently.

### Decision 5: `FactoryTest.php` uses `make()` not `create()`

The smoke test calls `make()` on every factory to verify syntactic correctness without requiring a database connection. A separate integration test (not in scope for this task) would verify `create()` works on a migrated database. This keeps the smoke test runnable in CI without database setup.

```php
// tests/Unit/FactoryTest.php
use App\Models\{Project, ProjectPhoto, ProjectNote, TimeEntry, Material, MaterialCategory,
                ProjectMaterial, Supplier, Tool, ToolCategory, MaintenanceSchedule,
                MaintenanceLog, Expense, Revenue, CutListBoard, CutListPiece, Tag};

it('all factories produce valid data with make()', function () {
    expect(Project::factory()->make())->toBeInstanceOf(Project::class);
    expect(ProjectPhoto::factory()->make())->toBeInstanceOf(ProjectPhoto::class);
    // ... all 17 models
    expect(Tag::factory()->make()->color)->toMatch('/#[0-9a-f]{6}/i');
});
```

### Decision 6: Enum column values use `->value` on enum cases

`fake()->randomElement(ProjectStatus::cases())` returns a `ProjectStatus` enum instance. Calling `->value` on it returns the string backing value (e.g., `'in_progress'`). This string is what gets stored in the database column. Without `->value`, Eloquent would receive an enum object, which it would cast correctly — but having the string in the factory definition is cleaner and avoids cast-related surprises during testing.

### Decision 7: Tag color format

`sprintf('#%06x', fake()->numberBetween(0, 0xFFFFFF))` guarantees:
- Always starts with `#`
- Always exactly 6 hex digits after `#`
- Lowercase hex (consistent with the spec example `#ffffff`)
- Pattern matches `/#[0-9a-f]{6}/i`

## 5. Verified Dependencies

| Dependency | Source | Notes |
|------------|--------|-------|
| All 17 model classes with `HasUlids` and `$fillable` | Task 04 | Factories reference model classes directly |
| `App\Enums\*` enum classes with `cases()` | Task 02 | Used in `randomElement(EnumClass::cases())` |
| All 17+ database tables migrated | Task 03 | Required for `create()` to work |
| `Project::booted()` slug generation | Task 04 | `ProjectFactory` relies on this to set `slug` automatically |
| `faker/faker` library | Laravel default | Included in `laravel/framework` dev dependencies |

## 6. Risks

### Risk 1: `Project::booted()` slug observer not implemented in Task 04

If `Project` does not auto-generate `slug` from `title`, `Project::factory()->create()` will fail with a NOT NULL constraint violation on `slug`.

**Mitigation:** Add a check in `FactoryTest` that confirms `Project::factory()->create()->slug` is not null. If the observer is missing, the factory can be patched with a temporary `'slug' => Str::slug(fake()->sentence(3))` line, flagged for removal once Task 04 is corrected.

### Risk 2: `ProjectMaterial` extends `Pivot` — factory behavior differs

`Pivot` models behave slightly differently from `Model` in factories. In particular, `Pivot` models do not fire the same lifecycle events, and `HasFactory` trait must be explicitly added.

**Mitigation:** Ensure `ProjectMaterial` has the `HasFactory` trait. The factory class must specify `protected $model = ProjectMaterial::class`. Test with `ProjectMaterial::factory()->make()` in `FactoryTest`.

### Risk 3: Faker `optional()` produces `null` for required fields in some paths

`fake()->optional(0.7)->randomFloat(...)` returns `null` 30% of the time. For fields that are nullable in the schema but are expected to have a value in most test scenarios, `optional()` usage may cause flaky tests.

**Mitigation:** Use `optional()` only for truly nullable schema columns. For fields like `unit` (required in `materials` table), do NOT use `optional()`.

### Risk 4: `TimeEntryFactory` `duration_minutes` calculation may be off by a minute due to Carbon vs DateTime

The inline calculation in the factory definition uses PHP `DateTime` objects. When the model's `saving` observer uses Carbon's `diffInMinutes()`, slight differences in rounding may produce results that differ by 1 minute.

**Mitigation:** Tests asserting on `duration_minutes` should use `->toBeBetween($expected - 1, $expected + 1)` rather than exact equality.

### Risk 5: `MaintenanceLog::withSchedule()` state creates a schedule on a potentially different tool

The `withSchedule()` state creates a `MaintenanceSchedule::factory()->state(['tool_id' => $attributes['tool_id']])`. This requires that `$attributes['tool_id']` is already resolved to an ID (a ULID string), not a nested factory. If both are factories, the `tool_id` in `$attributes` is still a factory object, not a string ID.

**Mitigation:** Document that `withSchedule()` should only be used after `create()` or with an explicit `tool_id` state. For tests that need both, create the `Tool` first and pass its ID explicitly.

## 7. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| All 17 factory files exist under `database/factories/` | 17 files enumerated in Files to Create |
| `ModelName::factory()->make()` works for every model | `FactoryTest.php` smoke test verifies this for all 17 models |
| `ModelName::factory()->create()` works on a migrated database | FK defaults use nested factory calls; required FKs auto-create parents |
| Enum columns produce valid string values matching their enum's cases | `fake()->randomElement(EnumClass::cases())->value` pattern used throughout |
| Money/decimal fields produce positive numeric values | `fake()->randomFloat(2, 10, 500)` used for all money columns |
| `Tag` factory produces a `color` matching `/#[0-9a-f]{6}/i` | `sprintf('#%06x', fake()->numberBetween(0, 0xFFFFFF))` pattern |
| `Project` factory creates a record with auto-generated slug (not null) | `slug` intentionally omitted from factory; model observer generates it |
| `php artisan test --filter FactoryTest` passes | `tests/Unit/FactoryTest.php` calls `make()` for all 17 models |
