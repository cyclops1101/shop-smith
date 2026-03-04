# Task 02 Plan: PHP Enum Classes

**Task ID:** 02
**Domain:** backend
**Parallel Group:** 2 (depends on Task 01)
**Complexity:** low
**Status:** pending

---

## 1. Approach

Create 5 PHP backed string enum classes under `app/Enums/`. Each enum represents a domain concept whose values are stored as strings in the database and used as casts in Eloquent models. Each enum also provides a `label(): string` method that returns a human-readable display string, making it usable directly in Inertia-rendered dropdowns and badges without any frontend mapping logic.

A unit test at `tests/Unit/EnumTest.php` verifies that all enum case values match their expected backing strings and that `label()` returns non-empty strings for every case. The test is runnable in isolation with `./vendor/bin/sail artisan test --filter EnumTest`.

The `app/Enums/` directory does not exist in the fresh Laravel install. It must be created before the enum files are added.

---

## 2. Files to Create or Modify

| File | Action |
|------|--------|
| `app/Enums/ProjectStatus.php` | Create |
| `app/Enums/ProjectPriority.php` | Create |
| `app/Enums/MaterialUnit.php` | Create |
| `app/Enums/ExpenseCategory.php` | Create |
| `app/Enums/MaintenanceType.php` | Create |
| `tests/Unit/EnumTest.php` | Create |

No existing files are modified by this task.

---

## 3. Exact File Contents

### `app/Enums/ProjectStatus.php`

7 cases: `planned`, `designing`, `in_progress`, `finishing`, `on_hold`, `completed`, `archived`

```php
<?php

namespace App\Enums;

enum ProjectStatus: string
{
    case Planned    = 'planned';
    case Designing  = 'designing';
    case InProgress = 'in_progress';
    case Finishing  = 'finishing';
    case OnHold     = 'on_hold';
    case Completed  = 'completed';
    case Archived   = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Planned    => 'Planned',
            self::Designing  => 'Designing',
            self::InProgress => 'In Progress',
            self::Finishing  => 'Finishing',
            self::OnHold     => 'On Hold',
            self::Completed  => 'Completed',
            self::Archived   => 'Archived',
        };
    }
}
```

### `app/Enums/ProjectPriority.php`

4 cases: `low`, `medium`, `high`, `urgent`

```php
<?php

namespace App\Enums;

enum ProjectPriority: string
{
    case Low    = 'low';
    case Medium = 'medium';
    case High   = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::Low    => 'Low',
            self::Medium => 'Medium',
            self::High   => 'High',
            self::Urgent => 'Urgent',
        };
    }
}
```

### `app/Enums/MaterialUnit.php`

14 cases: `piece`, `board_foot`, `linear_foot`, `square_foot`, `sheet`, `gallon`, `quart`, `pint`, `oz`, `lb`, `kg`, `each`, `box`, `bag`

```php
<?php

namespace App\Enums;

enum MaterialUnit: string
{
    case Piece       = 'piece';
    case BoardFoot   = 'board_foot';
    case LinearFoot  = 'linear_foot';
    case SquareFoot  = 'square_foot';
    case Sheet       = 'sheet';
    case Gallon      = 'gallon';
    case Quart       = 'quart';
    case Pint        = 'pint';
    case Oz          = 'oz';
    case Lb          = 'lb';
    case Kg          = 'kg';
    case Each        = 'each';
    case Box         = 'box';
    case Bag         = 'bag';

    public function label(): string
    {
        return match ($this) {
            self::Piece      => 'Piece',
            self::BoardFoot  => 'Board Foot',
            self::LinearFoot => 'Linear Foot',
            self::SquareFoot => 'Square Foot',
            self::Sheet      => 'Sheet',
            self::Gallon     => 'Gallon',
            self::Quart      => 'Quart',
            self::Pint       => 'Pint',
            self::Oz         => 'Oz',
            self::Lb         => 'Lb',
            self::Kg         => 'Kg',
            self::Each       => 'Each',
            self::Box        => 'Box',
            self::Bag        => 'Bag',
        };
    }
}
```

### `app/Enums/ExpenseCategory.php`

6 cases: `materials`, `tools`, `shop_supplies`, `equipment`, `maintenance`, `other`

