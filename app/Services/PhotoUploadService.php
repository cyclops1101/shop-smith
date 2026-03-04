<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectPhoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

class PhotoUploadService
{
    public function upload(UploadedFile $file, Project $project, ?string $caption = null): ProjectPhoto
    {
        $ulid = Str::ulid()->toString();
        $ext = $file->getClientOriginalExtension();

        $photoPath = "projects/{$project->id}/photos/{$ulid}.{$ext}";
        $thumbnailPath = "projects/{$project->id}/thumbnails/{$ulid}.jpg";

        // Store original
        Storage::disk('public')->put($photoPath, file_get_contents($file->getRealPath()));

        // Generate 400px-wide thumbnail (preserve aspect ratio)
        $manager = ImageManager::gd();
        $thumbnail = $manager->read($file->getRealPath())->scale(width: 400)->toJpeg();
        Storage::disk('public')->put($thumbnailPath, (string) $thumbnail);

        // Compute next sort order
        $nextSort = (int) $project->photos()->max('sort_order') + 1;

        return $project->photos()->create([
            'file_path' => $photoPath,
            'thumbnail_path' => $thumbnailPath,
            'caption' => $caption,
            'sort_order' => $nextSort,
        ]);
    }
}
