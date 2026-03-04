<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\MaintenanceSchedule;
use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectPhoto;
use App\Models\Revenue;
use App\Models\TimeEntry;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        // 1. Active projects (in_progress, finishing, designing)
        $activeProjects = Project::query()
            ->whereIn('status', ['in_progress', 'finishing', 'designing'])
            ->withSum('timeEntries as total_hours', 'duration_minutes')
            ->orderBy('updated_at', 'desc')
            ->get(['id', 'title', 'slug', 'status', 'priority', 'deadline', 'estimated_hours', 'is_commission', 'client_name'])
            ->map(function ($project) {
                $project->total_hours = round(($project->total_hours ?? 0) / 60, 1);

                return $project;
            });

        // 2. Low stock alerts
        $lowStockMaterials = Material::lowStock()
            ->with('supplier:id,name,website')
            ->get(['id', 'name', 'quantity_on_hand', 'low_stock_threshold', 'unit']);

        // 3. Upcoming maintenance (due soon + overdue)
        $overdueSchedules = MaintenanceSchedule::overdue()
            ->with('tool:id,name')
            ->orderBy('next_due_at')
            ->get();

        $dueSoonSchedules = MaintenanceSchedule::dueSoon()
            ->with('tool:id,name')
            ->orderBy('next_due_at')
            ->get();

        // 4. Recent activity (last 15 items across photos, time entries, notes)
        $recentPhotos = ProjectPhoto::with('project:id,title,slug')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'project_id', 'caption', 'created_at'])
            ->map(fn ($p) => [
                'type'       => 'photo',
                'message'    => $p->caption ? "Photo added: {$p->caption}" : 'Photo added',
                'project'    => $p->project?->title,
                'slug'       => $p->project?->slug,
                'created_at' => $p->created_at,
            ]);

        $recentTimeEntries = TimeEntry::with('project:id,title,slug')
            ->whereNotNull('ended_at')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'project_id', 'duration_minutes', 'description', 'created_at'])
            ->map(fn ($t) => [
                'type'       => 'time',
                'message'    => $t->description
                    ? "Logged " . round($t->duration_minutes / 60, 1) . "h: {$t->description}"
                    : "Logged " . round($t->duration_minutes / 60, 1) . 'h',
                'project'    => $t->project?->title,
                'slug'       => $t->project?->slug,
                'created_at' => $t->created_at,
            ]);

        $recentExpenses = Expense::with('project:id,title,slug')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'project_id', 'description', 'amount', 'created_at'])
            ->map(fn ($e) => [
                'type'       => 'expense',
                'message'    => "Expense: \${$e->amount} — {$e->description}",
                'project'    => $e->project?->title,
                'slug'       => $e->project?->slug,
                'created_at' => $e->created_at,
            ]);

        $recentActivity = $recentPhotos
            ->concat($recentTimeEntries)
            ->concat($recentExpenses)
            ->sortByDesc('created_at')
            ->take(10)
            ->values();

        // 5. Monthly finance summary (current month + YTD)
        $currentMonth = now()->format('Y-m');
        $currentYear  = now()->year;

        $monthExpenses = Expense::whereYear('expense_date', $currentYear)
            ->whereMonth('expense_date', now()->month)
            ->sum('amount');

        $monthRevenues = Revenue::whereYear('received_date', $currentYear)
            ->whereMonth('received_date', now()->month)
            ->sum('amount');

        $ytdExpenses = Expense::whereYear('expense_date', $currentYear)->sum('amount');
        $ytdRevenues = Revenue::whereYear('received_date', $currentYear)->sum('amount');

        return Inertia::render('Dashboard', [
            'activeProjects'    => $activeProjects,
            'lowStockMaterials' => $lowStockMaterials,
            'overdueSchedules'  => $overdueSchedules,
            'dueSoonSchedules'  => $dueSoonSchedules,
            'recentActivity'    => $recentActivity,
            'financeSummary'    => [
                'monthExpenses' => round((float) $monthExpenses, 2),
                'monthRevenues' => round((float) $monthRevenues, 2),
                'monthNet'      => round((float) ($monthRevenues - $monthExpenses), 2),
                'ytdExpenses'   => round((float) $ytdExpenses, 2),
                'ytdRevenues'   => round((float) $ytdRevenues, 2),
                'ytdNet'        => round((float) ($ytdRevenues - $ytdExpenses), 2),
            ],
        ]);
    }
}
