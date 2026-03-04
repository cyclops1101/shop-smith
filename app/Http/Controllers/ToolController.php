<?php

namespace App\Http\Controllers;

use App\Models\Tool;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ToolController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Tools/Index');
    }

    public function create(): Response
    {
        return Inertia::render('Tools/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        return redirect()->back();
    }

    public function show(Tool $tool): Response
    {
        return Inertia::render('Tools/Show');
    }

    public function edit(Tool $tool): Response
    {
        return Inertia::render('Tools/Edit');
    }

    public function update(Request $request, Tool $tool): RedirectResponse
    {
        return redirect()->back();
    }

    public function logMaintenance(Request $request, Tool $tool): RedirectResponse
    {
        return redirect()->back();
    }
}
