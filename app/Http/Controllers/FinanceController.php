<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Finance/Index');
    }

    public function storeExpense(Request $request): RedirectResponse
    {
        return redirect()->back();
    }

    public function storeRevenue(Request $request): RedirectResponse
    {
        return redirect()->back();
    }
}
