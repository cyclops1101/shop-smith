# Task 10 Implementation Plan: Sub-resource Feature Tests

## 1. Overview

Create `tests/Feature/ProjectSubResourceTest.php` containing PHPUnit 11 feature tests for all five project sub-resource actions:

- Photo upload (`POST /projects/{project}/photos`)
- Time logging (`POST /projects/{project}/time`)
- Timer stop (`PUT /projects/{project}/time/{entry}/stop`)
- Note creation (`POST /projects/{project}/notes`)
- Material attachment (`POST /projects/{project}/materials`)

The test file follows the same conventions as `tests/Feature/ProjectControllerTest.php`: PHPUnit 11 `#[Test]` attribute syntax, `RefreshDatabase` trait, and `actingAs(User::factory()->create())` for authentication.

---

## 2. File to Create

| Action | Path |
|--------|------|
| Create | `tests/Feature/ProjectSubResourceTest.php` |

No existing files are modified.

---

## 3. Relevant Source Files

### Routes (from `routes/web.php`)

```php
Route::post('/projects/{project}/photos',           [ProjectController::class, 'uploadPhoto'])->name('projects.upload-photo');
Route::post('/projects/{project}/time',             [ProjectController::class, 'logTime'])->name('projects.log-time');
Route::put('/projects/{project}/time/{entry}/stop', [ProjectController::class, 'stopTimer'])->name('projects.stop-timer');
Route::post('/projects/{project}/materials',        [ProjectController::class, 'attachMaterial'])->name('projects.attach-material');
Route::post('/projects/{project}/notes',            [ProjectController::class, 'addNote'])->name('projects.add-note');
```

All routes are within `middleware(['auth', 'verified'])`. Route model binding resolves `{project}` by `slug` (see `Project::getRouteKeyName()`) and `{entry}` by ULID.

### Form Request Validation Rules

**StoreProjectPhotoRequest:**
- `photo`: required, image, mimes:jpeg,png,webp, max:10240
- `caption`: nullable, string, max:255

**LogTimeRequest:**
- `started_at`: required, date
- `ended_at`: nullable, date, after_or_equal:started_at
- `description`: nullable, string, max:255
- `duration_minutes`: nullable, integer, min:1

**AttachMaterialRequest:**
- `material_id`: required, ulid, exists:materials,id
- `quantity_used`: required, numeric, min:0.01
- `notes`: nullable, string, max:255

**AddNoteRequest:**
- `content`: required, string

### Factories Available

- `User::factory()->create()`
- `Project::factory()->create()` — generates `slug` automatically via `booted()` observer
- `ProjectPhoto::factory()->create(['project_id' => $project->id])`
- `TimeEntry::factory()->create(['project_id' => $project->id])` — includes `running()` state for null `ended_at`
- `ProjectNote::factory()->create(['project_id' => $project->id])`
- `Material::factory()->create()`
- `ProjectMaterial::factory()->create([...])`

---

## 4. Test Structure

### 4.1 Class Skeleton

```php
<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\ProjectNote;
use App\Models\ProjectPhoto;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProjectSubResourceTest extends TestCase
{
    use RefreshDatabase;

    // --- Photo tests ---
    #[Test]
    public function uploading_valid_image_creates_project_photo(): void { ... }

    #[Test]
    public function uploading_non_image_returns_422(): void { ... }

    // --- Time entry tests ---
    #[Test]
    public function logging_time_with_start_and_end_creates_entry_with_duration(): void { ... }

    #[Test]
    public function logging_time_with_only_started_at_creates_running_timer(): void { ... }

    #[Test]
    public function logging_time_without_started_at_returns_422(): void { ... }

    #[Test]
    public function stopping_timer_sets_ended_at_and_duration(): void { ... }

    // --- Note tests ---
    #[Test]
    public function adding_note_with_valid_content_creates_project_note(): void { ... }

    #[Test]
    public function adding_note_with_empty_content_returns_422(): void { ... }

    // --- Material tests ---
    #[Test]
    public function attaching_material_with_valid_data_creates_pivot_row(): void { ... }

    #[Test]
    public function attaching_material_with_non_existent_material_id_returns_422(): void { ... }
}
```

