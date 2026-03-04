<?php

namespace App\Http\Controllers;

use App\Models\CutListBoard;
use App\Models\CutListPiece;
use App\Models\Material;
use App\Models\Project;
use App\Services\CutListOptimizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CutListController extends Controller
{
    public function index(Request $request): Response
    {
        $projectId = $request->query('project');
        $project   = $projectId ? Project::find($projectId) : null;

        $boards = $project
            ? CutListBoard::where('project_id', $project->id)->with('material:id,name')->orderBy('created_at')->get()
            : collect();

        $pieces = $project
            ? CutListPiece::where('project_id', $project->id)->orderBy('created_at')->get()
            : collect();

        return Inertia::render('CutList/Index', [
            'projects'        => Project::orderBy('title')->get(['id', 'title', 'slug']),
            'materials'       => Material::orderBy('name')->get(['id', 'name']),
            'selectedProject' => $project ? ['id' => $project->id, 'title' => $project->title] : null,
            'boards'          => $boards,
            'pieces'          => $pieces,
            'result'          => session('cutListResult'),
        ]);
    }

    public function storeBoard(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'project_id'  => ['required', 'exists:projects,id'],
            'material_id' => ['nullable', 'exists:materials,id'],
            'label'       => ['required', 'string', 'max:255'],
            'length'      => ['required', 'numeric', 'min:0.1'],
            'width'       => ['required', 'numeric', 'min:0.1'],
            'thickness'   => ['required', 'numeric', 'min:0.1'],
            'quantity'    => ['required', 'integer', 'min:1'],
        ]);

        CutListBoard::create($data);

        return redirect()->back()->with('success', 'Board added.');
    }

    public function destroyBoard(CutListBoard $board): RedirectResponse
    {
        $board->delete();

        return redirect()->back()->with('success', 'Board removed.');
    }

    public function storePiece(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'project_id'      => ['required', 'exists:projects,id'],
            'label'           => ['required', 'string', 'max:255'],
            'length'          => ['required', 'numeric', 'min:0.1'],
            'width'           => ['required', 'numeric', 'min:0.1'],
            'thickness'       => ['required', 'numeric', 'min:0.1'],
            'quantity'        => ['required', 'integer', 'min:1'],
            'grain_direction' => ['boolean'],
        ]);

        CutListPiece::create($data);

        return redirect()->back()->with('success', 'Piece added.');
    }

    public function destroyPiece(CutListPiece $piece): RedirectResponse
    {
        $piece->delete();

        return redirect()->back()->with('success', 'Piece removed.');
    }

    public function optimize(Request $request): RedirectResponse
    {
        $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
        ]);

        $projectId = $request->input('project_id');

        $boards = CutListBoard::where('project_id', $projectId)->get()->map(fn ($b) => [
            'id'       => $b->id,
            'label'    => $b->label,
            'length'   => (float) $b->length,
            'width'    => (float) $b->width,
            'quantity' => $b->quantity,
        ])->toArray();

        $pieces = CutListPiece::where('project_id', $projectId)->get()->map(fn ($p) => [
            'id'              => $p->id,
            'label'           => $p->label,
            'length'          => (float) $p->length,
            'width'           => (float) $p->width,
            'quantity'        => $p->quantity,
            'grain_direction' => $p->grain_direction,
        ])->toArray();

        if (empty($boards) || empty($pieces)) {
            return redirect()->back()->with('error', 'Need at least one board and one piece to optimize.');
        }

        $optimizer = new CutListOptimizer;
        $result    = $optimizer->optimize($boards, $pieces);

        return redirect()
            ->route('cut-list.index', ['project' => $projectId])
            ->with('cutListResult', $result);
    }
}
