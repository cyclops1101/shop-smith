import { Head, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Badge from '@/Components/ui/Badge';
import Alert from '@/Components/ui/Alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const SCALE_MAX_WIDTH = 600;

function BoardSvg({ board, index }) {
    const scale = SCALE_MAX_WIDTH / board.length;
    const svgWidth = board.length * scale;
    const svgHeight = board.width * scale;

    return (
        <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{board.label}</span>
                <Badge variant="secondary">
                    {board.efficiency.toFixed(1)}% efficient
                </Badge>
            </div>
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="rounded border border-gray-300"
            >
                {/* Board background (waste area) */}
                <rect
                    x={0}
                    y={0}
                    width={svgWidth}
                    height={svgHeight}
                    fill="#f3f4f6"
                    stroke="#d1d5db"
                    strokeWidth={1}
                />

                {/* Cut pieces */}
                {board.cuts.map((cut, cutIndex) => {
                    const color = COLORS[cutIndex % COLORS.length];
                    const cx = cut.x * scale;
                    const cy = cut.y * scale;
                    const cw = cut.length * scale;
                    const ch = cut.width * scale;

                    return (
                        <g key={cutIndex}>
                            <rect
                                x={cx}
                                y={cy}
                                width={cw}
                                height={ch}
                                fill={color}
                                fillOpacity={0.55}
                                stroke={color}
                                strokeWidth={1.5}
                            />
                            <text
                                x={cx + cw / 2}
                                y={cy + ch / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#111827"
                                fontSize={Math.min(12, cw / 6, ch / 3)}
                                fontWeight="600"
                            >
                                {cut.label}
                            </text>
                            <text
                                x={cx + cw / 2}
                                y={cy + ch / 2 + Math.min(12, cw / 6, ch / 3) * 0.9}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#4b5563"
                                fontSize={Math.min(9, cw / 8, ch / 4)}
                            >
                                {cut.length}&times;{cut.width}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <p className="mt-1 text-xs text-gray-500">
                {board.length} &times; {board.width} &mdash;
                Used: {board.used_area.toFixed(1)} sq &middot;
                Waste: {board.waste_area.toFixed(1)} sq
            </p>
        </div>
    );
}

export default function CutListIndex({ projects, materials, selectedProject, boards, pieces, result }) {
    const { flash } = usePage().props;

    const projectOptions = projects.map((p) => ({ value: p.id, label: p.title }));
    const materialOptions = materials.map((m) => ({ value: m.id, label: m.name }));

    const boardForm = useForm({
        project_id: selectedProject?.id ?? '',
        label: '',
        material_id: '',
        length: '',
        width: '',
        thickness: '',
        quantity: 1,
    });

    const pieceForm = useForm({
        project_id: selectedProject?.id ?? '',
        label: '',
        length: '',
        width: '',
        thickness: '',
        quantity: 1,
        grain_direction: false,
    });

    function handleProjectChange(e) {
        const projectId = e.target.value;
        if (projectId) {
            router.get(route('cut-list.index'), { project: projectId }, { preserveState: false });
        } else {
            router.get(route('cut-list.index'));
        }
    }

    function handleAddBoard(e) {
        e.preventDefault();
        boardForm.post(route('cut-list.store-board'), {
            preserveScroll: true,
            onSuccess: () => {
                boardForm.reset('label', 'material_id', 'length', 'width', 'thickness', 'quantity');
                boardForm.setData('quantity', 1);
            },
        });
    }

    function handleAddPiece(e) {
        e.preventDefault();
        pieceForm.post(route('cut-list.store-piece'), {
            preserveScroll: true,
            onSuccess: () => {
                pieceForm.reset('label', 'length', 'width', 'thickness', 'quantity', 'grain_direction');
                pieceForm.setData('quantity', 1);
            },
        });
    }

    function handleDeleteBoard(boardId) {
        if (window.confirm('Remove this board from the cut list?')) {
            router.delete(route('cut-list.destroy-board', boardId), { preserveScroll: true });
        }
    }

    function handleDeletePiece(pieceId) {
        if (window.confirm('Remove this piece from the cut list?')) {
            router.delete(route('cut-list.destroy-piece', pieceId), { preserveScroll: true });
        }
    }

    function handleOptimize() {
        router.post(route('cut-list.optimize'), { project_id: selectedProject.id }, { preserveScroll: true });
    }

    return (
        <AppLayout title="Cut List Optimizer">
            <Head title="Cut List Optimizer" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Cut List Optimizer</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Define stock boards and required pieces, then optimize your cuts to minimize waste.
                        </p>
                    </div>

                    {/* Flash Messages */}
                    {flash?.success && (
                        <div className="mb-4">
                            <Alert variant="success">{flash.success}</Alert>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4">
                            <Alert variant="error">{flash.error}</Alert>
                        </div>
                    )}

                    {/* Project Selector */}
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Label htmlFor="project-selector" className="shrink-0 font-semibold">
                                    Project
                                </Label>
                                <div className="w-full max-w-sm">
                                    <Select
                                        id="project-selector"
                                        options={projectOptions}
                                        value={selectedProject?.id ?? ''}
                                        onChange={handleProjectChange}
                                        placeholder="Select a project..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Empty state when no project selected */}
                    {!selectedProject && (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
                            <p className="text-gray-500">Select a project above to start building your cut list.</p>
                        </div>
                    )}

                    {/* Two-column layout when project is selected */}
                    {selectedProject && (
                        <>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Left Column: Boards (Stock) */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Boards (Stock)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Boards Table */}
                                        {boards.length > 0 ? (
                                            <div className="mb-6 rounded-lg border border-gray-200 overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Label</TableHead>
                                                            <TableHead>Material</TableHead>
                                                            <TableHead>L&times;W&times;T</TableHead>
                                                            <TableHead>Qty</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {boards.map((board) => (
                                                            <TableRow key={board.id}>
                                                                <TableCell className="font-medium">{board.label}</TableCell>
                                                                <TableCell>{board.material?.name ?? '—'}</TableCell>
                                                                <TableCell className="text-sm text-gray-500">
                                                                    {board.length}&times;{board.width}&times;{board.thickness}
                                                                </TableCell>
                                                                <TableCell>{board.quantity}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteBoard(board.id)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <p className="mb-6 text-sm text-gray-400">No boards added yet.</p>
                                        )}

                                        {/* Add Board Form */}
                                        <form onSubmit={handleAddBoard} noValidate>
                                            <h4 className="mb-3 text-sm font-semibold text-gray-700">Add Board</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor="board-label">Label</Label>
                                                    <div className="mt-1">
                                                        <Input
                                                            id="board-label"
                                                            type="text"
                                                            value={boardForm.data.label}
                                                            onChange={(e) => boardForm.setData('label', e.target.value)}
                                                            error={!!boardForm.errors.label}
                                                            placeholder='e.g. "Plywood Sheet A"'
                                                        />
                                                        {boardForm.errors.label && (
                                                            <p className="mt-1 text-sm text-red-600">{boardForm.errors.label}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label htmlFor="board-material">Material</Label>
                                                    <div className="mt-1">
                                                        <Select
                                                            id="board-material"
                                                            options={materialOptions}
                                                            value={boardForm.data.material_id}
                                                            onChange={(e) => boardForm.setData('material_id', e.target.value)}
                                                            error={!!boardForm.errors.material_id}
                                                            placeholder="Select material..."
                                                        />
                                                        {boardForm.errors.material_id && (
                                                            <p className="mt-1 text-sm text-red-600">{boardForm.errors.material_id}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <Label htmlFor="board-length">Length</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="board-length"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={boardForm.data.length}
                                                                onChange={(e) => boardForm.setData('length', e.target.value)}
                                                                error={!!boardForm.errors.length}
                                                            />
                                                            {boardForm.errors.length && (
                                                                <p className="mt-1 text-sm text-red-600">{boardForm.errors.length}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="board-width">Width</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="board-width"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={boardForm.data.width}
                                                                onChange={(e) => boardForm.setData('width', e.target.value)}
                                                                error={!!boardForm.errors.width}
                                                            />
                                                            {boardForm.errors.width && (
                                                                <p className="mt-1 text-sm text-red-600">{boardForm.errors.width}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="board-thickness">Thickness</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="board-thickness"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={boardForm.data.thickness}
                                                                onChange={(e) => boardForm.setData('thickness', e.target.value)}
                                                                error={!!boardForm.errors.thickness}
                                                            />
                                                            {boardForm.errors.thickness && (
                                                                <p className="mt-1 text-sm text-red-600">{boardForm.errors.thickness}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-24">
                                                    <Label htmlFor="board-quantity">Quantity</Label>
                                                    <div className="mt-1">
                                                        <Input
                                                            id="board-quantity"
                                                            type="number"
                                                            step="1"
                                                            min="1"
                                                            value={boardForm.data.quantity}
                                                            onChange={(e) => boardForm.setData('quantity', e.target.value)}
                                                            error={!!boardForm.errors.quantity}
                                                        />
                                                        {boardForm.errors.quantity && (
                                                            <p className="mt-1 text-sm text-red-600">{boardForm.errors.quantity}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    size="sm"
                                                    loading={boardForm.processing}
                                                    disabled={boardForm.processing}
                                                >
                                                    Add Board
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* Right Column: Pieces (Cuts Needed) */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Pieces (Cuts Needed)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Pieces Table */}
                                        {pieces.length > 0 ? (
                                            <div className="mb-6 rounded-lg border border-gray-200 overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Label</TableHead>
                                                            <TableHead>L&times;W&times;T</TableHead>
                                                            <TableHead>Qty</TableHead>
                                                            <TableHead>Grain?</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {pieces.map((piece) => (
                                                            <TableRow key={piece.id}>
                                                                <TableCell className="font-medium">{piece.label}</TableCell>
                                                                <TableCell className="text-sm text-gray-500">
                                                                    {piece.length}&times;{piece.width}&times;{piece.thickness}
                                                                </TableCell>
                                                                <TableCell>{piece.quantity}</TableCell>
                                                                <TableCell>
                                                                    {piece.grain_direction ? (
                                                                        <Badge variant="default">Yes</Badge>
                                                                    ) : (
                                                                        <span className="text-gray-400">No</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => handleDeletePiece(piece.id)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <p className="mb-6 text-sm text-gray-400">No pieces added yet.</p>
                                        )}

                                        {/* Add Piece Form */}
                                        <form onSubmit={handleAddPiece} noValidate>
                                            <h4 className="mb-3 text-sm font-semibold text-gray-700">Add Piece</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor="piece-label">Label</Label>
                                                    <div className="mt-1">
                                                        <Input
                                                            id="piece-label"
                                                            type="text"
                                                            value={pieceForm.data.label}
                                                            onChange={(e) => pieceForm.setData('label', e.target.value)}
                                                            error={!!pieceForm.errors.label}
                                                            placeholder='e.g. "Shelf Side Left"'
                                                        />
                                                        {pieceForm.errors.label && (
                                                            <p className="mt-1 text-sm text-red-600">{pieceForm.errors.label}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <Label htmlFor="piece-length">Length</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="piece-length"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={pieceForm.data.length}
                                                                onChange={(e) => pieceForm.setData('length', e.target.value)}
                                                                error={!!pieceForm.errors.length}
                                                            />
                                                            {pieceForm.errors.length && (
                                                                <p className="mt-1 text-sm text-red-600">{pieceForm.errors.length}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="piece-width">Width</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="piece-width"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={pieceForm.data.width}
                                                                onChange={(e) => pieceForm.setData('width', e.target.value)}
                                                                error={!!pieceForm.errors.width}
                                                            />
                                                            {pieceForm.errors.width && (
                                                                <p className="mt-1 text-sm text-red-600">{pieceForm.errors.width}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="piece-thickness">Thickness</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="piece-thickness"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={pieceForm.data.thickness}
                                                                onChange={(e) => pieceForm.setData('thickness', e.target.value)}
                                                                error={!!pieceForm.errors.thickness}
                                                            />
                                                            {pieceForm.errors.thickness && (
                                                                <p className="mt-1 text-sm text-red-600">{pieceForm.errors.thickness}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="w-24">
                                                        <Label htmlFor="piece-quantity">Quantity</Label>
                                                        <div className="mt-1">
                                                            <Input
                                                                id="piece-quantity"
                                                                type="number"
                                                                step="1"
                                                                min="1"
                                                                value={pieceForm.data.quantity}
                                                                onChange={(e) => pieceForm.setData('quantity', e.target.value)}
                                                                error={!!pieceForm.errors.quantity}
                                                            />
                                                            {pieceForm.errors.quantity && (
                                                                <p className="mt-1 text-sm text-red-600">{pieceForm.errors.quantity}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="pt-5">
                                                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={pieceForm.data.grain_direction}
                                                                onChange={(e) => pieceForm.setData('grain_direction', e.target.checked)}
                                                                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                            />
                                                            Grain direction matters
                                                        </label>
                                                        {pieceForm.errors.grain_direction && (
                                                            <p className="mt-1 text-sm text-red-600">{pieceForm.errors.grain_direction}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    size="sm"
                                                    loading={pieceForm.processing}
                                                    disabled={pieceForm.processing}
                                                >
                                                    Add Piece
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Optimize Button */}
                            <div className="mt-8 flex justify-center">
                                <Button
                                    variant="default"
                                    size="lg"
                                    onClick={handleOptimize}
                                    disabled={boards.length === 0 || pieces.length === 0}
                                    className="px-12"
                                >
                                    Optimize Cut List
                                </Button>
                            </div>

                            {/* Results Section */}
                            {result && (
                                <div className="mt-10">
                                    <h2 className="mb-6 text-xl font-semibold text-gray-900">Optimization Results</h2>

                                    {/* Summary Cards */}
                                    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <p className="text-sm text-gray-500">Boards Used</p>
                                                <p className="mt-1 text-3xl font-bold text-gray-900">
                                                    {result.summary.boards_used}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <p className="text-sm text-gray-500">Pieces Placed</p>
                                                <p className="mt-1 text-3xl font-bold text-gray-900">
                                                    {result.summary.pieces_placed}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <p className="text-sm text-gray-500">Overall Efficiency</p>
                                                <p className="mt-1 text-3xl font-bold text-green-600">
                                                    {result.summary.overall_efficiency.toFixed(1)}%
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <p className="text-sm text-gray-500">Total Waste</p>
                                                <p className="mt-1 text-3xl font-bold text-red-600">
                                                    {result.summary.total_waste_area.toFixed(1)}
                                                </p>
                                                <p className="text-xs text-gray-400">sq units</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Unplaced Pieces Warning */}
                                    {result.unplaced.length > 0 && (
                                        <div className="mb-6">
                                            <Alert variant="error">
                                                <div>
                                                    <strong>{result.summary.pieces_unplaced} piece(s) could not be placed:</strong>
                                                    <ul className="mt-1 ml-4 list-disc">
                                                        {result.unplaced.map((piece, i) => (
                                                            <li key={i}>
                                                                {piece.label} ({piece.length}&times;{piece.width})
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </Alert>
                                        </div>
                                    )}

                                    {/* Visual Board Layouts */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Board Layouts</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {result.boards.map((board, index) => (
                                                <BoardSvg key={index} board={board} index={index} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
