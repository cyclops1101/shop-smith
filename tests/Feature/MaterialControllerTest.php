<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MaterialControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_is_redirected_from_materials(): void
    {
        $response = $this->get('/materials');

        $response->assertRedirect();
    }

    #[Test]
    public function test_authenticated_user_can_view_materials_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/materials');

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_create_material_form(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/materials/create');

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_material(): void
    {
        $user = User::factory()->create();
        $material = Material::factory()->create();

        $response = $this->actingAs($user)->get('/materials/' . $material->id);

        $response->assertOk();
    }
}