---

## 5. Individual Test Specifications

### 5.1 Photo: Valid Upload Creates Record

```php
#[Test]
public function uploading_valid_image_creates_project_photo(): void
{
    Storage::fake('public');

    $user    = User::factory()->create();
    $project = Project::factory()->create();
    $file    = UploadedFile::fake()->image('photo.jpg');

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/photos', [
            'photo'   => $file,
            'caption' => 'Test caption',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_photos', [
        'project_id' => $project->id,
        'caption'    => 'Test caption',
    ]);
}
```

Key points:
- `Storage::fake('public')` must be called before the request so that `Storage::disk('public')->put(...)` writes to a fake filesystem, not the real `storage/app/public` directory.
- `UploadedFile::fake()->image('photo.jpg')` creates a synthetic JPEG that passes the `image` and `mimes:jpeg,png,webp` rules.
- The assertion uses `assertDatabaseHas` on `project_photos` rather than inspecting the redirect location, because the controller calls `redirect()->back()` in its stub — this verifies the side-effect (record created) independent of redirect destination.
- Once the controller is fully implemented the `file_path` column will also be populated; the test intentionally does not assert `file_path` here to avoid coupling to the storage path implementation detail.

### 5.2 Photo: Non-Image Returns 422

```php
#[Test]
public function uploading_non_image_returns_422(): void
{
    Storage::fake('public');

    $user    = User::factory()->create();
    $project = Project::factory()->create();
    $file    = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/photos', [
            'photo' => $file,
        ]);

    $response->assertStatus(422);
    $this->assertDatabaseCount('project_photos', 0);
}
```

Key points:
- `UploadedFile::fake()->create('document.pdf', 100, 'application/pdf')` creates a file with a MIME type that fails the `mimes:jpeg,png,webp` rule.
- `assertStatus(422)` verifies Laravel's validation failure response.
- `assertDatabaseCount('project_photos', 0)` confirms no record was created.

### 5.3 Time: Start + End Creates Entry with Duration

```php
#[Test]
public function logging_time_with_start_and_end_creates_entry_with_duration(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/time', [
            'started_at' => '2026-03-03 09:00:00',
            'ended_at'   => '2026-03-03 10:30:00',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('time_entries', [
        'project_id'       => $project->id,
        'duration_minutes' => 90,
    ]);
}
```

Key points:
- The `duration_minutes` value (90) is calculated as the diff in minutes between the two timestamps. The controller implementation is expected to compute this; the test asserts it was persisted correctly.
- The timestamps are fixed strings to make the assertion deterministic.

### 5.4 Time: Only started_at Creates Running Timer

```php
#[Test]
public function logging_time_with_only_started_at_creates_running_timer(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/time', [
            'started_at' => '2026-03-03 09:00:00',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('time_entries', [
        'project_id'       => $project->id,
        'ended_at'         => null,
        'duration_minutes' => null,
    ]);
}
```

Key points:
- `ended_at` is nullable in `LogTimeRequest`, so omitting it is valid.
- The test asserts that both `ended_at` and `duration_minutes` are `null` in the database row — confirming a "running" timer state.

### 5.5 Time: Missing started_at Returns 422

```php
#[Test]
public function logging_time_without_started_at_returns_422(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/time', [
            'ended_at' => '2026-03-03 10:00:00',
        ]);

    $response->assertStatus(422);
    $this->assertDatabaseCount('time_entries', 0);
}
```

Key points:
- `started_at` is `required` in `LogTimeRequest`; omitting it must produce a 422.

### 5.6 Timer Stop: Sets ended_at and duration

```php
#[Test]
public function stopping_timer_sets_ended_at_and_duration(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();
    $entry   = TimeEntry::factory()->running()->create([
        'project_id' => $project->id,
        'started_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($user)
        ->put('/projects/' . $project->slug . '/time/' . $entry->id . '/stop');

    $response->assertRedirect();
    $entry->refresh();
    $this->assertNotNull($entry->ended_at);
    $this->assertNotNull($entry->duration_minutes);
    $this->assertGreaterThan(0, $entry->duration_minutes);
}
```

