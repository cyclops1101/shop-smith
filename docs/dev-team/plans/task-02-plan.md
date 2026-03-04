# Task 02 Plan: Photo Upload Backend

**Task ID:** 02
**Domain:** backend
**Feature:** `ProjectController::uploadPhoto()` + `PhotoUploadService`
**Status:** pending

---

## 1. Approach

Implement photo upload in two layers following the fat-models / thin-controllers / dedicated-service-class convention from CLAUDE.md.

1. **`PhotoUploadService`** — a dedicated service class at `app/Services/PhotoUploadService.php` that encapsulates all file-system and image-processing work. It receives an `UploadedFile` instance and a `Project` model, stores the original file on the `public` disk, generates a 400 px-wide JPEG thumbnail using the Intervention Image v3 API, and returns a newly created `ProjectPhoto` model.

2. **`ProjectController::uploadPhoto()`** — the controller method is slimmed to: swap `Request` for `StoreProjectPhotoRequest`, inject `PhotoUploadService` via method injection, delegate to the service, and redirect back.

The `app/Services/` directory does not exist yet and must be created. No new routes, migrations, or frontend changes are required.

---

## 2. Files to Create or Modify

| File | Action |
|------|--------|
| `app/Services/PhotoUploadService.php` | Create |
| `app/Http/Controllers/ProjectController.php` | Modify (update `uploadPhoto` signature and body) |
| `tests/Feature/PhotoUploadTest.php` | Create |

No other files are changed.

---

## 3. Exact Implementation

### 3.1 `app/Services/PhotoUploadService.php`

```php
<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectPhoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;

class PhotoUploadService
{
    /**
     * Store the uploaded photo, generate a thumbnail, and persist the
     * ProjectPhoto record.
     */
    public function store(UploadedFile $file, Project $project, ?string $caption): ProjectPhoto
    {
        $ulid      = (string) \Illuminate\Support\Str::ulid();
        $extension = strtolower($file->getClientOriginalExtension());

        // Store original on the public disk
        $originalPath   = "projects/{$project->id}/photos/{$ulid}.{$extension}";
        $thumbnailPath  = "projects/{$project->id}/thumbnails/{$ulid}.jpg";

        Storage::disk('public')->put(
            $originalPath,
            file_get_contents($file->getRealPath())
        );

        // Generate 400 px-wide thumbnail (preserve aspect ratio) — Intervention Image v3
        $manager   = ImageManager::gd();
        $image     = $manager->read($file->getRealPath());
        $thumbnail = $image->scale(width: 400)->toJpeg();

        Storage::disk('public')->put($thumbnailPath, (string) $thumbnail);

        // Determine next sort_order
        $nextSort = (int) $project->photos()->max('sort_order') + 1;

        return $project->photos()->create([
            'file_path'      => $originalPath,
            'thumbnail_path' => $thumbnailPath,
            'caption'        => $caption,
            'sort_order'     => $nextSort,
        ]);
    }
}
```

**Key API choices:**

- `ImageManager::gd()` — static constructor for the GD driver, v3 API. NOT `Image::make()` (v2).
- `$manager->read($file->getRealPath())` — v3 API to decode an image from a file path.
- `->scale(width: 400)` — scales to 400 px wide while preserving aspect ratio. This uses `ScaleModifier` which keeps the original width-to-height ratio. Only `width` is passed; height is `null` (omitted) so it is computed proportionally.
- `->toJpeg()` — encodes the result as JPEG. Returns an `EncodedImage` instance; cast to `string` gives the raw binary content suitable for `Storage::put()`.
- `Storage::disk('public')->put(...)` — stores under `storage/app/public/` on the `public` disk, which is symlinked to `public/storage/` via `php artisan storage:link`.

**Why `scale()` over `resize()`:**

`resize()` requires both `$width` and `$height` and will stretch/distort if only one is provided. `scale()` (backed by `ScaleModifier`) is specifically designed for proportional scaling when only one dimension is supplied. Passing only `width: 400` and omitting `height` (defaults to `null`) scales to 400 px wide and computes height from the original aspect ratio.

**Why `file_get_contents($file->getRealPath())` for the original:**

