<?php

namespace Tests\Feature;

use App\Models\MaintenanceLog;
use App\Models\MaintenanceSchedule;
use App\Models\Tool;
use App\Models\ToolCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ToolControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // -------------------------------------------------------------------------
    // Auth
    // -------------------------------------------------------------------------

    #[Test]
    public function guest_is_redirected_from_tools(): void
    {
        $this->get('/tools')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    #[Test]
    public function authenticated_user_can_view_tools_index(): void
    {
        $response = $this->actingAs($this->user)->get('/tools');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tools/Index')
            ->has('tools')
            ->has('filters')
            ->has('categories')
        );
    }

    #[Test]
    public function index_filters_by_category(): void
    {
        $categoryA = ToolCategory::factory()->create();
        $categoryB = ToolCategory::factory()->create();

        Tool::factory()->create(['name' => 'Tool A', 'category_id' => $categoryA->id]);
        Tool::factory()->create(['name' => 'Tool B', 'category_id' => $categoryB->id]);

        $response = $this->actingAs($this->user)->get('/tools?category=' . $categoryA->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('tools.data', 1)
        );
    }

    #[Test]
    public function index_search_returns_tools(): void
    {
        $uniqueName = 'UniqueTableSaw98765XYZ';
        Tool::factory()->create(['name' => $uniqueName]);

        $response = $this->actingAs($this->user)->get('/tools?search=' . $uniqueName);

        $response->assertOk();
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    #[Test]
    public function create_page_returns_categories_and_maintenance_types(): void
    {
        $response = $this->actingAs($this->user)->get('/tools/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tools/Create')
            ->has('categories')
            ->has('maintenanceTypes')
        );
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    #[Test]
    public function store_creates_tool_and_redirects_to_show(): void
    {
        $response = $this->actingAs($this->user)->post('/tools', [
            'name' => 'Test Table Saw',
        ]);

        $this->assertDatabaseHas('tools', ['name' => 'Test Table Saw']);

        $tool = Tool::where('name', 'Test Table Saw')->first();
        $response->assertRedirect(route('tools.show', $tool));
    }

    #[Test]
    public function store_requires_name(): void
    {
        $response = $this->actingAs($this->user)->post('/tools', [
            'brand' => 'DeWalt',
        ]);

        $response->assertSessionHasErrors(['name']);
    }

    #[Test]
    public function store_rejects_invalid_category_id(): void
    {
        $response = $this->actingAs($this->user)->post('/tools', [
            'name'        => 'Test Tool',
            'category_id' => 'not-valid',
        ]);

        $response->assertSessionHasErrors(['category_id']);
    }

    #[Test]
    public function store_rejects_invalid_manual_url(): void
    {
        $response = $this->actingAs($this->user)->post('/tools', [
            'name'       => 'Test Tool',
            'manual_url' => 'not-a-url',
        ]);

        $response->assertSessionHasErrors(['manual_url']);
    }

    // -------------------------------------------------------------------------
    // Show
    // -------------------------------------------------------------------------

    #[Test]
    public function show_returns_tool_with_maintenance_data(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->get('/tools/' . $tool->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tools/Show')
            ->has('tool')
            ->has('maintenanceTypes')
        );
    }

    // -------------------------------------------------------------------------
    // Edit
    // -------------------------------------------------------------------------

    #[Test]
    public function edit_returns_tool_with_categories(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->get('/tools/' . $tool->id . '/edit');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tools/Edit')
            ->has('tool')
            ->has('categories')
        );
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    #[Test]
    public function update_saves_changes_and_redirects_to_show(): void
    {
        $tool = Tool::factory()->create(['name' => 'Original Name']);

        $response = $this->actingAs($this->user)->patch('/tools/' . $tool->id, [
            'name' => 'Updated',
        ]);

        $this->assertDatabaseHas('tools', ['id' => $tool->id, 'name' => 'Updated']);
        $response->assertRedirect(route('tools.show', $tool));
    }

    #[Test]
    public function update_with_invalid_purchase_price_returns_error(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->patch('/tools/' . $tool->id, [
            'purchase_price' => 'not-a-number',
        ]);

        $response->assertSessionHasErrors(['purchase_price']);
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    #[Test]
    public function destroy_soft_deletes_tool(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->delete('/tools/' . $tool->id);

        $response->assertRedirect(route('tools.index'));
        $this->assertSoftDeleted('tools', ['id' => $tool->id]);
    }

    // -------------------------------------------------------------------------
    // Log Maintenance
    // -------------------------------------------------------------------------

    #[Test]
    public function log_maintenance_creates_log_entry(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/maintenance', [
            'maintenance_type' => 'cleaning',
            'description'      => 'Cleaned the blade guard and table surface.',
            'performed_at'     => '2026-03-01',
        ]);

        $this->assertDatabaseHas('maintenance_logs', [
            'tool_id'          => $tool->id,
            'maintenance_type' => 'cleaning',
            'description'      => 'Cleaned the blade guard and table surface.',
        ]);
        $response->assertRedirect(route('tools.show', $tool));
    }

    #[Test]
    public function log_maintenance_requires_maintenance_type(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/maintenance', [
            'description'  => 'Cleaned the blade.',
            'performed_at' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['maintenance_type']);
    }

    #[Test]
    public function log_maintenance_requires_description(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/maintenance', [
            'maintenance_type' => 'cleaning',
            'performed_at'     => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['description']);
    }

    #[Test]
    public function log_maintenance_requires_performed_at(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/maintenance', [
            'maintenance_type' => 'cleaning',
            'description'      => 'Cleaned the blade.',
        ]);

        $response->assertSessionHasErrors(['performed_at']);
    }

    #[Test]
    public function log_maintenance_updates_schedule_next_due_at(): void
    {
        $tool = Tool::factory()->create();
        $schedule = MaintenanceSchedule::factory()->create([
            'tool_id'       => $tool->id,
            'interval_days' => 30,
        ]);

        $this->actingAs($this->user)->post('/tools/' . $tool->id . '/maintenance', [
            'maintenance_type' => 'cleaning',
            'description'      => 'Routine cleaning completed.',
            'performed_at'     => '2026-03-01',
            'schedule_id'      => $schedule->id,
        ]);

        $schedule->refresh();

        $this->assertEquals('2026-03-01', $schedule->last_performed_at->format('Y-m-d'));
        $this->assertEquals('2026-03-31', $schedule->next_due_at->format('Y-m-d'));
    }

    // -------------------------------------------------------------------------
    // Schedule Management
    // -------------------------------------------------------------------------

    #[Test]
    public function store_schedule_creates_maintenance_schedule(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/schedules', [
            'maintenance_type' => 'cleaning',
            'task'             => 'Clean blade and table surface',
            'interval_days'    => 30,
        ]);

        $this->assertDatabaseHas('maintenance_schedules', [
            'tool_id'          => $tool->id,
            'maintenance_type' => 'cleaning',
            'task'             => 'Clean blade and table surface',
            'interval_days'    => 30,
        ]);
        $response->assertRedirect(route('tools.show', $tool));
    }

    #[Test]
    public function store_schedule_requires_task(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/schedules', [
            'maintenance_type' => 'cleaning',
            'interval_days'    => 30,
        ]);

        $response->assertSessionHasErrors(['task']);
    }

    #[Test]
    public function store_schedule_requires_at_least_one_interval(): void
    {
        $tool = Tool::factory()->create();

        $response = $this->actingAs($this->user)->post('/tools/' . $tool->id . '/schedules', [
            'maintenance_type' => 'cleaning',
            'task'             => 'Clean blade and table surface',
        ]);

        $response->assertSessionHasErrors(['interval_days']);
    }

    #[Test]
    public function destroy_schedule_hard_deletes_schedule(): void
    {
        $tool = Tool::factory()->create();
        $schedule = MaintenanceSchedule::factory()->create([
            'tool_id'       => $tool->id,
            'interval_days' => 14,
        ]);

        $response = $this->actingAs($this->user)->delete('/tools/' . $tool->id . '/schedules/' . $schedule->id);

        $this->assertDatabaseMissing('maintenance_schedules', ['id' => $schedule->id]);
        $response->assertRedirect(route('tools.show', $tool));
    }

    // -------------------------------------------------------------------------
    // Model Scopes (no HTTP)
    // -------------------------------------------------------------------------

    #[Test]
    public function overdue_scope_returns_schedules_with_past_next_due_at(): void
    {
        $tool = Tool::factory()->create();

        // Overdue: next_due_at in the past
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => now()->subDays(5),
        ]);

        // Not overdue: next_due_at in the future
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => now()->addDays(10),
        ]);

        // No due date at all
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => null,
        ]);

        $this->assertEquals(1, MaintenanceSchedule::overdue()->count());
    }

    #[Test]
    public function due_soon_scope_returns_schedules_within_seven_days(): void
    {
        $tool = Tool::factory()->create();

        // Due soon: 3 days from now (within 7-day window)
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => now()->addDays(3),
        ]);

        // Not due soon: 14 days from now (outside 7-day window)
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => now()->addDays(14),
        ]);

        // Overdue (past): should not appear in due soon
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => now()->subDays(2),
        ]);

        // No due date: should not appear in due soon
        MaintenanceSchedule::factory()->create([
            'tool_id'      => $tool->id,
            'interval_days' => 30,
            'next_due_at'  => null,
        ]);

        $this->assertEquals(1, MaintenanceSchedule::dueSoon()->count());
    }
}
