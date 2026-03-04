<?php

namespace Tests\Feature;

use App\Models\Tool;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ToolControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_is_redirected_from_tools(): void
    {
        $response = $this->get('/tools');

        $response->assertRedirect();
    }

    #[Test]
    public function test_authenticated_user_can_view_tools_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/tools');

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_create_tool_form(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/tools/create');

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_tool(): void
    {
        $user = User::factory()->create();
        $tool = Tool::factory()->create();

        $response = $this->actingAs($user)->get('/tools/' . $tool->id);

        $response->assertOk();
    }
}