Key points:
- `TimeEntry::factory()->running()` uses the `running()` state defined in `TimeEntryFactory`, which sets `ended_at` and `duration_minutes` to `null`.
- `started_at` is set to `now()->subHour()` to ensure a meaningful duration once the timer is stopped.
- The `{entry}` route parameter resolves by ULID (the `id` column). `$entry->id` is the ULID string.
- After the request, `$entry->refresh()` reloads the model from the database. The test then asserts `ended_at` is set and `duration_minutes > 0`.

### 5.7 Notes: Valid Content Creates Record

```php
#[Test]
public function adding_note_with_valid_content_creates_project_note(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/notes', [
            'content' => 'This is a workshop note about the dovetail joints.',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_notes', [
        'project_id' => $project->id,
        'content'    => 'This is a workshop note about the dovetail joints.',
    ]);
}
```

### 5.8 Notes: Empty Content Returns 422

```php
#[Test]
public function adding_note_with_empty_content_returns_422(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/notes', [
            'content' => '',
        ]);

    $response->assertStatus(422);
    $this->assertDatabaseCount('project_notes', 0);
}
```

Key points:
- `content` is `required` in `AddNoteRequest`; an empty string must produce a 422.
- Sending an empty string (`''`) rather than omitting the key tests both the `required` rule and ensures Laravel treats empty strings as missing values (which it does with the `ConvertEmptyStringsToNull` middleware).

### 5.9 Materials: Valid Data Creates Pivot Row

```php
#[Test]
public function attaching_material_with_valid_data_creates_pivot_row(): void
{
    $user     = User::factory()->create();
    $project  = Project::factory()->create();
    $material = Material::factory()->create();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/materials', [
            'material_id'   => $material->id,
            'quantity_used' => 2.5,
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_materials', [
        'project_id'  => $project->id,
        'material_id' => $material->id,
    ]);
}
```

Key points:
- `$material->id` is a ULID string, satisfying the `ulid` rule in `AttachMaterialRequest`.
- `quantity_used` of `2.5` satisfies `numeric, min:0.01`.
- The assertion checks the `project_materials` pivot table (not a `project_material` Eloquent model directly).

### 5.10 Materials: Non-existent material_id Returns 422

```php
#[Test]
public function attaching_material_with_non_existent_material_id_returns_422(): void
{
    $user    = User::factory()->create();
    $project = Project::factory()->create();

    $fakeUlid = \Illuminate\Support\Str::ulid()->toString();

    $response = $this->actingAs($user)
        ->post('/projects/' . $project->slug . '/materials', [
            'material_id'   => $fakeUlid,
            'quantity_used' => 1.0,
        ]);

    $response->assertStatus(422);
    $this->assertDatabaseCount('project_materials', 0);
}
```

Key points:
- A freshly generated ULID (`Str::ulid()->toString()`) is valid ULID syntax but does not exist in the `materials` table, so `Rule::exists('materials', 'id')` will fail.
- This exercises the `exists` rule in `AttachMaterialRequest` without needing to use an obviously invalid value.

---

## 6. Key Decisions

### Decision 1: Storage::fake('public') scope

`Storage::fake('public')` must be called at the start of each photo test method (not in `setUp()`), keeping the fake isolated to that test. The fake is automatically reset between tests because `RefreshDatabase` runs in a transaction, but the Storage fake is process-level. Calling it per-test is the safest pattern.

Alternatively, a `setUp()` method calling `Storage::fake('public')` would work too, but would add fake storage overhead to every test including non-photo tests. Per-test is preferred here.

### Decision 2: assertRedirect() vs assertStatus(302)

The controller stubs currently return `redirect()->back()`. Using `assertRedirect()` (without a specific URL argument) is more resilient to future changes in redirect destination. Once controllers are fully implemented they may redirect to `route('projects.show', $project)` — the test should not break when that happens.

### Decision 3: Route parameter for {entry} uses ULID id

