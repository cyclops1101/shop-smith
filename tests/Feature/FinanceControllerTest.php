<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Project;
use App\Models\Revenue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FinanceControllerTest extends TestCase
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
    public function guest_is_redirected_from_finance(): void
    {
        $this->get('/finance')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    #[Test]
    public function authenticated_user_can_view_finance_index(): void
    {
        $response = $this->actingAs($this->user)->get('/finance');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Finance/Index')
            ->has('expenses')
            ->has('revenues')
            ->has('summary')
            ->has('monthlyChart')
            ->has('expensesByCategory')
            ->has('projectProfit')
            ->has('categories')
            ->has('projects')
            ->has('suppliers')
        );
    }

    #[Test]
    public function index_summary_totals_are_correct(): void
    {
        Expense::factory()->create([
            'amount'       => '100.00',
            'expense_date' => '2026-03-01',
        ]);

        Expense::factory()->create([
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
        ]);

        Revenue::factory()->create([
            'amount'        => '300.00',
            'received_date' => '2026-03-01',
        ]);

        $response = $this->actingAs($this->user)->get('/finance');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.totalExpenses', fn ($v) => (float) $v === 150.0)
            ->where('summary.totalRevenues', fn ($v) => (float) $v === 300.0)
            ->where('summary.netIncome', fn ($v) => (float) $v === 150.0)
        );
    }

    #[Test]
    public function index_monthly_chart_has_twelve_entries(): void
    {
        $response = $this->actingAs($this->user)->get('/finance');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('monthlyChart', 12)
        );
    }

    #[Test]
    public function index_project_profit_includes_projects_with_finances(): void
    {
        $project = Project::factory()->create(['title' => 'Oak Bookshelf']);

        Expense::factory()->create([
            'project_id'   => $project->id,
            'amount'       => '75.00',
            'expense_date' => '2026-03-01',
        ]);

        $response = $this->actingAs($this->user)->get('/finance');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('projectProfit', 1)
            ->where('projectProfit.0.id', $project->id)
        );
    }

    // -------------------------------------------------------------------------
    // Store Expense
    // -------------------------------------------------------------------------

    #[Test]
    public function store_expense_creates_record(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'     => 'materials',
            'description'  => 'Test expense description',
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
        ]);

        $this->assertDatabaseHas('expenses', [
            'category'    => 'materials',
            'description' => 'Test expense description',
            'amount'      => '50.00',
        ]);

        $response->assertRedirect();
    }

    #[Test]
    public function store_expense_with_project(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'     => 'materials',
            'description'  => 'Test expense with project',
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
            'project_id'   => $project->id,
        ]);

        $this->assertDatabaseHas('expenses', [
            'description' => 'Test expense with project',
            'project_id'  => $project->id,
        ]);

        $response->assertRedirect();
    }

    #[Test]
    public function store_expense_with_receipt(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('receipt.jpg');

        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'     => 'materials',
            'description'  => 'Test expense with receipt',
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
            'receipt'      => $file,
        ]);

        $response->assertRedirect();

        $expense = Expense::where('description', 'Test expense with receipt')->first();

        $this->assertNotNull($expense);
        $this->assertNotNull($expense->receipt_path);

        Storage::disk('public')->assertExists($expense->receipt_path);
    }

    #[Test]
    public function store_expense_requires_category(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'description'  => 'Test',
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['category']);
    }

    #[Test]
    public function store_expense_rejects_invalid_category(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'     => 'invalid',
            'description'  => 'Test',
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['category']);
    }

    #[Test]
    public function store_expense_requires_description(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'     => 'materials',
            'amount'       => '50.00',
            'expense_date' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['description']);
    }

    #[Test]
    public function store_expense_requires_amount(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'     => 'materials',
            'description'  => 'Test',
            'expense_date' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['amount']);
    }

    #[Test]
    public function store_expense_requires_expense_date(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/expenses', [
            'category'    => 'materials',
            'description' => 'Test',
            'amount'      => '50.00',
        ]);

        $response->assertSessionHasErrors(['expense_date']);
    }

    // -------------------------------------------------------------------------
    // Store Revenue
    // -------------------------------------------------------------------------

    #[Test]
    public function store_revenue_creates_record(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/revenues', [
            'description'   => 'Test revenue description',
            'amount'        => '100.00',
            'received_date' => '2026-03-01',
        ]);

        $this->assertDatabaseHas('revenues', [
            'description' => 'Test revenue description',
            'amount'      => '100.00',
        ]);

        $response->assertRedirect();
    }

    #[Test]
    public function store_revenue_with_project(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->user)->post('/finance/revenues', [
            'description'   => 'Test revenue with project',
            'amount'        => '100.00',
            'received_date' => '2026-03-01',
            'project_id'    => $project->id,
        ]);

        $this->assertDatabaseHas('revenues', [
            'description' => 'Test revenue with project',
            'project_id'  => $project->id,
        ]);

        $response->assertRedirect();
    }

    #[Test]
    public function store_revenue_requires_description(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/revenues', [
            'amount'        => '100.00',
            'received_date' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['description']);
    }

    #[Test]
    public function store_revenue_requires_amount(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/revenues', [
            'description'   => 'Test',
            'received_date' => '2026-03-01',
        ]);

        $response->assertSessionHasErrors(['amount']);
    }

    #[Test]
    public function store_revenue_requires_received_date(): void
    {
        $response = $this->actingAs($this->user)->post('/finance/revenues', [
            'description' => 'Test',
            'amount'      => '100.00',
        ]);

        $response->assertSessionHasErrors(['received_date']);
    }

    // -------------------------------------------------------------------------
    // Destroy Expense
    // -------------------------------------------------------------------------

    #[Test]
    public function destroy_expense_hard_deletes(): void
    {
        $expense = Expense::factory()->create();

        $response = $this->actingAs($this->user)->delete('/finance/expenses/' . $expense->id);

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);

        $response->assertRedirect();
    }

    #[Test]
    public function destroy_expense_deletes_receipt_file(): void
    {
        Storage::fake('public');

        $receiptPath = 'receipts/test-receipt.jpg';
        Storage::disk('public')->put($receiptPath, 'fake image content');

        $expense = Expense::factory()->create([
            'receipt_path' => $receiptPath,
        ]);

        Storage::disk('public')->assertExists($receiptPath);

        $this->actingAs($this->user)->delete('/finance/expenses/' . $expense->id);

        Storage::disk('public')->assertMissing($receiptPath);
    }

    // -------------------------------------------------------------------------
    // Destroy Revenue
    // -------------------------------------------------------------------------

    #[Test]
    public function destroy_revenue_hard_deletes(): void
    {
        $revenue = Revenue::factory()->create();

        $response = $this->actingAs($this->user)->delete('/finance/revenues/' . $revenue->id);

        $this->assertDatabaseMissing('revenues', ['id' => $revenue->id]);

        $response->assertRedirect();
    }
}
