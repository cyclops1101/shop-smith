<?php

namespace Tests\Feature;

use App\Models\CutListBoard;
use App\Models\CutListPiece;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CutListControllerTest extends TestCase
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
    public function guest_is_redirected_from_cut_list(): void
    {
        $this->get('/cut-list')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    #[Test]
    public function authenticated_user_can_view_cut_list(): void
    {
        $response = $this->actingAs($this->user)->get('/cut-list');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('CutList/Index')
            ->has('projects')
            ->has('materials')
            ->has('selectedProject')
            ->has('boards')
            ->has('pieces')
            ->has('result')
        );
    }

    #[Test]
    public function index_with_project_returns_boards_and_pieces(): void
    {
        $project = Project::factory()->create();

        CutListBoard::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Plywood Sheet',
            'length'     => 48,
            'width'      => 24,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        CutListPiece::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Shelf Side',
            'length'     => 24,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($this->user)->get('/cut-list?project=' . $project->id);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('boards', 1)
            ->has('pieces', 1)
        );
    }

    // -------------------------------------------------------------------------
    // Store Board
    // -------------------------------------------------------------------------

    #[Test]
    public function store_board_creates_record(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->user)->post('/cut-list/boards', [
            'project_id' => $project->id,
            'label'      => 'Oak Plank',
            'length'     => 96,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 2,
        ]);

        $this->assertDatabaseHas('cut_list_boards', [
            'project_id' => $project->id,
            'label'      => 'Oak Plank',
            'quantity'   => 2,
        ]);

        $response->assertRedirect();
    }

    #[Test]
    public function store_board_requires_label(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->user)->post('/cut-list/boards', [
            'project_id' => $project->id,
            'length'     => 96,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response->assertSessionHasErrors(['label']);
    }

    #[Test]
    public function store_board_requires_valid_project(): void
    {
        $response = $this->actingAs($this->user)->post('/cut-list/boards', [
            'project_id' => 'nonexistent-ulid-value',
            'label'      => 'Oak Plank',
            'length'     => 96,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response->assertSessionHasErrors(['project_id']);
    }

    // -------------------------------------------------------------------------
    // Destroy Board
    // -------------------------------------------------------------------------

    #[Test]
    public function destroy_board_hard_deletes(): void
    {
        $project = Project::factory()->create();

        $board = CutListBoard::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Delete Me Board',
            'length'     => 48,
            'width'      => 24,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($this->user)->delete('/cut-list/boards/' . $board->id);

        $this->assertDatabaseMissing('cut_list_boards', ['id' => $board->id]);

        $response->assertRedirect();
    }

    // -------------------------------------------------------------------------
    // Store Piece
    // -------------------------------------------------------------------------

    #[Test]
    public function store_piece_creates_record(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->user)->post('/cut-list/pieces', [
            'project_id'      => $project->id,
            'label'           => 'Shelf Panel',
            'length'          => 24,
            'width'           => 12,
            'thickness'       => 0.75,
            'quantity'        => 4,
            'grain_direction' => true,
        ]);

        $this->assertDatabaseHas('cut_list_pieces', [
            'project_id' => $project->id,
            'label'      => 'Shelf Panel',
            'quantity'   => 4,
        ]);

        $response->assertRedirect();
    }

    #[Test]
    public function store_piece_requires_label(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->user)->post('/cut-list/pieces', [
            'project_id' => $project->id,
            'length'     => 24,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response->assertSessionHasErrors(['label']);
    }

    // -------------------------------------------------------------------------
    // Destroy Piece
    // -------------------------------------------------------------------------

    #[Test]
    public function destroy_piece_hard_deletes(): void
    {
        $project = Project::factory()->create();

        $piece = CutListPiece::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Delete Me Piece',
            'length'     => 24,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($this->user)->delete('/cut-list/pieces/' . $piece->id);

        $this->assertDatabaseMissing('cut_list_pieces', ['id' => $piece->id]);

        $response->assertRedirect();
    }

    // -------------------------------------------------------------------------
    // Optimize
    // -------------------------------------------------------------------------

    #[Test]
    public function optimize_requires_project_id(): void
    {
        $response = $this->actingAs($this->user)->post('/cut-list/optimize', []);

        $response->assertSessionHasErrors(['project_id']);
    }

    #[Test]
    public function optimize_returns_error_when_no_boards(): void
    {
        $project = Project::factory()->create();

        CutListPiece::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Orphan Piece',
            'length'     => 24,
            'width'      => 12,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($this->user)->post('/cut-list/optimize', [
            'project_id' => $project->id,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    #[Test]
    public function optimize_returns_result_with_valid_data(): void
    {
        $project = Project::factory()->create();

        CutListBoard::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Large Sheet',
            'length'     => 96,
            'width'      => 48,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        CutListPiece::factory()->create([
            'project_id' => $project->id,
            'label'      => 'Small Part',
            'length'     => 12,
            'width'      => 6,
            'thickness'  => 0.75,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($this->user)->post('/cut-list/optimize', [
            'project_id' => $project->id,
        ]);

        $response->assertRedirect(route('cut-list.index', ['project' => $project->id]));
        $response->assertSessionHas('cutListResult');
    }
}