`UploadedFile::store()` moves the temp file, which would invalidate `getRealPath()` for the thumbnail step. Using `Storage::disk('public')->put()` with the raw bytes and reading from `getRealPath()` afterwards keeps the temp file in place for the Intervention read.

---

### 3.2 Modified `ProjectController::uploadPhoto()`

Replace the stub with:

```php
use App\Http\Requests\StoreProjectPhotoRequest;
use App\Services\PhotoUploadService;

// ...

public function uploadPhoto(
    StoreProjectPhotoRequest $request,
    Project $project,
    PhotoUploadService $photoUploadService
): RedirectResponse {
    $photoUploadService->store(
        $request->file('photo'),
        $project,
        $request->input('caption')
    );

    return redirect()->back()->with('success', 'Photo uploaded successfully.');
}
```

The full updated controller head (imports only; the rest of the methods remain unchanged):

```php
use App\Http\Requests\StoreProjectPhotoRequest;
use App\Services\PhotoUploadService;
```

Laravel's service container resolves `PhotoUploadService` automatically via method injection because it has no unresolvable constructor parameters.

---

### 3.3 `tests/Feature/PhotoUploadTest.php`

```php
<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectPhoto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PhotoUploadTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function guest_cannot_upload_photo(): void
    {
        $project = Project::factory()->create();

        $response = $this->post("/projects/{$project->slug}/photos", [
            'photo' => UploadedFile::fake()->image('test.jpg'),
        ]);

        $response->assertRedirect('/login');
    }

    #[Test]
    public function authenticated_user_can_upload_a_photo(): void
    {
        Storage::fake('public');

        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $file = UploadedFile::fake()->image('workshop.jpg', 800, 600);

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/photos", [
            'photo'   => $file,
            'caption' => 'A test caption',
        ]);

        $response->assertRedirect();

        // One ProjectPhoto record created
        $this->assertDatabaseCount('project_photos', 1);

        $photo = ProjectPhoto::first();
        $this->assertSame('A test caption', $photo->caption);
        $this->assertSame(1, $photo->sort_order);
        $this->assertSame($project->id, $photo->project_id);

        // Files exist on public disk
        Storage::disk('public')->assertExists($photo->file_path);
        Storage::disk('public')->assertExists($photo->thumbnail_path);

        // Paths follow the naming convention
        $this->assertStringStartsWith("projects/{$project->id}/photos/", $photo->file_path);
        $this->assertStringStartsWith("projects/{$project->id}/thumbnails/", $photo->thumbnail_path);
        $this->assertStringEndsWith('.jpg', $photo->thumbnail_path);
    }

    #[Test]
    public function sort_order_increments_for_subsequent_photos(): void
    {
        Storage::fake('public');

        $user    = User::factory()->create();
        $project = Project::factory()->create();

        // Upload two photos
        $this->actingAs($user)->post("/projects/{$project->slug}/photos", [
            'photo' => UploadedFile::fake()->image('first.jpg', 400, 300),
        ]);

        $this->actingAs($user)->post("/projects/{$project->slug}/photos", [
            'photo' => UploadedFile::fake()->image('second.jpg', 400, 300),
        ]);

        $photos = ProjectPhoto::orderBy('sort_order')->get();
        $this->assertCount(2, $photos);
        $this->assertSame(1, $photos[0]->sort_order);
        $this->assertSame(2, $photos[1]->sort_order);
    }

    #[Test]
    public function photo_upload_fails_validation_without_file(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/photos", []);

        $response->assertSessionHasErrors(['photo']);
    }

    #[Test]
    public function photo_upload_fails_validation_for_non_image_mime(): void
    {
        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)->post("/projects/{$project->slug}/photos", [
            'photo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ]);

        $response->assertSessionHasErrors(['photo']);
    }

    #[Test]
    public function caption_is_optional_and_may_be_null(): void
    {
        Storage::fake('public');

        $user    = User::factory()->create();
        $project = Project::factory()->create();

        $this->actingAs($user)->post("/projects/{$project->slug}/photos", [
            'photo' => UploadedFile::fake()->image('no-caption.jpg', 400, 300),
        ]);

        $this->assertNull(ProjectPhoto::first()->caption);
    }
}
```

