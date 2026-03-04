<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CutListController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('CutList/Index');
    }

    public function optimize(Request $request): RedirectResponse
    {
        return redirect()->back();
    }
}
