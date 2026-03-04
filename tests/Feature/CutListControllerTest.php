<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CutListControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_is_redirected_from_cut_list(): void
    {
        $response = $this->get('/cut-list');

        $response->assertRedirect();
    }

    #[Test]
    public function test_authenticated_user_can_view_cut_list_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/cut-list');

        $response->assertOk();
    }
}
