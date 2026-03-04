<?php

namespace Tests\Unit;

use App\Enums\ExpenseCategory;
use App\Enums\MaintenanceType;
use App\Enums\MaterialUnit;
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class EnumTest extends TestCase
{
    #[Test]
    public function project_status_backing_values_are_correct(): void
    {
        $this->assertSame('planned', ProjectStatus::Planned->value);
        $this->assertSame('designing', ProjectStatus::Designing->value);
        $this->assertSame('in_progress', ProjectStatus::InProgress->value);
        $this->assertSame('finishing', ProjectStatus::Finishing->value);
        $this->assertSame('on_hold', ProjectStatus::OnHold->value);
        $this->assertSame('completed', ProjectStatus::Completed->value);
        $this->assertSame('archived', ProjectStatus::Archived->value);
    }

    #[Test]
    public function project_status_labels_are_non_empty_strings(): void
    {
        foreach (ProjectStatus::cases() as $case) {
            $label = $case->label();
            $this->assertIsString($label);
            $this->assertNotEmpty($label);
        }
    }

    #[Test]
    public function project_priority_backing_values_are_correct(): void
    {
        $this->assertSame('low', ProjectPriority::Low->value);
        $this->assertSame('medium', ProjectPriority::Medium->value);
        $this->assertSame('high', ProjectPriority::High->value);
        $this->assertSame('urgent', ProjectPriority::Urgent->value);
    }

    #[Test]
    public function project_priority_labels_are_non_empty_strings(): void
    {
        foreach (ProjectPriority::cases() as $case) {
            $label = $case->label();
            $this->assertIsString($label);
            $this->assertNotEmpty($label);
        }
    }

    #[Test]
    public function material_unit_backing_values_are_correct(): void
    {
        $this->assertSame('piece', MaterialUnit::Piece->value);
        $this->assertSame('board_foot', MaterialUnit::BoardFoot->value);
        $this->assertSame('linear_foot', MaterialUnit::LinearFoot->value);
        $this->assertSame('square_foot', MaterialUnit::SquareFoot->value);
        $this->assertSame('sheet', MaterialUnit::Sheet->value);
        $this->assertSame('gallon', MaterialUnit::Gallon->value);
        $this->assertSame('quart', MaterialUnit::Quart->value);
        $this->assertSame('pint', MaterialUnit::Pint->value);
        $this->assertSame('oz', MaterialUnit::Oz->value);
        $this->assertSame('lb', MaterialUnit::Lb->value);
        $this->assertSame('kg', MaterialUnit::Kg->value);
        $this->assertSame('each', MaterialUnit::Each->value);
        $this->assertSame('box', MaterialUnit::Box->value);
        $this->assertSame('bag', MaterialUnit::Bag->value);
    }

    #[Test]
    public function material_unit_has_exactly_14_cases(): void
    {
        $this->assertCount(14, MaterialUnit::cases());
    }

    #[Test]
    public function material_unit_labels_are_non_empty_strings(): void
    {
        foreach (MaterialUnit::cases() as $case) {
            $label = $case->label();
            $this->assertIsString($label);
            $this->assertNotEmpty($label);
        }
    }

    #[Test]
    public function expense_category_backing_values_are_correct(): void
    {
        $this->assertSame('materials', ExpenseCategory::Materials->value);
        $this->assertSame('tools', ExpenseCategory::Tools->value);
        $this->assertSame('shop_supplies', ExpenseCategory::ShopSupplies->value);
        $this->assertSame('equipment', ExpenseCategory::Equipment->value);
        $this->assertSame('maintenance', ExpenseCategory::Maintenance->value);
        $this->assertSame('other', ExpenseCategory::Other->value);
    }

    #[Test]
    public function expense_category_labels_are_non_empty_strings(): void
    {
        foreach (ExpenseCategory::cases() as $case) {
            $label = $case->label();
            $this->assertIsString($label);
            $this->assertNotEmpty($label);
        }
    }

    #[Test]
    public function maintenance_type_backing_values_are_correct(): void
    {
        $this->assertSame('blade_change', MaintenanceType::BladeChange->value);
        $this->assertSame('alignment', MaintenanceType::Alignment->value);
        $this->assertSame('cleaning', MaintenanceType::Cleaning->value);
        $this->assertSame('lubrication', MaintenanceType::Lubrication->value);
        $this->assertSame('belt_replacement', MaintenanceType::BeltReplacement->value);
        $this->assertSame('calibration', MaintenanceType::Calibration->value);
        $this->assertSame('filter_change', MaintenanceType::FilterChange->value);
        $this->assertSame('other', MaintenanceType::Other->value);
    }

    #[Test]
    public function maintenance_type_labels_are_non_empty_strings(): void
    {
        foreach (MaintenanceType::cases() as $case) {
            $label = $case->label();
            $this->assertIsString($label);
            $this->assertNotEmpty($label);
        }
    }
}
