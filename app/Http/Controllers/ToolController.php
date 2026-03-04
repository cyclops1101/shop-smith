<?php

namespace App\Http\Controllers;

use App\Enums\MaintenanceType;
use App\Http\Requests\LogMaintenanceRequest;
use App\Http\Requests\StoreMaintenanceScheduleRequest;
use App\Http\Requests\StoreToolRequest;
use App\Http\Requests\UpdateToolRequest;
use App\Models\MaintenanceSchedule;
use App\Models\Tool;
use App\Models\ToolCategory;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ToolController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'category']);

        $query = Tool::query();

        if ($search = $filters['search'] ?? null) {
            $ids = Tool::search($search)->keys();
            $query->whereIn('id', $ids);
        }

        $query->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category_id', $v));

        $tools = $query->with(['category'])->latest()->paginate(15)->withQueryString();

        return Inertia::render('Tools/Index', [
            'tools'      => $tools,
            'filters'    => $filters,
            'categories' => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Tools/Create', [
            'categories'       => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
            'maintenanceTypes' => collect(MaintenanceType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
        ]);
    }

    public function store(StoreToolRequest $request): RedirectResponse
    {
        $tool = Tool::create($request->validated());

        return redirect()->route('tools.show', $tool)
            ->with('success', 'Tool created successfully.');
    }

    public function show(Tool $tool): Response
    {
        $tool->load([
            'category',
            'maintenanceSchedules' => fn ($q) => $q->orderBy('next_due_at'),
            'maintenanceLogs'      => fn ($q) => $q->orderBy('performed_at', 'desc')->limit(20),
        ]);

        return Inertia::render('Tools/Show', [
            'tool'             => $tool,
            'maintenanceTypes' => collect(MaintenanceType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
        ]);
    }

    public function edit(Tool $tool): Response
    {
        return Inertia::render('Tools/Edit', [
            'tool'       => $tool,
            'categories' => ToolCategory::orderBy('sort_order')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateToolRequest $request, Tool $tool): RedirectResponse
    {
        $tool->update($request->validated());

        return redirect()->route('tools.show', $tool)
            ->with('success', 'Tool updated successfully.');
    }

    public function destroy(Tool $tool): RedirectResponse
    {
        $tool->delete();

        return redirect()->route('tools.index')
            ->with('success', 'Tool deleted.');
    }

    public function logMaintenance(LogMaintenanceRequest $request, Tool $tool): RedirectResponse
    {
        $data = $request->validated();

        $tool->maintenanceLogs()->create([
            'schedule_id'      => $data['schedule_id'] ?? null,
            'maintenance_type' => $data['maintenance_type'],
            'description'      => $data['description'],
            'performed_at'     => $data['performed_at'],
            'cost'             => $data['cost'] ?? null,
        ]);

        if (!empty($data['schedule_id'])) {
            $schedule = MaintenanceSchedule::find($data['schedule_id']);
            if ($schedule) {
                $performedAt = Carbon::parse($data['performed_at']);
                $schedule->last_performed_at = $performedAt;

                if ($schedule->interval_days) {
                    $schedule->next_due_at = $performedAt->copy()->addDays($schedule->interval_days);
                } elseif ($schedule->interval_hours) {
                    $schedule->next_due_at = $performedAt->copy()->addHours($schedule->interval_hours);
                } else {
                    $schedule->next_due_at = null;
                }

                $schedule->save();
            }
        }

        if (!empty($data['usage_hours_at'])) {
            $tool->update(['total_usage_hours' => $data['usage_hours_at']]);
        }

        return redirect()->route('tools.show', $tool)
            ->with('success', 'Maintenance logged successfully.');
    }

    public function storeSchedule(StoreMaintenanceScheduleRequest $request, Tool $tool): RedirectResponse
    {
        $tool->maintenanceSchedules()->create($request->validated());

        return redirect()->route('tools.show', $tool)
            ->with('success', 'Maintenance schedule added.');
    }

    public function destroySchedule(Tool $tool, MaintenanceSchedule $schedule): RedirectResponse
    {
        $schedule->delete();

        return redirect()->route('tools.show', $tool)
            ->with('success', 'Schedule removed.');
    }
}
