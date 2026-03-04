<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectPhoto;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProjectSubResourceTest extends TestCase
{
    use RefreshDatabase;

    // PHOTO TESTS

    #[Test]
    public function can_upload_photo_to_project(): void
    {
        Storage::fake('public');

        $user = $this->actingAs(User::factory()->create());
        $project = Project::factory()->create();

        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->post("/projects/{$project->slug}/photos", [
            'photo' => $file,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('project_photos', [
            'project_id' => $project->id,
        ]);

        $photo = ProjectPhoto::where('project_id', $project->id)->first();
        Storage::disk('public')->assertExists($photo->file_path);
    }

    #[Test]
    public function upload_rejects_non_image_file(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $project = Project::factory()->create();

        $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/photos", [
            'photo' => $file,
        ]);

        $response->assertSessionHasErrors(['photo']);
    }

    // TIME ENTRY TESTS

    #[Test]
    public function can_log_completed_time_entry(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $startedAt = now()->subMinutes(90)->toDateTimeString();
        $endedAt = now()->toDateTimeString();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/time", [
            'started_at' => $startedAt,
            'ended_at'   => $endedAt,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('time_entries', [
            'project_id'       => $project->id,
            'duration_minutes' => 90,
        ]);
    }

    #[Test]
    public function can_start_running_timer(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/time", [
            'started_at' => now()->toDateTimeString(),
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('time_entries', [
            'project_id'       => $project->id,
            'ended_at'         => null,
            'duration_minutes' => null,
        ]);
    }

    #[Test]
    public function log_time_requires_started_at(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/time", []);

        $response->assertSessionHasErrors(['started_at']);
    }

    #[Test]
    public function can_stop_running_timer(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $entry = TimeEntry::factory()->create([
            'project_id' => $project->id,
            'started_at' => now()->subHour(),
            'ended_at'   => null,
        ]);

        $response = $this->actingAs($user)->put("/projects/{$project->slug}/time/{$entry->id}/stop");

        $response->assertRedirect();

        $entry->refresh();

        $this->assertNotNull($entry->ended_at);
        $this->assertGreaterThan(0, $entry->duration_minutes);
    }

    // NOTE TESTS

    #[Test]
    public function can_add_note_to_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $content = 'This is a test note for the project.';

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/notes", [
            'content' => $content,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('project_notes', [
            'project_id' => $project->id,
            'content'    => $content,
        ]);
    }

    #[Test]
    public function add_note_requires_content(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/notes", [
            'content' => '',
        ]);

        $response->assertSessionHasErrors(['content']);
    }

    // MATERIAL TESTS

    #[Test]
    public function can_attach_material_to_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();
        $material = Material::factory()->create();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/materials", [
            'material_id'   => $material->id,
            'quantity_used' => 5.5,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('project_materials', [
            'project_id'    => $project->id,
            'material_id'   => $material->id,
            'quantity_used' => 5.5,
        ]);
    }

    #[Test]
    public function attach_material_rejects_nonexistent_material(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $fakeUlid = Str::ulid()->toString();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/materials", [
            'material_id'   => $fakeUlid,
            'quantity_used' => 2,
        ]);

        $response->assertSessionHasErrors(['material_id']);
    }
}
