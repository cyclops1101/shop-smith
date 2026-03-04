<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectPhoto;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PortfolioControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function portfolio_is_publicly_accessible(): void
    {
        $response = $this->get('/portfolio');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Portfolio/Index')
            ->has('photos')
            ->has('tags')
        );
    }

    #[Test]
    public function portfolio_shows_only_portfolio_flagged_photos(): void
    {
        $project = Project::factory()->create();
        ProjectPhoto::factory()->create(['project_id' => $project->id, 'is_portfolio' => true, 'caption' => 'Show me']);
        ProjectPhoto::factory()->create(['project_id' => $project->id, 'is_portfolio' => false, 'caption' => 'Hide me']);

        $response = $this->get('/portfolio');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Portfolio/Index')
            ->has('photos', 1)
            ->where('photos.0.caption', 'Show me')
        );
    }

    #[Test]
    public function portfolio_includes_project_title(): void
    {
        $project = Project::factory()->create(['title' => 'Walnut Table']);
        ProjectPhoto::factory()->create(['project_id' => $project->id, 'is_portfolio' => true]);

        $response = $this->get('/portfolio');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('photos.0.project_title', 'Walnut Table')
        );
    }

    #[Test]
    public function portfolio_filters_by_tag(): void
    {
        $tag1 = Tag::create(['name' => 'Walnut', 'color' => '#6B4226']);
        $tag2 = Tag::create(['name' => 'Maple', 'color' => '#F39C12']);

        $project1 = Project::factory()->create();
        $project1->tags()->attach($tag1);
        ProjectPhoto::factory()->create(['project_id' => $project1->id, 'is_portfolio' => true, 'caption' => 'Walnut piece']);

        $project2 = Project::factory()->create();
        $project2->tags()->attach($tag2);
        ProjectPhoto::factory()->create(['project_id' => $project2->id, 'is_portfolio' => true, 'caption' => 'Maple piece']);

        $response = $this->get('/portfolio?tag=' . $tag1->id);

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('photos', 1)
            ->where('photos.0.caption', 'Walnut piece')
        );
    }

    #[Test]
    public function portfolio_tags_list_only_includes_tags_with_portfolio_photos(): void
    {
        $tag1 = Tag::create(['name' => 'Walnut', 'color' => '#6B4226']);
        $tag2 = Tag::create(['name' => 'Unused', 'color' => '#999999']);

        $project = Project::factory()->create();
        $project->tags()->attach($tag1);
        ProjectPhoto::factory()->create(['project_id' => $project->id, 'is_portfolio' => true]);

        $response = $this->get('/portfolio');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('tags', 1)
            ->where('tags.0.name', 'Walnut')
        );
    }

    #[Test]
    public function portfolio_photos_include_tags(): void
    {
        $tag = Tag::create(['name' => 'Cherry', 'color' => '#C0392B']);
        $project = Project::factory()->create();
        $project->tags()->attach($tag);
        ProjectPhoto::factory()->create(['project_id' => $project->id, 'is_portfolio' => true]);

        $response = $this->get('/portfolio');

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('photos.0.tags', 1)
            ->where('photos.0.tags.0.name', 'Cherry')
        );
    }
}
