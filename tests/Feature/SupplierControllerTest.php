<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SupplierControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    #[Test]
    public function guest_is_redirected_from_suppliers(): void
    {
        $response = $this->get('/suppliers');

        $response->assertRedirect('/login');
    }

    #[Test]
    public function authenticated_user_can_view_suppliers_index(): void
    {
        $response = $this->actingAs($this->user)->get('/suppliers');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Suppliers/Index')
            ->has('suppliers')
            ->has('filters')
        );
    }

    #[Test]
    public function index_search_filters_by_name(): void
    {
        Supplier::factory()->create(['name' => 'Acme Lumber']);
        Supplier::factory()->create(['name' => 'Beta Hardware']);

        $response = $this->actingAs($this->user)->get('/suppliers?search=Acme');

        $response->assertOk();
    }

    #[Test]
    public function create_page_renders(): void
    {
        $response = $this->actingAs($this->user)->get('/suppliers/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Suppliers/Create')
        );
    }

    #[Test]
    public function store_creates_supplier_and_redirects_to_show(): void
    {
        $response = $this->actingAs($this->user)->post('/suppliers', [
            'name' => 'Test Supplier',
        ]);

        $this->assertDatabaseHas('suppliers', ['name' => 'Test Supplier']);
        $response->assertRedirect();
    }

    #[Test]
    public function store_requires_name(): void
    {
        $response = $this->actingAs($this->user)->post('/suppliers', []);

        $response->assertSessionHasErrors(['name']);
    }

    #[Test]
    public function store_rejects_invalid_email(): void
    {
        $response = $this->actingAs($this->user)->post('/suppliers', [
            'name'  => 'Test',
            'email' => 'not-an-email',
        ]);

        $response->assertSessionHasErrors(['email']);
    }

    #[Test]
    public function store_rejects_invalid_website_url(): void
    {
        $response = $this->actingAs($this->user)->post('/suppliers', [
            'name'    => 'Test',
            'website' => 'not-a-url',
        ]);

        $response->assertSessionHasErrors(['website']);
    }

    #[Test]
    public function show_returns_supplier(): void
    {
        $supplier = Supplier::factory()->create();

        $response = $this->actingAs($this->user)->get('/suppliers/' . $supplier->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Suppliers/Show')
            ->has('supplier')
        );
    }

    #[Test]
    public function edit_returns_supplier(): void
    {
        $supplier = Supplier::factory()->create();

        $response = $this->actingAs($this->user)->get('/suppliers/' . $supplier->id . '/edit');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Suppliers/Edit')
            ->has('supplier')
        );
    }

    #[Test]
    public function update_saves_changes_and_redirects_to_show(): void
    {
        $supplier = Supplier::factory()->create(['name' => 'Original Name']);

        $response = $this->actingAs($this->user)->patch('/suppliers/' . $supplier->id, [
            'name' => 'Updated Name',
        ]);

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'name' => 'Updated Name']);
        $response->assertRedirect();
    }

    #[Test]
    public function update_with_invalid_email_returns_error(): void
    {
        $supplier = Supplier::factory()->create();

        $response = $this->actingAs($this->user)->patch('/suppliers/' . $supplier->id, [
            'email' => 'bad',
        ]);

        $response->assertSessionHasErrors(['email']);
    }

    #[Test]
    public function destroy_hard_deletes_supplier(): void
    {
        $supplier = Supplier::factory()->create();

        $response = $this->actingAs($this->user)->delete('/suppliers/' . $supplier->id);

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
        $response->assertRedirect(route('suppliers.index'));
    }

    #[Test]
    public function destroy_nullifies_supplier_id_on_related_materials(): void
    {
        $supplier = Supplier::factory()->create();
        $material = Material::factory()->create([
            'supplier_id'      => $supplier->id,
            'unit'             => 'piece',
            'quantity_on_hand' => 1,
        ]);

        $this->actingAs($this->user)->delete('/suppliers/' . $supplier->id);

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
        $this->assertDatabaseHas('materials', ['id' => $material->id, 'supplier_id' => null]);
    }
}