```php
<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case Materials    = 'materials';
    case Tools        = 'tools';
    case ShopSupplies = 'shop_supplies';
    case Equipment    = 'equipment';
    case Maintenance  = 'maintenance';
    case Other        = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Materials    => 'Materials',
            self::Tools        => 'Tools',
            self::ShopSupplies => 'Shop Supplies',
            self::Equipment    => 'Equipment',
            self::Maintenance  => 'Maintenance',
            self::Other        => 'Other',
        };
    }
}
```

### `app/Enums/MaintenanceType.php`

8 cases: `blade_change`, `alignment`, `cleaning`, `lubrication`, `belt_replacement`, `calibration`, `filter_change`, `other`

```php
<?php

namespace App\Enums;

enum MaintenanceType: string
{
    case BladeChange      = 'blade_change';
    case Alignment        = 'alignment';
    case Cleaning         = 'cleaning';
    case Lubrication      = 'lubrication';
    case BeltReplacement  = 'belt_replacement';
    case Calibration      = 'calibration';
    case FilterChange     = 'filter_change';
    case Other            = 'other';

    public function label(): string
    {
        return match ($this) {
            self::BladeChange     => 'Blade Change',
            self::Alignment       => 'Alignment',
            self::Cleaning        => 'Cleaning',
            self::Lubrication     => 'Lubrication',
            self::BeltReplacement => 'Belt Replacement',
            self::Calibration     => 'Calibration',
            self::FilterChange    => 'Filter Change',
            self::Other           => 'Other',
        };
    }
}
```

### `tests/Unit/EnumTest.php`

