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
    public function guest_is_redirected_from_projects(): void
    {
        $response = $this->get('/projects');

        $response->assertRedirect('/login');
    }

    #[Test]
    public function authenticated_user_can_view_projects_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/projects');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Projects/Index')
            ->has('projects')
            ->has('filters')
        );
    }

    #[Test]
    public function projects_index_filters_by_search(): void
    {
        $user = User::factory()->create();
        Project::factory()->create(['title' => 'First Project']);
        Project::factory()->create(['title' => 'Second Project']);

        $response = $this->actingAs($user)->get('/projects?search=First');

        $response->assertOk();
    }

    #[Test]
    public function projects_index_filters_by_status(): void
    {
        $user = User::factory()->create();
        Project::factory()->create(['status' => 'planned']);
        Project::factory()->create(['status' => 'completed']);

        $response = $this->actingAs($user)->get('/projects?status=planned');

        $response->assertOk();
    }

    #[Test]
    public function create_page_returns_statuses_and_priorities(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/projects/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Projects/Create')
            ->has('statuses')
            ->has('priorities')
        );
    }

    #[Test]
    public function store_creates_project_and_redirects(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/projects', [
            'title' => 'Test Project',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('projects', ['title' => 'Test Project']);

        $project = Project::where('title', 'Test Project')->first();
        $response->assertRedirect(route('projects.show', $project));
    }

    #[Test]
    public function store_with_missing_title_returns_validation_error(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/projects', []);

        $response->assertSessionHasErrors(['title']);
    }

    #[Test]
    public function show_returns_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->get('/projects/' . $project->slug);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Projects/Show')
            ->has('project')
        );
    }

    #[Test]
    public function edit_returns_project_with_options(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->get('/projects/' . $project->slug . '/edit');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Projects/Edit')
            ->has('project')
            ->has('statuses')
            ->has('priorities')
        );
    }

    #[Test]
    public function update_saves_changes(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['title' => 'Original Title']);

        $response = $this->actingAs($user)->patch('/projects/' . $project->slug, [
            'title' => 'Updated Title',
        ]);

        $response->assertRedirect(route('projects.show', $project));
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'Updated Title']);
    }

    #[Test]
    public function update_with_invalid_status_returns_validation_error(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->patch('/projects/' . $project->slug, [
            'status' => 'invalid',
        ]);

        $response->assertSessionHasErrors(['status']);
    }

    #[Test]
    public function destroy_soft_deletes_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->delete('/projects/' . $project->slug);

        $response->assertRedirect(route('projects.index'));
        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }
}
