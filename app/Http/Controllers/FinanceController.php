<?php

namespace App\Http\Controllers;

use App\Enums\ExpenseCategory;
use App\Http\Requests\StoreExpenseRequest;
use App\Http\Requests\StoreRevenueRequest;
use App\Models\Expense;
use App\Models\Project;
use App\Models\Revenue;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function index(): Response
    {
        $expenses = Expense::with(['project:id,title,slug', 'supplier:id,name'])
            ->orderBy('expense_date', 'desc')
            ->get();

        $revenues = Revenue::with(['project:id,title,slug'])
            ->orderBy('received_date', 'desc')
            ->get();

        $totalExpenses = $expenses->sum('amount');
        $totalRevenues = $revenues->sum('amount');
        $netIncome     = $totalRevenues - $totalExpenses;

        // Build last 12 calendar months as YYYY-MM strings, oldest first
        $months = collect();
        for ($i = 11; $i >= 0; $i--) {
            $months->push(now()->subMonths($i)->format('Y-m'));
        }

        $expensesByMonth = $expenses
            ->groupBy(fn ($e) => $e->expense_date->format('Y-m'))
            ->map(fn ($group) => $group->sum('amount'));

        $revenuesByMonth = $revenues
            ->groupBy(fn ($r) => $r->received_date->format('Y-m'))
            ->map(fn ($group) => $group->sum('amount'));

        $monthlyChart = $months->map(fn ($month) => [
            'month'    => $month,
            'expenses' => round((float) ($expensesByMonth[$month] ?? 0), 2),
            'revenues' => round((float) ($revenuesByMonth[$month] ?? 0), 2),
        ])->values();

        $expensesByCategory = $expenses
            ->groupBy(fn ($e) => $e->category->value)
            ->map(fn ($group, $key) => [
                'category' => ExpenseCategory::from($key)->label(),
                'amount'   => round((float) $group->sum('amount'), 2),
            ])->values();

        $projectProfit = Project::query()
            ->whereHas('expenses')
            ->orWhereHas('revenues')
            ->get(['id', 'title', 'slug'])
            ->map(function ($project) use ($expenses, $revenues) {
                $projectExpenses = $expenses->where('project_id', $project->id)->sum('amount');
                $projectRevenues = $revenues->where('project_id', $project->id)->sum('amount');
                return [
                    'id'       => $project->id,
                    'title'    => $project->title,
                    'slug'     => $project->slug,
                    'expenses' => round((float) $projectExpenses, 2),
                    'revenues' => round((float) $projectRevenues, 2),
                    'profit'   => round((float) ($projectRevenues - $projectExpenses), 2),
                ];
            })
            ->sortByDesc('profit')
            ->values();

        return Inertia::render('Finance/Index', [
            'expenses'           => $expenses,
            'revenues'           => $revenues,
            'summary'            => [
                'totalExpenses' => round((float) $totalExpenses, 2),
                'totalRevenues' => round((float) $totalRevenues, 2),
                'netIncome'     => round((float) $netIncome, 2),
            ],
            'monthlyChart'       => $monthlyChart,
            'expensesByCategory' => $expensesByCategory,
            'projectProfit'      => $projectProfit,
            'categories'         => collect(ExpenseCategory::cases())->map(fn ($c) => [
                'value' => $c->value,
                'label' => $c->label(),
            ]),
            'projects'           => Project::orderBy('title')->get(['id', 'title', 'slug']),
            'suppliers'          => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function storeExpense(StoreExpenseRequest $request): RedirectResponse
    {
        $request->validate([
            'receipt' => ['nullable', 'file', 'image', 'max:10240'],
        ]);

        $data = $request->validated();

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $ulid = Str::ulid()->toString();
            $ext  = $file->getClientOriginalExtension();
            $path = "receipts/{$ulid}.{$ext}";
            Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));
            $data['receipt_path'] = $path;
        }

        Expense::create($data);

        return redirect()->back()->with('success', 'Expense recorded.');
    }

    public function storeRevenue(StoreRevenueRequest $request): RedirectResponse
    {
        Revenue::create($request->validated());

        return redirect()->back()->with('success', 'Revenue recorded.');
    }

    public function destroyExpense(Expense $expense): RedirectResponse
    {
        if ($expense->receipt_path) {
            Storage::disk('public')->delete($expense->receipt_path);
        }

        $expense->delete();

        return redirect()->back()->with('success', 'Expense deleted.');
    }

    public function destroyRevenue(Revenue $revenue): RedirectResponse
    {
        $revenue->delete();

        return redirect()->back()->with('success', 'Revenue deleted.');
    }
}