```php
<?php

namespace Tests\Unit;

use App\Enums\ExpenseCategory;
use App\Enums\MaintenanceType;
use App\Enums\MaterialUnit;
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EnumTest extends TestCase
{
    #[Test]
    public function project_status_cases_have_correct_values(): void
    {
        $this->assertSame('planned',     ProjectStatus::Planned->value);
        $this->assertSame('designing',   ProjectStatus::Designing->value);
        $this->assertSame('in_progress', ProjectStatus::InProgress->value);
        $this->assertSame('finishing',   ProjectStatus::Finishing->value);
        $this->assertSame('on_hold',     ProjectStatus::OnHold->value);
        $this->assertSame('completed',   ProjectStatus::Completed->value);
        $this->assertSame('archived',    ProjectStatus::Archived->value);
    }

    #[Test]
    public function project_status_labels_are_non_empty(): void
    {
        foreach (ProjectStatus::cases() as $case) {
            $this->assertNotEmpty($case->label(), "Label for ProjectStatus::{$case->name} is empty");
        }
    }

    #[Test]
    public function project_priority_cases_have_correct_values(): void
    {
        $this->assertSame('low',    ProjectPriority::Low->value);
        $this->assertSame('medium', ProjectPriority::Medium->value);
        $this->assertSame('high',   ProjectPriority::High->value);
        $this->assertSame('urgent', ProjectPriority::Urgent->value);
    }

    #[Test]
    public function project_priority_labels_are_non_empty(): void
    {
        foreach (ProjectPriority::cases() as $case) {
            $this->assertNotEmpty($case->label(), "Label for ProjectPriority::{$case->name} is empty");
        }
    }

    #[Test]
    public function material_unit_has_fourteen_cases(): void
    {
        $this->assertCount(14, MaterialUnit::cases());
    }

    #[Test]
    public function material_unit_cases_have_correct_values(): void
    {
        $this->assertSame('piece',       MaterialUnit::Piece->value);
        $this->assertSame('board_foot',  MaterialUnit::BoardFoot->value);
        $this->assertSame('linear_foot', MaterialUnit::LinearFoot->value);
        $this->assertSame('square_foot', MaterialUnit::SquareFoot->value);
        $this->assertSame('sheet',       MaterialUnit::Sheet->value);
        $this->assertSame('gallon',      MaterialUnit::Gallon->value);
        $this->assertSame('quart',       MaterialUnit::Quart->value);
        $this->assertSame('pint',        MaterialUnit::Pint->value);
        $this->assertSame('oz',          MaterialUnit::Oz->value);
        $this->assertSame('lb',          MaterialUnit::Lb->value);
        $this->assertSame('kg',          MaterialUnit::Kg->value);
        $this->assertSame('each',        MaterialUnit::Each->value);
        $this->assertSame('box',         MaterialUnit::Box->value);
        $this->assertSame('bag',         MaterialUnit::Bag->value);
    }

    #[Test]
    public function material_unit_labels_are_non_empty(): void
    {
        foreach (MaterialUnit::cases() as $case) {
            $this->assertNotEmpty($case->label(), "Label for MaterialUnit::{$case->name} is empty");
        }
    }

    #[Test]
    public function expense_category_cases_have_correct_values(): void
    {
        $this->assertSame('materials',     ExpenseCategory::Materials->value);
        $this->assertSame('tools',         ExpenseCategory::Tools->value);
        $this->assertSame('shop_supplies', ExpenseCategory::ShopSupplies->value);
        $this->assertSame('equipment',     ExpenseCategory::Equipment->value);
        $this->assertSame('maintenance',   ExpenseCategory::Maintenance->value);
        $this->assertSame('other',         ExpenseCategory::Other->value);
    }

    #[Test]
    public function expense_category_labels_are_non_empty(): void
    {
        foreach (ExpenseCategory::cases() as $case) {
            $this->assertNotEmpty($case->label(), "Label for ExpenseCategory::{$case->name} is empty");
        }
    }

    #[Test]
    public function maintenance_type_cases_have_correct_values(): void
    {
        $this->assertSame('blade_change',     MaintenanceType::BladeChange->value);
        $this->assertSame('alignment',        MaintenanceType::Alignment->value);
        $this->assertSame('cleaning',         MaintenanceType::Cleaning->value);
        $this->assertSame('lubrication',      MaintenanceType::Lubrication->value);
        $this->assertSame('belt_replacement', MaintenanceType::BeltReplacement->value);
        $this->assertSame('calibration',      MaintenanceType::Calibration->value);
        $this->assertSame('filter_change',    MaintenanceType::FilterChange->value);
        $this->assertSame('other',            MaintenanceType::Other->value);
    }

    #[Test]
    public function maintenance_type_labels_are_non_empty(): void
    {
        foreach (MaintenanceType::cases() as $case) {
            $this->assertNotEmpty($case->label(), "Label for MaintenanceType::{$case->name} is empty");
        }
    }

    #[Test]
    public function enums_can_be_instantiated_from_string_value(): void
    {
        $this->assertSame(ProjectStatus::InProgress, ProjectStatus::from('in_progress'));
        $this->assertSame(ProjectPriority::High,     ProjectPriority::from('high'));
        $this->assertSame(MaterialUnit::BoardFoot,   MaterialUnit::from('board_foot'));
        $this->assertSame(ExpenseCategory::Other,    ExpenseCategory::from('other'));
        $this->assertSame(MaintenanceType::Cleaning, MaintenanceType::from('cleaning'));
    }
}
```

---

## 4. Key Decisions

### Decision 1: PHP `match` expression in `label()` — not `ucwords(str_replace('_', ' ', $this->value))`

Using `match` is explicit and intentional. Every case gets a precisely authored label. This avoids surprising outputs for multi-word cases like `in_progress` → "In Progress" vs the potential `ucwords` result of "In_Progress". It also allows future non-obvious labels (e.g., `oz` → "oz (ounces)") without changing the backing value.

### Decision 2: Case names use PascalCase, backing values use snake_case

PHP enum case names must be valid PHP identifiers. `InProgress` is the case name; `in_progress` is the stored backing value that matches the database column value exactly. The Eloquent cast system calls `->value` when writing to the database, so round-tripping is transparent.

### Decision 3: `label()` is an instance method, not static

`$status->label()` is called on an enum instance (retrieved from the model cast). This is the natural use pattern in controllers and views. If a static lookup from a string value is needed, callers can chain: `ProjectStatus::from('in_progress')->label()`.

### Decision 4: No interface or trait for `label()`

A shared `HasLabel` interface would add complexity without benefit. These 5 enums are the entire domain set for this project. The pattern is consistent by convention, not enforced by a shared contract.

### Decision 5: Test uses `#[Test]` attribute (PHPUnit 11)

