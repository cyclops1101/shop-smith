<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Models\Expense;
use App\Models\MaintenanceSchedule;
use App\Models\Material;
use App\Models\Project;
use App\Models\Revenue;
use App\Models\TimeEntry;
use App\Models\Tool;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function guest_is_redirected_from_dashboard(): void
    {
        $response = $this->get('/dashboard');

        $response->assertRedirect('/login');
    }

    #[Test]
    public function authenticated_user_can_view_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('activeProjects')
            ->has('lowStockMaterials')
            ->has('overdueSchedules')
            ->has('dueSoonSchedules')
            ->has('recentActivity')
            ->has('financeSummary')
        );
    }

    #[Test]
    public function active_projects_includes_in_progress(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['status' => ProjectStatus::InProgress]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('activeProjects', 1)
            ->where('activeProjects.0.id', $project->id)
        );
    }

    #[Test]
    public function active_projects_excludes_completed(): void
    {
        $user = User::factory()->create();
        Project::factory()->create(['status' => ProjectStatus::Completed]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('activeProjects', 0)
        );
    }

    #[Test]
    public function active_projects_include_total_hours(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['status' => ProjectStatus::InProgress]);

        TimeEntry::factory()->create([
            'project_id'       => $project->id,
            'duration_minutes' => 120,
        ]);

        TimeEntry::factory()->create([
            'project_id'       => $project->id,
            'duration_minutes' => 60,
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('activeProjects', 1)
            ->where('activeProjects.0.total_hours', fn ($v) => (float) $v === 3.0)
        );
    }

    #[Test]
    public function low_stock_materials_appear(): void
    {
        $user = User::factory()->create();
        $material = Material::factory()->withCategory()->create([
            'quantity_on_hand'    => 2,
            'low_stock_threshold' => 5,
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('lowStockMaterials', 1)
            ->where('lowStockMaterials.0.id', $material->id)
        );
    }

    #[Test]
    public function well_stocked_materials_excluded(): void
    {
        $user = User::factory()->create();
        Material::factory()->withCategory()->create([
            'quantity_on_hand'    => 10,
            'low_stock_threshold' => 5,
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('lowStockMaterials', 0)
        );
    }

    #[Test]
    public function overdue_schedules_appear(): void
    {
        $user = User::factory()->create();
        $tool = Tool::factory()->withCategory()->create();
        $schedule = MaintenanceSchedule::factory()->create([
            'tool_id'     => $tool->id,
            'next_due_at' => now()->subDays(3),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('overdueSchedules', 1)
            ->where('overdueSchedules.0.id', $schedule->id)
        );
    }

    #[Test]
    public function due_soon_schedules_appear(): void
    {
        $user = User::factory()->create();
        $tool = Tool::factory()->withCategory()->create();
        $schedule = MaintenanceSchedule::factory()->create([
            'tool_id'     => $tool->id,
            'next_due_at' => now()->addDays(3),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('dueSoonSchedules', 1)
            ->where('dueSoonSchedules.0.id', $schedule->id)
        );
    }

    #[Test]
    public function finance_summary_current_month(): void
    {
        $user = User::factory()->create();

        Expense::factory()->create([
            'amount'       => '150.00',
            'expense_date' => now()->format('Y-m-d'),
        ]);

        Revenue::factory()->create([
            'amount'        => '500.00',
            'received_date' => now()->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('financeSummary.monthExpenses', fn ($v) => (float) $v === 150.0)
            ->where('financeSummary.monthRevenues', fn ($v) => (float) $v === 500.0)
            ->where('financeSummary.monthNet', fn ($v) => (float) $v === 350.0)
        );
    }

    #[Test]
    public function recent_activity_includes_time_entries(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        TimeEntry::factory()->create([
            'project_id'       => $project->id,
            'started_at'       => now()->subHour(),
            'ended_at'         => now(),
            'duration_minutes' => 60,
            'description'      => 'Sanding the tabletop',
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('recentActivity', 1)
            ->where('recentActivity.0.type', 'time')
        );
    }
}
