<?php

namespace App\Http\Controllers;

use App\Models\Material;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaterialController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Materials/Index');
    }

    public function create(): Response
    {
        return Inertia::render('Materials/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        return redirect()->back();
    }

    public function show(Material $material): Response
    {
        return Inertia::render('Materials/Show');
    }

    public function edit(Material $material): Response
    {
        return Inertia::render('Materials/Edit');
    }

    public function update(Request $request, Material $material): RedirectResponse
    {
        return redirect()->back();
    }

    public function adjustStock(Request $request, Material $material): RedirectResponse
    {
        return redirect()->back();
    }
}