This project uses PHPUnit 11.5 (confirmed in `composer.json`). The `#[Test]` attribute is the PHPUnit 10+ modern annotation style. The `/** @test */` docblock annotation still works but is the legacy form. Using `#[Test]` is consistent with PHPUnit 11 best practices.

### Decision 6: Test extends `Tests\TestCase` (not `PHPUnit\Framework\TestCase`)

Unit tests in Laravel conventionally extend `Tests\TestCase` which sets up the application environment. For pure enum unit tests, extending `PHPUnit\Framework\TestCase` directly would also work (since enums need no app context), but using `Tests\TestCase` keeps the file consistent with the rest of the test suite and avoids any future issues if a test method needs app context.

---

## 5. Verified Dependencies

| Requirement | Status |
|-------------|--------|
| PHP 8.3.6 | Confirmed — backed enums require PHP 8.1+, this is 8.3 |
| PHPUnit 11.5 | Confirmed in `composer.json` — `#[Test]` attribute supported |
| `app/Enums/` directory | Does not exist yet — must be created before adding files |
| No Composer packages needed | Pure PHP — no external dependencies |
| Task 01 must be complete | Task 02 is in Parallel Group 2 (depends on Task 01). Task 01 runs `npm install` and migrations; enum files themselves need no completed state from Task 01. However, the dependency ordering in the manifest is respected. |

---

## 6. Risks and Mitigations

### Risk 1: Case name conflict with PHP reserved words

**Risk:** Some enum case names could conflict with PHP keywords (e.g., `default`, `match`, `list`). None of the 39 total cases across the 5 enums use PHP reserved words. `Other` is not a reserved word.

**Mitigation:** Review all case names before creation: Planned, Designing, InProgress, Finishing, OnHold, Completed, Archived, Low, Medium, High, Urgent, Piece, BoardFoot, LinearFoot, SquareFoot, Sheet, Gallon, Quart, Pint, Oz, Lb, Kg, Each, Box, Bag, Materials, Tools, ShopSupplies, Equipment, Maintenance, Other, BladeChange, Alignment, Cleaning, Lubrication, BeltReplacement, Calibration, FilterChange. None are PHP reserved words.

### Risk 2: `MaterialUnit::Each` — `each` is a PHP function name

**Risk:** `each` is a built-in PHP function (deprecated since PHP 7.2, removed in PHP 8.0). As an enum case name, `Each` (PascalCase) is not a keyword — it is a valid PHP identifier. The backing string value `'each'` is a plain string stored in the database, not a function call.

**Mitigation:** None needed. `Each` as a PascalCase class constant (enum case) is unambiguous in PHP. The test explicitly asserts `MaterialUnit::Each->value === 'each'` to confirm the backing value.

### Risk 3: Count of MaterialUnit cases

**Risk:** The spec lists 14 MaterialUnit cases. Miscounting during implementation could silently omit a case.

**Mitigation:** The test asserts `$this->assertCount(14, MaterialUnit::cases())`. If any case is missing, this assertion fails immediately. The test also explicitly asserts every backing value string for all 14 cases.

### Risk 4: Enum used before Eloquent cast is set up (Task 04)

**Risk:** These enums exist independently; they become useful when Eloquent models cast their columns to enum types (Task 04). If another task tries to cast before Task 04 runs, there would be a mismatch.

**Mitigation:** No risk for this task itself. Enums are plain PHP files with no runtime dependencies. They can be instantiated and tested without any database, migration, or model. Task 04 depends on Task 02 completing before it runs.

---

## 7. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| All 5 enum files exist under `app/Enums/` | 5 files created: ProjectStatus.php, ProjectPriority.php, MaterialUnit.php, ExpenseCategory.php, MaintenanceType.php |
| All enums use `string` backing type | Each declaration is `enum Foo: string` |
| All case values match the spec exactly | Case backing values are literal string matches to the spec; verified by test assertions |
| Each enum has a `label(): string` method | `label()` method with `match` expression defined on each enum |
| `tests/Unit/EnumTest.php` exists with assertions | Test file created with value assertions and label non-empty checks for all 5 enums |
| `php artisan test --filter EnumTest` passes | All test methods assert known constant values — no DB or external dependencies; will pass given correct implementation |
