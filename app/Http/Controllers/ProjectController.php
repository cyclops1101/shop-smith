<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Projects/Index');
    }

    public function create(): Response
    {
        return Inertia::render('Projects/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        return redirect()->back();
    }

    public function show(Project $project): Response
    {
        return Inertia::render('Projects/Show');
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('Projects/Edit');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        return redirect()->back();
    }

    public function destroy(Project $project): RedirectResponse
    {
        return redirect()->back();
    }

    public function uploadPhoto(Request $request, Project $project): RedirectResponse
    {
        return redirect()->back();
    }

    public function logTime(Request $request, Project $project): RedirectResponse
    {
        return redirect()->back();
    }

    public function stopTimer(Project $project, TimeEntry $entry): RedirectResponse
    {
        return redirect()->back();
    }

    public function attachMaterial(Request $request, Project $project): RedirectResponse
    {
        return redirect()->back();
    }

    public function addNote(Request $request, Project $project): RedirectResponse
    {
        return redirect()->back();
    }
}