The route `PUT /projects/{project}/time/{entry}/stop` uses implicit model binding. The `TimeEntry` model uses `HasUlids`, meaning its primary key is a ULID. Laravel resolves `{entry}` by the primary key by default (since `TimeEntry` does not override `getRouteKeyName()`). Therefore the URL must use `$entry->id` (the ULID string), not an integer.

### Decision 4: assertDatabaseHas vs assertDatabaseCount

Tests that verify a record was created use `assertDatabaseHas` with at least the foreign key (`project_id`) and one identifying field. Tests that verify nothing was created use `assertDatabaseCount` with `0` — this is more definitive than `assertDatabaseMissing`.

### Decision 5: No test for unauthenticated sub-resource access

The acceptance criteria do not require guest-redirect tests for sub-resources. These are already covered by the middleware group and implicitly tested by `ProjectControllerTest`. Adding them here would be redundant.

---

## 7. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `tests/Feature/ProjectControllerTest.php` | Exists | Provides the pattern to follow |
| `App\Models\Project` (with `HasUlids`, slug binding) | Exists | Used in all tests |
| `App\Models\User` | Exists | Auth user for all tests |
| `App\Models\ProjectPhoto` | Exists | Asserted in photo tests |
| `App\Models\TimeEntry` (with `running()` factory state) | Exists | Used in time tests |
| `App\Models\ProjectNote` | Exists | Asserted in note tests |
| `App\Models\Material` | Exists | Created in material tests |
| `App\Models\ProjectMaterial` | Exists | Pivot table asserted in material tests |
| `App\Http\Requests\StoreProjectPhotoRequest` | Exists | Defines photo validation rules |
| `App\Http\Requests\LogTimeRequest` | Exists | Defines time validation rules |
| `App\Http\Requests\AttachMaterialRequest` | Exists | Defines material validation rules |
| `App\Http\Requests\AddNoteRequest` | Exists | Defines note validation rules |
| Controller methods (uploadPhoto, logTime, stopTimer, attachMaterial, addNote) | Stubs exist | Currently return `redirect()->back()` — tests assert DB side-effects, not redirect targets |

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Controller stubs do not apply Form Requests yet — validation will not fire | High | The test plan accounts for this: 422 tests may fail until controllers are wired to use Form Requests. The tests are written for the target state and will pass once controllers are fully implemented. Note this in the PR description. |
| `{entry}` route binding fails because entry belongs to a different project | Low | Laravel's implicit binding does not scope sub-resources by default. If the controller does not scope `$entry` to `$project`, these tests still pass. Scoping can be added later. |
| `Storage::fake` not reset between tests | Very low | Each photo test calls `Storage::fake('public')` at the start of the method body, ensuring a fresh fake for each run. |
| `Str::ulid()` in PHP 8.3 returns a `Symfony\Component\Uid\Ulid` object | Low | Call `->toString()` explicitly (as shown in test 5.10) to get the string representation for the POST body. |

---

## 9. Acceptance Criteria Coverage

| Acceptance Criterion | Test Method | Section |
|----------------------|-------------|---------|
| POST /projects/{slug}/photos with valid image creates ProjectPhoto record | `uploading_valid_image_creates_project_photo` | 5.1 |
| POST /projects/{slug}/photos with non-image returns 422 | `uploading_non_image_returns_422` | 5.2 |
| Use Storage::fake('public') for photo tests | Both photo tests call `Storage::fake('public')` | 5.1, 5.2 |
| POST /projects/{slug}/time with started_at and ended_at creates TimeEntry with duration | `logging_time_with_start_and_end_creates_entry_with_duration` | 5.3 |
| POST /projects/{slug}/time with only started_at creates running timer | `logging_time_with_only_started_at_creates_running_timer` | 5.4 |
| POST /projects/{slug}/time without started_at returns 422 | `logging_time_without_started_at_returns_422` | 5.5 |
| PUT /projects/{slug}/time/{entry}/stop sets ended_at and duration | `stopping_timer_sets_ended_at_and_duration` | 5.6 |
| POST /projects/{slug}/notes with valid content creates ProjectNote | `adding_note_with_valid_content_creates_project_note` | 5.7 |
| POST /projects/{slug}/notes with empty content returns 422 | `adding_note_with_empty_content_returns_422` | 5.8 |
| POST /projects/{slug}/materials with valid data creates pivot row | `attaching_material_with_valid_data_creates_pivot_row` | 5.9 |
| POST /projects/{slug}/materials with non-existent material_id returns 422 | `attaching_material_with_non_existent_material_id_returns_422` | 5.10 |
| All use RefreshDatabase, #[Test], factories, actingAs() | All 10 test methods | All sections |

