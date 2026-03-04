<?php

namespace App\Http\Controllers;

use App\Enums\MaterialUnit;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Requests\StoreMaterialRequest;
use App\Http\Requests\UpdateMaterialRequest;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaterialController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'category', 'supplier']);

        $query = Material::query();

        if ($search = $filters['search'] ?? null) {
            $ids = Material::search($search)->keys();
            $query->whereIn('id', $ids);
        }

        $query->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category_id', $v));
        $query->when($filters['supplier'] ?? null, fn ($q, $v) => $q->where('supplier_id', $v));

        $materials = $query->with(['category', 'supplier'])->latest()->paginate(15)->withQueryString();

        return Inertia::render('Materials/Index', [
            'materials'  => $materials,
            'filters'    => $filters,
            'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
            'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Materials/Create', [
            'units'      => collect(MaterialUnit::cases())->map(fn ($u) => ['value' => $u->value, 'label' => $u->label()]),
            'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
            'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreMaterialRequest $request): RedirectResponse
    {
        $material = Material::create($request->validated());

        return redirect()->route('materials.show', $material)
            ->with('success', 'Material created successfully.');
    }

    public function show(Material $material): Response
    {
        $material->load(['category', 'supplier', 'projects']);

        return Inertia::render('Materials/Show', [
            'material' => $material,
        ]);
    }

    public function edit(Material $material): Response
    {
        return Inertia::render('Materials/Edit', [
            'material'   => $material,
            'units'      => collect(MaterialUnit::cases())->map(fn ($u) => ['value' => $u->value, 'label' => $u->label()]),
            'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
            'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateMaterialRequest $request, Material $material): RedirectResponse
    {
        $material->update($request->validated());

        return redirect()->route('materials.show', $material)
            ->with('success', 'Material updated successfully.');
    }

    public function destroy(Material $material): RedirectResponse
    {
        $material->delete();

        return redirect()->route('materials.index')
            ->with('success', 'Material deleted.');
    }

    public function adjustStock(AdjustStockRequest $request, Material $material): RedirectResponse
    {
        $data  = $request->validated();
        $delta = (float) $data['quantity'];

        $material->adjustQuantity($delta);

        $direction = $delta >= 0 ? 'Added' : 'Removed';
        $abs       = abs($delta);
        $unitLabel = $material->unit->label();
        $after     = $material->quantity_on_hand;

        $message = "{$direction} {$abs} {$unitLabel} — stock now: {$after}";
        if (!empty($data['notes'])) {
            $message .= " ({$data['notes']})";
        }

        return redirect()->route('materials.show', $material)
            ->with('success', $message);
    }
}
