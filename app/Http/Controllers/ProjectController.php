<?php

namespace App\Http\Controllers;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Http\Requests\AddNoteRequest;
use App\Http\Requests\AttachMaterialRequest;
use App\Http\Requests\LogTimeRequest;
use App\Http\Requests\StoreProjectPhotoRequest;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Material;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Services\PhotoUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'status', 'priority']);

        $query = Project::query();

        if ($search = $filters['search'] ?? null) {
            $ids = Project::search($search)->keys();
            $query->whereIn('id', $ids);
        }

        $query->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));
        $query->when($filters['priority'] ?? null, fn ($q, $priority) => $q->where('priority', $priority));

        $projects = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Projects/Create', [
            'statuses' => collect(ProjectStatus::cases())->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()]),
            'priorities' => collect(ProjectPriority::cases())->map(fn ($p) => ['value' => $p->value, 'label' => $p->label()]),
        ]);
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = Project::create($request->validated());

        return redirect()->route('projects.show', $project)
            ->with('success', 'Project created successfully.');
    }

    public function show(Project $project): Response
    {
        $project->load([
            'photos' => fn ($q) => $q->orderBy('sort_order'),
            'notes' => fn ($q) => $q->orderBy('created_at', 'desc'),
            'timeEntries' => fn ($q) => $q->orderBy('started_at', 'desc'),
            'materials',
            'expenses' => fn ($q) => $q->orderBy('expense_date', 'desc'),
            'revenues' => fn ($q) => $q->orderBy('received_date', 'desc'),
        ]);

        return Inertia::render('Projects/Show', [
            'project' => $project,
            'materials' => Material::all(['id', 'name', 'unit']),
        ]);
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('Projects/Edit', [
            'project' => $project,
            'statuses' => collect(ProjectStatus::cases())->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()]),
            'priorities' => collect(ProjectPriority::cases())->map(fn ($p) => ['value' => $p->value, 'label' => $p->label()]),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        return redirect()->route('projects.show', $project)
            ->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();

        return redirect()->route('projects.index')
            ->with('success', 'Project deleted successfully.');
    }

    public function uploadPhoto(StoreProjectPhotoRequest $request, Project $project, PhotoUploadService $service): RedirectResponse
    {
        $service->upload($request->file('photo'), $project, $request->validated('caption'));

        return redirect()->route('projects.show', $project)
            ->with('success', 'Photo uploaded successfully.');
    }

    public function logTime(LogTimeRequest $request, Project $project): RedirectResponse
    {
        $data = $request->validated();

        // Auto-stop any running timer
        $running = TimeEntry::running()->first();
        if ($running) {
            $now = now();
            $running->ended_at = $now;
            $running->duration_minutes = max(1, $running->started_at->diffInMinutes($now));
            $running->save();
        }

        // Compute duration if ended_at is provided but duration_minutes is not
        if (!empty($data['ended_at']) && empty($data['duration_minutes'])) {
            $data['duration_minutes'] = max(1, \Carbon\Carbon::parse($data['started_at'])->diffInMinutes(\Carbon\Carbon::parse($data['ended_at'])));
        }

        $project->timeEntries()->create($data);

        return redirect()->route('projects.show', $project)
            ->with('success', 'Time entry logged.');
    }

    public function stopTimer(Project $project, TimeEntry $entry): RedirectResponse
    {
        $now = now();
        $entry->ended_at = $now;
        $entry->duration_minutes = max(1, $entry->started_at->diffInMinutes($now));
        $entry->save();

        return redirect()->route('projects.show', $project)
            ->with('success', 'Timer stopped.');
    }

    public function attachMaterial(AttachMaterialRequest $request, Project $project): RedirectResponse
    {
        $data = $request->validated();
        $material = Material::findOrFail($data['material_id']);

        $costAtTime = $material->unit_cost !== null
            ? round($material->unit_cost * $data['quantity_used'], 2)
            : null;

        $pivotData = [
            'quantity_used' => $data['quantity_used'],
            'cost_at_time' => $costAtTime,
            'notes' => $data['notes'] ?? null,
        ];

        if ($project->materials()->where('material_id', $material->id)->exists()) {
            $project->materials()->updateExistingPivot($material->id, $pivotData);
        } else {
            $project->materials()->attach($material->id, $pivotData);
        }

        return redirect()->route('projects.show', $project)
            ->with('success', 'Material attached.');
    }

    public function addNote(AddNoteRequest $request, Project $project): RedirectResponse
    {
        $project->notes()->create(['content' => $request->validated('content')]);

        return redirect()->route('projects.show', $project)
            ->with('success', 'Note added.');
    }
}