---

## 10. Complete File

```php
<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectNote;
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

    // -------------------------------------------------------------------------
    // Photo Tests
    // -------------------------------------------------------------------------

    #[Test]
    public function uploading_valid_image_creates_project_photo(): void
    {
        Storage::fake('public');

        $user    = User::factory()->create();
        $project = Project::factory()->create();
        $file    = UploadedFile::fake()->image('photo.jpg');

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/photos', [
                'photo'   => $file,
                'caption' => 'Test caption',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('project_photos', [
            'project_id' => $project->id,
            'caption'    => 'Test caption',
        ]);
    }

    #[Test]
    public function uploading_non_image_returns_422(): void
    {
        Storage::fake('public');

        $user    = User::factory()->create();
        $project = Project::factory()->create();
        $file    = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/photos', [
                'photo' => $file,
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('project_photos', 0);
    }

    // -------------------------------------------------------------------------
    // Time Entry Tests
    // -------------------------------------------------------------------------

    #[Test]
    public function logging_time_with_start_and_end_creates_entry_with_duration(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/time', [
                'started_at' => '2026-03-03 09:00:00',
                'ended_at'   => '2026-03-03 10:30:00',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('time_entries', [
            'project_id'       => $project->id,
            'duration_minutes' => 90,
        ]);
    }

    #[Test]
    public function logging_time_with_only_started_at_creates_running_timer(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/time', [
                'started_at' => '2026-03-03 09:00:00',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('time_entries', [
            'project_id'       => $project->id,
            'ended_at'         => null,
            'duration_minutes' => null,
        ]);
    }

    #[Test]
    public function logging_time_without_started_at_returns_422(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/time', [
                'ended_at' => '2026-03-03 10:00:00',
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('time_entries', 0);
    }

    #[Test]
    public function stopping_timer_sets_ended_at_and_duration(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();
        $entry   = TimeEntry::factory()->running()->create([
            'project_id' => $project->id,
            'started_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($user)
            ->put('/projects/' . $project->slug . '/time/' . $entry->id . '/stop');

        $response->assertRedirect();
        $entry->refresh();
        $this->assertNotNull($entry->ended_at);
        $this->assertNotNull($entry->duration_minutes);
        $this->assertGreaterThan(0, $entry->duration_minutes);
    }

    // -------------------------------------------------------------------------
    // Note Tests
    // -------------------------------------------------------------------------

    #[Test]
    public function adding_note_with_valid_content_creates_project_note(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/notes', [
                'content' => 'This is a workshop note about the dovetail joints.',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('project_notes', [
            'project_id' => $project->id,
            'content'    => 'This is a workshop note about the dovetail joints.',
        ]);
    }

    #[Test]
    public function adding_note_with_empty_content_returns_422(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/notes', [
                'content' => '',
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('project_notes', 0);
    }

    // -------------------------------------------------------------------------
    // Material Tests
    // -------------------------------------------------------------------------

    #[Test]
    public function attaching_material_with_valid_data_creates_pivot_row(): void
    {
        $user     = User::factory()->create();
        $project  = Project::factory()->create();
        $material = Material::factory()->create();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/materials', [
                'material_id'   => $material->id,
                'quantity_used' => 2.5,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('project_materials', [
            'project_id'  => $project->id,
            'material_id' => $material->id,
        ]);
    }

    #[Test]
    public function attaching_material_with_non_existent_material_id_returns_422(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $fakeUlid = Str::ulid()->toString();

        $response = $this->actingAs($user)
            ->post('/projects/' . $project->slug . '/materials', [
                'material_id'   => $fakeUlid,
                'quantity_used' => 1.0,
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('project_materials', 0);
    }
}
```
