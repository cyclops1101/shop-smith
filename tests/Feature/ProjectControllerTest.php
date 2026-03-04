<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProjectControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_is_redirected_from_projects(): void
    {
        $response = $this->get('/projects');

        $response->assertRedirect('/login');
    }

    #[Test]
    public function test_authenticated_user_can_view_projects_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/projects');

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_create_project_form(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/projects/create');

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->get('/projects/' . $project->slug);

        $response->assertOk();
    }

    #[Test]
    public function test_authenticated_user_can_view_edit_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->get('/projects/' . $project->slug . '/edit');

        $response->assertOk();
    }
}
