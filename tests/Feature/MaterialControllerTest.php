<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MaterialControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    #[Test]
    public function guest_is_redirected_from_materials(): void
    {
        $this->get('/materials')->assertRedirect('/login');
    }

    #[Test]
    public function authenticated_user_can_view_materials_index(): void
    {
        $response = $this->actingAs($this->user)->get('/materials');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Materials/Index')
            ->has('materials')
            ->has('filters')
            ->has('categories')
            ->has('suppliers')
        );
    }

    #[Test]
    public function index_filters_by_category(): void
    {
        $categoryA = MaterialCategory::factory()->create();
        $categoryB = MaterialCategory::factory()->create();

        Material::factory()->create(['name' => 'Material A', 'unit' => 'piece', 'category_id' => $categoryA->id]);
        Material::factory()->create(['name' => 'Material B', 'unit' => 'piece', 'category_id' => $categoryB->id]);

        $response = $this->actingAs($this->user)->get('/materials?category=' . $categoryA->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('materials.data', 1)
        );
    }

    #[Test]
    public function index_filters_by_supplier(): void
    {
        $supplierA = Supplier::factory()->create();
        $supplierB = Supplier::factory()->create();

        Material::factory()->create(['name' => 'Material A', 'unit' => 'piece', 'supplier_id' => $supplierA->id]);
        Material::factory()->create(['name' => 'Material B', 'unit' => 'piece', 'supplier_id' => $supplierB->id]);

        $response = $this->actingAs($this->user)->get('/materials?supplier=' . $supplierA->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('materials.data', 1)
        );
    }

    #[Test]
    public function index_search_returns_materials(): void
    {
        $uniqueName = 'UniqueOakLumber12345';
        Material::factory()->create(['name' => $uniqueName, 'unit' => 'piece']);

        $response = $this->actingAs($this->user)->get('/materials?search=' . $uniqueName);

        $response->assertOk();
    }

    #[Test]
    public function create_page_returns_units_categories_and_suppliers(): void
    {
        $response = $this->actingAs($this->user)->get('/materials/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Materials/Create')
            ->has('units')
            ->has('categories')
            ->has('suppliers')
        );
    }

    #[Test]
    public function store_creates_material_and_redirects_to_show(): void
    {
        $response = $this->actingAs($this->user)->post('/materials', [
            'name'             => 'Test Material',
            'unit'             => 'piece',
            'quantity_on_hand' => 10,
        ]);

        $this->assertDatabaseHas('materials', ['name' => 'Test Material']);

        $material = Material::where('name', 'Test Material')->first();
        $response->assertRedirect(route('materials.show', $material));
    }

    #[Test]
    public function store_requires_name(): void
    {
        $response = $this->actingAs($this->user)->post('/materials', [
            'unit'             => 'piece',
            'quantity_on_hand' => 10,
        ]);

        $response->assertSessionHasErrors(['name']);
    }

    #[Test]
    public function store_requires_unit(): void
    {
        $response = $this->actingAs($this->user)->post('/materials', [
            'name'             => 'Test Material',
            'quantity_on_hand' => 10,
        ]);

        $response->assertSessionHasErrors(['unit']);
    }

    #[Test]
    public function store_rejects_invalid_unit_value(): void
    {
        $response = $this->actingAs($this->user)->post('/materials', [
            'name'             => 'Test Material',
            'unit'             => 'invalid',
            'quantity_on_hand' => 10,
        ]);

        $response->assertSessionHasErrors(['unit']);
    }

    #[Test]
    public function show_returns_material_with_component(): void
    {
        $material = Material::factory()->create(['unit' => 'piece']);

        $response = $this->actingAs($this->user)->get('/materials/' . $material->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Materials/Show')
            ->has('material')
        );
    }

    #[Test]
    public function edit_returns_material_with_options(): void
    {
        $material = Material::factory()->create(['unit' => 'piece']);

        $response = $this->actingAs($this->user)->get('/materials/' . $material->id . '/edit');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Materials/Edit')
            ->has('material')
            ->has('units')
            ->has('categories')
            ->has('suppliers')
        );
    }

    #[Test]
    public function update_saves_changes_and_redirects_to_show(): void
    {
        $material = Material::factory()->create([
            'name' => 'Original Name',
            'unit' => 'piece',
        ]);

        $response = $this->actingAs($this->user)->patch('/materials/' . $material->id, [
            'name' => 'Updated Name',
        ]);

        $this->assertDatabaseHas('materials', ['id' => $material->id, 'name' => 'Updated Name']);
        $response->assertRedirect(route('materials.show', $material));
    }

    #[Test]
    public function update_with_invalid_unit_returns_error(): void
    {
        $material = Material::factory()->create(['unit' => 'piece']);

        $response = $this->actingAs($this->user)->patch('/materials/' . $material->id, [
            'unit' => 'bad',
        ]);

        $response->assertSessionHasErrors(['unit']);
    }

    #[Test]
    public function destroy_soft_deletes_material(): void
    {
        $material = Material::factory()->create(['unit' => 'piece']);

        $response = $this->actingAs($this->user)->delete('/materials/' . $material->id);

        $response->assertRedirect(route('materials.index'));
        $this->assertSoftDeleted('materials', ['id' => $material->id]);
    }

    #[Test]
    public function adjust_stock_increments_quantity(): void
    {
        $material = Material::factory()->create([
            'unit'             => 'piece',
            'quantity_on_hand' => 10,
        ]);

        $this->actingAs($this->user)->post('/materials/' . $material->id . '/adjust', [
            'quantity' => 5,
        ]);

        $this->assertDatabaseHas('materials', ['id' => $material->id, 'quantity_on_hand' => 15]);
    }

    #[Test]
    public function adjust_stock_decrements_quantity(): void
    {
        $material = Material::factory()->create([
            'unit'             => 'piece',
            'quantity_on_hand' => 10,
        ]);

        $this->actingAs($this->user)->post('/materials/' . $material->id . '/adjust', [
            'quantity' => -3,
        ]);

        $this->assertDatabaseHas('materials', ['id' => $material->id, 'quantity_on_hand' => 7]);
    }

    #[Test]
    public function adjust_stock_cannot_go_below_zero(): void
    {
        $material = Material::factory()->create([
            'unit'             => 'piece',
            'quantity_on_hand' => 5,
        ]);

        $this->actingAs($this->user)->post('/materials/' . $material->id . '/adjust', [
            'quantity' => -100,
        ]);

        $this->assertDatabaseHas('materials', ['id' => $material->id, 'quantity_on_hand' => 0]);
    }

    #[Test]
    public function adjust_stock_requires_quantity(): void
    {
        $material = Material::factory()->create(['unit' => 'piece']);

        $response = $this->actingAs($this->user)->post('/materials/' . $material->id . '/adjust', []);

        $response->assertSessionHasErrors(['quantity']);
    }

    #[Test]
    public function low_stock_scope_returns_only_materials_at_or_below_threshold(): void
    {
        $materialA = Material::factory()->create([
            'unit'                => 'piece',
            'quantity_on_hand'    => 2,
            'low_stock_threshold' => 5,
        ]);

        $materialB = Material::factory()->create([
            'unit'                => 'piece',
            'quantity_on_hand'    => 10,
            'low_stock_threshold' => 5,
        ]);

        $materialC = Material::factory()->create([
            'unit'                => 'piece',
            'quantity_on_hand'    => 1,
            'low_stock_threshold' => null,
        ]);

        $this->assertEquals(1, Material::lowStock()->count());
        $this->assertEquals($materialA->id, Material::lowStock()->first()->id);
    }
}
