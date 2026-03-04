<?php

namespace App\Http\Middleware;

use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user()
                    ? $request->user()->only(['id', 'name', 'email'])
                    : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info'    => $request->session()->get('info'),
            ],
            'appName' => config('app.name'),
            'activeTimer' => function () use ($request) {
                if (! $request->user()) {
                    return null;
                }

                $entry = TimeEntry::running()->with('project:id,slug,title')->first();

                if (! $entry) {
                    return null;
                }

                return [
                    'id' => $entry->id,
                    'project_id' => $entry->project_id,
                    'project_slug' => $entry->project->slug,
                    'project_title' => $entry->project->title,
                    'started_at' => $entry->started_at->toISOString(),
                ];
            },
        ]);
    }
}
