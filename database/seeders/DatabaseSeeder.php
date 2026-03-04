<?php

namespace Database\Seeders;

use App\Enums\ExpenseCategory;
use App\Enums\MaintenanceType;
use App\Enums\MaterialUnit;
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\CutListBoard;
use App\Models\CutListPiece;
use App\Models\Expense;
use App\Models\MaintenanceLog;
use App\Models\MaintenanceSchedule;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Project;
use App\Models\ProjectNote;
use App\Models\ProjectPhoto;
use App\Models\Revenue;
use App\Models\Supplier;
use App\Models\Tag;
use App\Models\TimeEntry;
use App\Models\Tool;
use App\Models\ToolCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- User ---
        $user = User::factory()->create([
            'name'  => 'Test User',
            'email' => 'test@example.com',
        ]);

        // --- Categories ---
        $matCats = collect([
            'Hardwood', 'Softwood', 'Plywood', 'Hardware', 'Finish', 'Adhesive',
        ])->map(fn ($name) => MaterialCategory::create(['name' => $name]));

        $toolCats = collect([
            'Power Tools', 'Hand Tools', 'Jigs', 'Dust Collection', 'Clamps',
        ])->map(fn ($name) => ToolCategory::create(['name' => $name]));

        // --- Tags ---
        $tags = collect([
            ['name' => 'Walnut',     'color' => '#6B4226'],
            ['name' => 'Cherry',     'color' => '#C0392B'],
            ['name' => 'Maple',      'color' => '#F39C12'],
            ['name' => 'Furniture',  'color' => '#2980B9'],
            ['name' => 'Commission', 'color' => '#27AE60'],
            ['name' => 'Gift',       'color' => '#8E44AD'],
            ['name' => 'Turning',    'color' => '#D35400'],
        ])->map(fn ($t) => Tag::create($t));

        // --- Suppliers ---
        $suppliers = collect([
            ['name' => 'Woodcraft Supply', 'website' => 'https://www.woodcraft.com', 'email' => 'orders@woodcraft.com', 'phone' => '(800) 225-1153'],
            ['name' => 'Rockler Woodworking', 'website' => 'https://www.rockler.com', 'email' => 'sales@rockler.com', 'phone' => '(800) 279-4441'],
            ['name' => 'Local Hardwood Dealer', 'contact_name' => 'Mike Thompson', 'phone' => '(555) 123-4567', 'address' => '123 Lumber Rd, Springfield'],
        ])->map(fn ($s) => Supplier::create($s));

        // --- Materials ---
        $materials = collect([
            ['name' => 'Walnut 4/4 Rough',   'category_id' => $matCats[0]->id, 'supplier_id' => $suppliers[2]->id, 'unit' => MaterialUnit::BoardFoot,  'quantity_on_hand' => 45, 'low_stock_threshold' => 20, 'unit_cost' => 12.50, 'location' => 'Rack A'],
            ['name' => 'Cherry 4/4 S2S',     'category_id' => $matCats[0]->id, 'supplier_id' => $suppliers[2]->id, 'unit' => MaterialUnit::BoardFoot,  'quantity_on_hand' => 8,  'low_stock_threshold' => 15, 'unit_cost' => 9.75,  'location' => 'Rack A'],
            ['name' => 'Hard Maple 8/4',     'category_id' => $matCats[0]->id, 'supplier_id' => $suppliers[2]->id, 'unit' => MaterialUnit::BoardFoot,  'quantity_on_hand' => 30, 'low_stock_threshold' => 10, 'unit_cost' => 8.00,  'location' => 'Rack B'],
            ['name' => 'Baltic Birch Ply',   'category_id' => $matCats[2]->id, 'supplier_id' => $suppliers[0]->id, 'unit' => MaterialUnit::Sheet,      'quantity_on_hand' => 3,  'low_stock_threshold' => 2,  'unit_cost' => 65.00, 'location' => 'Sheet Rack'],
            ['name' => 'Pine 1x6',           'category_id' => $matCats[1]->id, 'supplier_id' => $suppliers[2]->id, 'unit' => MaterialUnit::LinearFoot, 'quantity_on_hand' => 60, 'low_stock_threshold' => 10, 'unit_cost' => 1.25,  'location' => 'Rack C'],
            ['name' => 'Titebond III Glue',  'category_id' => $matCats[5]->id, 'supplier_id' => $suppliers[0]->id, 'unit' => MaterialUnit::Gallon,     'quantity_on_hand' => 0.5, 'low_stock_threshold' => 1, 'unit_cost' => 32.00, 'location' => 'Shelf 1'],
            ['name' => 'Arm-R-Seal Finish',  'category_id' => $matCats[4]->id, 'supplier_id' => $suppliers[0]->id, 'unit' => MaterialUnit::Quart,      'quantity_on_hand' => 2,  'low_stock_threshold' => 1,  'unit_cost' => 24.00, 'location' => 'Finish Cabinet'],
            ['name' => 'Brass Hinges (pair)', 'category_id' => $matCats[3]->id, 'supplier_id' => $suppliers[1]->id, 'unit' => MaterialUnit::Each,       'quantity_on_hand' => 6,  'low_stock_threshold' => 4,  'unit_cost' => 8.50,  'location' => 'Hardware Bin'],
            ['name' => '#8 x 1¼" Screws',   'category_id' => $matCats[3]->id, 'supplier_id' => $suppliers[1]->id, 'unit' => MaterialUnit::Box,        'quantity_on_hand' => 2,  'low_stock_threshold' => 1,  'unit_cost' => 12.00, 'location' => 'Hardware Bin'],
        ])->map(fn ($m) => Material::create($m));

        // --- Tools ---
        $tools = collect([
            ['name' => 'SawStop PCS 3HP', 'brand' => 'SawStop',  'category_id' => $toolCats[0]->id, 'purchase_price' => 3200.00, 'purchase_date' => '2023-03-15', 'serial_number' => 'SS-2023-0451', 'location' => 'Main Shop', 'total_usage_hours' => 420],
            ['name' => 'DeWalt DW735 Planer',  'brand' => 'DeWalt', 'category_id' => $toolCats[0]->id, 'purchase_price' => 599.00,  'purchase_date' => '2023-06-01', 'location' => 'Main Shop', 'total_usage_hours' => 180],
            ['name' => 'Lie-Nielsen No. 4',    'brand' => 'Lie-Nielsen', 'category_id' => $toolCats[1]->id, 'purchase_price' => 375.00, 'purchase_date' => '2022-12-25', 'location' => 'Bench'],
            ['name' => 'Festool Domino DF 500', 'brand' => 'Festool', 'category_id' => $toolCats[0]->id, 'purchase_price' => 1100.00, 'purchase_date' => '2024-01-10', 'location' => 'Main Shop', 'total_usage_hours' => 85],
            ['name' => 'Bessey K-Body Clamps (set of 6)', 'brand' => 'Bessey', 'category_id' => $toolCats[4]->id, 'purchase_price' => 240.00, 'purchase_date' => '2023-09-01', 'location' => 'Clamp Rack'],
            ['name' => 'Shop Fox Dust Collector 2HP', 'brand' => 'Shop Fox', 'category_id' => $toolCats[3]->id, 'purchase_price' => 450.00, 'purchase_date' => '2023-04-20', 'location' => 'Garage Corner', 'total_usage_hours' => 350],
        ])->map(fn ($t) => Tool::create($t));

        // --- Maintenance Schedules ---
        $schedules = collect([
            ['tool_id' => $tools[0]->id, 'maintenance_type' => MaintenanceType::BladeChange,   'task' => 'Replace table saw blade',    'interval_days' => 90,  'next_due_at' => now()->subDays(5), 'last_performed_at' => now()->subDays(95)],
            ['tool_id' => $tools[0]->id, 'maintenance_type' => MaintenanceType::Alignment,     'task' => 'Check fence alignment',      'interval_days' => 30,  'next_due_at' => now()->addDays(3)],
            ['tool_id' => $tools[1]->id, 'maintenance_type' => MaintenanceType::BladeChange,   'task' => 'Replace planer blades',      'interval_hours' => 100, 'next_due_at' => now()->addDays(14)],
            ['tool_id' => $tools[5]->id, 'maintenance_type' => MaintenanceType::FilterChange,  'task' => 'Clean/replace dust filter',  'interval_days' => 60,  'next_due_at' => now()->addDays(2)],
            ['tool_id' => $tools[3]->id, 'maintenance_type' => MaintenanceType::Cleaning,      'task' => 'Clean Domino cutters',       'interval_hours' => 50,  'next_due_at' => now()->addDays(20)],
        ])->map(fn ($s) => MaintenanceSchedule::create($s));

        // --- Maintenance Logs ---
        MaintenanceLog::create(['tool_id' => $tools[0]->id, 'schedule_id' => $schedules[0]->id, 'maintenance_type' => MaintenanceType::BladeChange, 'description' => 'Replaced with Forrest WWII 10" blade', 'cost' => 85.00, 'performed_at' => now()->subDays(95)]);
        MaintenanceLog::create(['tool_id' => $tools[5]->id, 'maintenance_type' => MaintenanceType::FilterChange, 'description' => 'Replaced canister filter', 'cost' => 45.00, 'performed_at' => now()->subDays(60)]);

        // --- Projects ---
        $projects = collect([
            ['title' => 'Walnut Dining Table',      'status' => ProjectStatus::InProgress, 'priority' => ProjectPriority::High,   'estimated_hours' => 80,  'estimated_cost' => 600.00, 'is_commission' => true,  'client_name' => 'Sarah & Tom Miller', 'client_contact' => 'sarah@email.com', 'sell_price' => 3500.00, 'started_at' => now()->subWeeks(3), 'deadline' => now()->addWeeks(2)],
            ['title' => 'Cherry Jewelry Box',        'status' => ProjectStatus::Finishing,  'priority' => ProjectPriority::Medium,  'estimated_hours' => 20,  'estimated_cost' => 80.00,  'is_commission' => true,  'client_name' => 'Lisa Chen', 'sell_price' => 250.00, 'started_at' => now()->subWeeks(2)],
            ['title' => 'Workshop Storage Cabinets', 'status' => ProjectStatus::Designing,  'priority' => ProjectPriority::Low,     'estimated_hours' => 40,  'estimated_cost' => 300.00, 'started_at' => now()->subDays(5)],
            ['title' => 'Maple Cutting Board Set',   'status' => ProjectStatus::Completed,  'priority' => ProjectPriority::Medium,  'estimated_hours' => 12,  'actual_cost' => 45.00,    'sell_price' => 180.00, 'started_at' => now()->subWeeks(6), 'completed_at' => now()->subWeeks(1)],
            ['title' => 'Oak Bookshelf',             'status' => ProjectStatus::Planned,    'priority' => ProjectPriority::Low,     'estimated_hours' => 30,  'estimated_cost' => 200.00],
            ['title' => 'Walnut and Epoxy River Table', 'status' => ProjectStatus::InProgress, 'priority' => ProjectPriority::Urgent, 'estimated_hours' => 60, 'estimated_cost' => 800.00, 'is_commission' => true, 'client_name' => 'Jake Adams', 'sell_price' => 4200.00, 'started_at' => now()->subWeeks(1), 'deadline' => now()->addWeeks(4)],
        ])->map(fn ($p) => Project::create($p));

        // --- Attach materials to projects ---
        $projects[0]->materials()->attach($materials[0]->id, ['quantity_used' => 25, 'cost_at_time' => 12.50]);
        $projects[0]->materials()->attach($materials[8]->id, ['quantity_used' => 1,  'cost_at_time' => 12.00]);
        $projects[1]->materials()->attach($materials[1]->id, ['quantity_used' => 3,  'cost_at_time' => 9.75]);
        $projects[1]->materials()->attach($materials[7]->id, ['quantity_used' => 1,  'cost_at_time' => 8.50]);
        $projects[3]->materials()->attach($materials[2]->id, ['quantity_used' => 6,  'cost_at_time' => 8.00]);
        $projects[5]->materials()->attach($materials[0]->id, ['quantity_used' => 15, 'cost_at_time' => 12.50]);

        // --- Tags ---
        $projects[0]->tags()->attach([$tags[0]->id, $tags[3]->id, $tags[4]->id]);
        $projects[1]->tags()->attach([$tags[1]->id, $tags[4]->id]);
        $projects[3]->tags()->attach([$tags[2]->id, $tags[5]->id]);
        $projects[5]->tags()->attach([$tags[0]->id, $tags[4]->id]);

        // --- Time Entries ---
        foreach ([0, 1, 5] as $idx) {
            $project = $projects[$idx];
            for ($i = 0; $i < fake()->numberBetween(4, 8); $i++) {
                $start = now()->subDays(fake()->numberBetween(1, 21))->setTime(fake()->numberBetween(8, 16), 0);
                $mins  = fake()->numberBetween(30, 240);
                TimeEntry::create([
                    'project_id'       => $project->id,
                    'started_at'       => $start,
                    'ended_at'         => $start->copy()->addMinutes($mins),
                    'duration_minutes' => $mins,
                    'description'      => fake()->optional(0.7)->sentence(3),
                ]);
            }
        }

        // Completed project time entries
        for ($i = 0; $i < 5; $i++) {
            $start = now()->subWeeks(fake()->numberBetween(2, 6))->setTime(fake()->numberBetween(8, 16), 0);
            $mins  = fake()->numberBetween(60, 180);
            TimeEntry::create([
                'project_id'       => $projects[3]->id,
                'started_at'       => $start,
                'ended_at'         => $start->copy()->addMinutes($mins),
                'duration_minutes' => $mins,
            ]);
        }

        // --- Project Photos ---
        foreach ([0, 1, 3, 5] as $idx) {
            for ($i = 0; $i < fake()->numberBetween(1, 4); $i++) {
                ProjectPhoto::create([
                    'project_id'   => $projects[$idx]->id,
                    'file_path'    => 'photos/' . fake()->uuid() . '.jpg',
                    'caption'      => fake()->optional()->sentence(4),
                    'is_portfolio' => $idx === 3 || fake()->boolean(30),
                    'sort_order'   => $i,
                ]);
            }
        }

        // --- Project Notes ---
        ProjectNote::create(['project_id' => $projects[0]->id, 'content' => 'Client wants breadboard ends with through-tenons. Discussed wood movement allowance.']);
        ProjectNote::create(['project_id' => $projects[0]->id, 'content' => 'Using Rubio Monocoat Pure finish — client wants a natural look.']);
        ProjectNote::create(['project_id' => $projects[1]->id, 'content' => 'Lined interior with flocking. Using quadrant hinges from Rockler.']);
        ProjectNote::create(['project_id' => $projects[5]->id, 'content' => 'Epoxy from TotalBoat — deep pour clear. Need 2 gallons minimum.']);

        // --- Expenses ---
        $expenseData = [
            ['project_id' => $projects[0]->id, 'supplier_id' => $suppliers[2]->id, 'category' => ExpenseCategory::Materials,    'description' => 'Walnut rough lumber 25 bf',     'amount' => 312.50, 'expense_date' => now()->subWeeks(3)],
            ['project_id' => $projects[0]->id, 'supplier_id' => $suppliers[0]->id, 'category' => ExpenseCategory::Materials,    'description' => 'Rubio Monocoat Pure',            'amount' => 65.00,  'expense_date' => now()->subWeeks(2)],
            ['project_id' => $projects[1]->id, 'supplier_id' => $suppliers[2]->id, 'category' => ExpenseCategory::Materials,    'description' => 'Cherry lumber 3 bf',             'amount' => 29.25,  'expense_date' => now()->subWeeks(2)],
            ['project_id' => $projects[1]->id, 'supplier_id' => $suppliers[1]->id, 'category' => ExpenseCategory::Materials,    'description' => 'Quadrant hinges and flocking kit', 'amount' => 42.00,  'expense_date' => now()->subWeeks(1)],
            ['project_id' => $projects[3]->id, 'supplier_id' => $suppliers[2]->id, 'category' => ExpenseCategory::Materials,    'description' => 'Maple 8/4 for cutting boards',   'amount' => 48.00,  'expense_date' => now()->subWeeks(6)],
            ['project_id' => $projects[5]->id, 'supplier_id' => $suppliers[2]->id, 'category' => ExpenseCategory::Materials,    'description' => 'Walnut slab 15 bf',              'amount' => 187.50, 'expense_date' => now()->subWeeks(1)],
            ['project_id' => null,             'supplier_id' => null,              'category' => ExpenseCategory::ShopSupplies, 'description' => 'Sandpaper assortment 80-400',    'amount' => 35.00,  'expense_date' => now()->subDays(10)],
            ['project_id' => null,             'supplier_id' => null,              'category' => ExpenseCategory::Maintenance,  'description' => 'Table saw blade — Forrest WWII', 'amount' => 85.00,  'expense_date' => now()->subDays(95)],
            ['project_id' => null,             'supplier_id' => null,              'category' => ExpenseCategory::Equipment,    'description' => 'Router bit set',                 'amount' => 120.00, 'expense_date' => now()->subMonths(2)],
        ];
        foreach ($expenseData as $e) {
            Expense::create($e);
        }

        // --- Revenues ---
        Revenue::create(['project_id' => $projects[3]->id, 'description' => 'Cutting board set sold',        'amount' => 180.00, 'client_name' => 'Etsy Customer',    'payment_method' => 'PayPal', 'received_date' => now()->subWeeks(1)]);
        Revenue::create(['project_id' => $projects[0]->id, 'description' => 'Dining table 50% deposit',      'amount' => 1750.00, 'client_name' => 'Sarah Miller',    'payment_method' => 'Check',  'received_date' => now()->subWeeks(3)]);
        Revenue::create(['project_id' => $projects[1]->id, 'description' => 'Jewelry box full payment',      'amount' => 250.00,  'client_name' => 'Lisa Chen',       'payment_method' => 'Venmo',  'received_date' => now()->subWeeks(1)]);
        Revenue::create(['project_id' => $projects[5]->id, 'description' => 'River table 50% deposit',       'amount' => 2100.00, 'client_name' => 'Jake Adams',      'payment_method' => 'Zelle',  'received_date' => now()->subWeeks(1)]);

        // --- Cut List data for the dining table ---
        CutListBoard::create(['project_id' => $projects[0]->id, 'material_id' => $materials[0]->id, 'label' => 'Tabletop Board',  'length' => 84, 'width' => 12, 'thickness' => 1.0, 'quantity' => 5]);
        CutListBoard::create(['project_id' => $projects[0]->id, 'material_id' => $materials[0]->id, 'label' => 'Leg Blank',       'length' => 30, 'width' => 4,  'thickness' => 4.0, 'quantity' => 4]);

        CutListPiece::create(['project_id' => $projects[0]->id, 'label' => 'Tabletop Panel',     'length' => 78, 'width' => 10, 'thickness' => 0.875, 'quantity' => 5]);
        CutListPiece::create(['project_id' => $projects[0]->id, 'label' => 'Breadboard End',     'length' => 42, 'width' => 3,  'thickness' => 0.875, 'quantity' => 2]);
        CutListPiece::create(['project_id' => $projects[0]->id, 'label' => 'Tapered Leg',        'length' => 29, 'width' => 3,  'thickness' => 3.0,   'quantity' => 4]);
        CutListPiece::create(['project_id' => $projects[0]->id, 'label' => 'Apron Long',         'length' => 60, 'width' => 5,  'thickness' => 0.875, 'quantity' => 2]);
        CutListPiece::create(['project_id' => $projects[0]->id, 'label' => 'Apron Short',        'length' => 24, 'width' => 5,  'thickness' => 0.875, 'quantity' => 2]);
    }
}