**Note on fake image thumbnails in tests:** `UploadedFile::fake()->image()` produces a real minimal GD-generated image. Intervention Image v3 reads it via `ImageManager::gd()->read()` using the actual GD extension. The test environment must have the PHP `gd` extension available (it is included in Laravel Sail's default PHP image). `Storage::fake('public')` intercepts disk writes so no real files are created on disk.

---

## 4. File Path Structure on Disk

```
storage/app/public/
  projects/{project_ulid}/
    photos/
      {ulid}.jpg          ← original (preserves original extension: jpeg/png/webp)
      {ulid}.png
      {ulid}.webp
    thumbnails/
      {ulid}.jpg          ← thumbnail, always JPEG regardless of original format
```

Accessed via URL: `Storage::url("projects/{$project->id}/photos/{$ulid}.{$ext}")` which resolves to `/storage/projects/...` after `php artisan storage:link`.

---

## 5. Key Decisions

### Decision 1: `scale(width: 400)` not `resize(400, null)`

`Image::resize()` in v3 accepts both `?int $width` and `?int $height`. When one is `null`, it does NOT automatically preserve the aspect ratio — it only resizes to the provided dimension and leaves the other unchanged, potentially producing a distorted result. `scale()` is the correct v3 method for proportional scaling: it computes the missing dimension from the aspect ratio of the original. Only `width: 400` is passed; height is omitted (defaults to `null`) to preserve aspect ratio.

### Decision 2: ULID generated with `Str::ulid()`, not from the model

`ProjectPhoto` uses `HasUlids` which auto-generates the model's primary key ULID on save. However, the file paths need the ULID *before* the model is saved (so paths can be written to disk first). A separate `Str::ulid()` call is used to generate the path ULID. The model's `id` ULID is generated independently by `HasUlids` on `->create()`. The path-based ULID and model ID are different — this is intentional and acceptable: the path references a unique file name, and the model ID is the record identifier.

### Decision 3: Method injection for `PhotoUploadService`

Laravel resolves method-injected dependencies from the service container transparently when the controller method is invoked via routing. `PhotoUploadService` has no constructor parameters, so it requires no explicit binding in `AppServiceProvider`. Method injection is used (rather than constructor injection) to match the existing stub signature pattern and to avoid inflating the controller constructor with every single-use service.

### Decision 4: `Storage::disk('public')->put()` over `UploadedFile::store()`

`UploadedFile::store()` uses `move_uploaded_file()` internally, which permanently moves the temp file. The thumbnail step runs *after* storing the original and needs to read from `$file->getRealPath()`. Using `file_get_contents($file->getRealPath())` + `Storage::put()` preserves the temp file for the subsequent `$manager->read()` call.

### Decision 5: Always emit JPEG thumbnails

All thumbnails are saved as `.jpg` regardless of the original format (jpeg, png, webp). This keeps thumbnail rendering simple, produces consistently small file sizes, and avoids storing transparency in thumbnails (PNG alpha channels are dropped). The `->toJpeg()` method on the Intervention `Image` object handles the encoding.

### Decision 6: `sort_order = max(sort_order) + 1`

`$project->photos()->max('sort_order') + 1` starts at 1 for the first photo (since `max` of an empty set returns `null`, and `null + 1 = 1` in PHP). This is simple and avoids gaps that a COUNT-based approach would create if photos are later deleted.

---

## 6. Verified Dependencies

| Requirement | Status |
|-------------|--------|
| `intervention/image` v3.11 | Confirmed in `composer.json` — `"intervention/image": "^3.11"` |
| `ImageManager::gd()` static method | Confirmed in `vendor/intervention/image/src/ImageManager.php` line 52 |
| `$manager->read($path)` method | Confirmed in `vendor/intervention/image/src/ImageManager.php` line 85 |
| `$image->scale(?int $width, ?int $height)` | Confirmed in `vendor/intervention/image/src/Image.php` line 653 |
| `$image->toJpeg()` | Confirmed in `vendor/intervention/image/src/Image.php` line 931 |
| `Storage::disk('public')` | Standard Laravel disk; `public` disk configured by default in `config/filesystems.php` |
| `StoreProjectPhotoRequest` exists | Confirmed at `app/Http/Requests/StoreProjectPhotoRequest.php` |
| `ProjectPhoto` model with `HasUlids` | Confirmed at `app/Models/ProjectPhoto.php` |
| `Project::photos()` hasMany relation | Confirmed at `app/Models/Project.php` line 85 |
| Route: `POST projects/{project}/photos` | Confirmed — named `projects.upload-photo`, resolves to `ProjectController@uploadPhoto` |
| PHP `gd` extension | Available in Laravel Sail default image; required by `ImageManager::gd()` |
| `app/Services/` directory | Does not exist yet — must be created before adding the service file |

---

## 7. Risks and Mitigations

### Risk 1: GD extension not loaded in the test environment

**Risk:** `ImageManager::gd()` requires the PHP `gd` extension. If it is not loaded, a `DriverException` is thrown.

**Mitigation:** Laravel Sail's default PHP 8.3 Docker image includes the `gd` extension. For CI environments, confirm `extension=gd` is enabled. The failing exception message from Intervention Image is descriptive enough to diagnose the root cause immediately.

### Risk 2: `UploadedFile::fake()->image()` produces a minimal 1-color bitmap

**Risk:** The fake image generated in tests is a real but minimal GD-created image (often 1×1 or specified dimensions). `scale(width: 400)` on an image smaller than 400 px wide will scale *up*, which is valid behaviour for `ScaleModifier`.

**Mitigation:** No issue. `scale()` works in both directions. The test does not assert thumbnail pixel dimensions — only that the file exists on disk.

### Risk 3: `EncodedImage` cast to `string` vs `->toString()`

**Risk:** `->toJpeg()` returns an `EncodedImage` object (implementing `EncodedImageInterface`). Passing it to `Storage::disk('public')->put()` requires binary string content.

**Mitigation:** Confirmed in `vendor/intervention/image/src/EncodedImage.php` that `EncodedImage` implements `Stringable` and casting to `(string)` returns the raw binary data. `Storage::disk('public')->put($path, (string) $thumbnail)` is correct.

### Risk 4: `storage:link` not run in test environment

**Risk:** `Storage::fake('public')` in tests replaces the disk with an in-memory filesystem, so the symlink is irrelevant for tests. In production, `php artisan storage:link` must be run once after deployment.

**Mitigation:** This is a deployment concern, not a code concern. The plan notes it but no code change is needed.

### Risk 5: Original file extension handling for webp

**Risk:** `$file->getClientOriginalExtension()` returns the client-supplied extension string (e.g., `webp`). An attacker could supply a spoofed extension. However, Laravel's `mimes:jpeg,png,webp` validation in `StoreProjectPhotoRequest` checks the actual MIME type by inspecting file content, not just the extension. Validation runs before the service is called.

**Mitigation:** Rely on the validated MIME type from `StoreProjectPhotoRequest`. Extension is used only for the storage path filename; the file content has already been verified as an image of an accepted type.

---

## 8. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| Uses `StoreProjectPhotoRequest` for validation | Controller signature changed to `StoreProjectPhotoRequest $request` — validation fires automatically before `uploadPhoto()` body executes |
| Original stored at `projects/{project_id}/photos/{ulid}.{ext}` on `public` disk | `PhotoUploadService::store()` constructs `$originalPath = "projects/{$project->id}/photos/{$ulid}.{$extension}"` and calls `Storage::disk('public')->put($originalPath, ...)` |
| 400 px-wide thumbnail, preserve aspect ratio, using `ImageManager::gd()` and `Image::read()` | `ImageManager::gd()->read($file->getRealPath())->scale(width: 400)` |
| Thumbnail at `projects/{project_id}/thumbnails/{ulid}.jpg` | `$thumbnailPath = "projects/{$project->id}/thumbnails/{$ulid}.jpg"` |
| `ProjectPhoto` record created with paths, caption, `sort_order = max+1` | `$project->photos()->create([...])` with computed `$nextSort` |
| `PhotoUploadService` injected via method injection | `uploadPhoto(StoreProjectPhotoRequest $request, Project $project, PhotoUploadService $photoUploadService)` |
| MUST use v3 API (`ImageManager::gd()`), NOT v2 `Image::make()` | Only v3 API used: `ImageManager::gd()`, `->read()`, `->scale()`, `->toJpeg()` |
