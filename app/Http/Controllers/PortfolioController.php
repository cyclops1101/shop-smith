<?php

namespace App\Http\Controllers;

use App\Models\ProjectPhoto;
use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    public function index(Request $request): Response
    {
        $tagFilter = $request->query('tag');

        $photosQuery = ProjectPhoto::where('is_portfolio', true)
            ->with(['project:id,title,slug', 'project.tags:id,name,color']);

        if ($tagFilter) {
            $photosQuery->whereHas('project.tags', fn ($q) => $q->where('tags.id', $tagFilter));
        }

        $photos = $photosQuery
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($photo) => [
                'id'           => $photo->id,
                'file_path'    => $photo->file_path,
                'caption'      => $photo->caption,
                'project_title' => $photo->project?->title,
                'project_slug'  => $photo->project?->slug,
                'tags'          => $photo->project?->tags->map(fn ($t) => [
                    'id'    => $t->id,
                    'name'  => $t->name,
                    'color' => $t->color,
                ])->values() ?? collect(),
            ]);

        $tags = Tag::whereHas('projects.photos', fn ($q) => $q->where('is_portfolio', true))
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        return Inertia::render('Portfolio/Index', [
            'photos'    => $photos,
            'tags'      => $tags,
            'activeTag' => $tagFilter,
        ]);
    }
}
