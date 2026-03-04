import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
import Alert from '@/Components/ui/Alert';

const STATUS_COLORS = {
    planned: '#6b7280',
    designing: '#3b82f6',
    in_progress: '#d97706',
    finishing: '#7c3aed',
    on_hold: '#eab308',
    completed: '#16a34a',
    archived: '#475569',
};
const STATUS_LABELS = {
    planned: 'Planned',
    designing: 'Designing',
    in_progress: 'In Progress',
    finishing: 'Finishing',
    on_hold: 'On Hold',
    completed: 'Completed',
    archived: 'Archived',
};
const PRIORITY_COLORS = { low: '#6b7280', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

function formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
}

function PhotosSection({ project }) {
    const photoForm = useForm({ photo: null, caption: '' });

    function handlePhotoSubmit(e) {
        e.preventDefault();
        photoForm.post(route('projects.upload-photo', project.slug), {
            forceFormData: true,
            onSuccess: () => photoForm.reset(),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
                {project.photos && project.photos.length > 0 ? (
                    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {project.photos.map((photo) => (
                            <div key={photo.id} className="group relative">
                                <a
                                    href={'/storage/' + photo.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block overflow-hidden rounded-md border border-gray-200"
                                >
                                    <img
                                        src={'/storage/' + (photo.thumbnail_path || photo.file_path)}
                                        alt={photo.caption || 'Project photo'}
                                        className="h-32 w-full object-cover transition-transform duration-150 group-hover:scale-105"
                                    />
                                </a>
                                {photo.caption && (
                                    <p className="mt-1 text-xs text-gray-500 truncate">{photo.caption}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mb-6 text-sm text-gray-500">No photos yet.</p>
                )}

                <form onSubmit={handlePhotoSubmit} className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Upload Photo</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="photo-file">Photo</Label>
                            <Input
                                id="photo-file"
                                type="file"
                                accept="image/*"
                                error={!!photoForm.errors.photo}
                                onChange={(e) => photoForm.setData('photo', e.target.files[0])}
                                className="mt-1"
                            />
                            {photoForm.errors.photo && (
                                <p className="mt-1 text-xs text-red-600">{photoForm.errors.photo}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="photo-caption">Caption (optional)</Label>
                            <Input
                                id="photo-caption"
                                type="text"
                                placeholder="Describe this photo…"
                                value={photoForm.data.caption}
                                error={!!photoForm.errors.caption}
                                onChange={(e) => photoForm.setData('caption', e.target.value)}
                                className="mt-1"
                            />
                            {photoForm.errors.caption && (
                                <p className="mt-1 text-xs text-red-600">{photoForm.errors.caption}</p>
                            )}
                        </div>
                    </div>
                    <Button type="submit" loading={photoForm.processing} size="sm">
                        Upload Photo
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function NotesSection({ project }) {
    const noteForm = useForm({ content: '' });

    function handleNoteSubmit(e) {
        e.preventDefault();
        noteForm.post(route('projects.add-note', project.slug), {
            onSuccess: () => noteForm.reset(),
        });
    }

    const sortedNotes = project.notes
        ? [...project.notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
                {sortedNotes.length > 0 ? (
                    <div className="mb-6 space-y-4">
                        {sortedNotes.map((note) => (
                            <div key={note.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
                                <p className="mt-2 text-xs text-gray-400">{formatDateTime(note.created_at)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mb-6 text-sm text-gray-500">No notes yet.</p>
                )}

                <form onSubmit={handleNoteSubmit} className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Add Note</p>
                    <div>
                        <Textarea
                            placeholder="Write a note…"
                            rows={4}
                            value={noteForm.data.content}
                            error={!!noteForm.errors.content}
                            onChange={(e) => noteForm.setData('content', e.target.value)}
                        />
                        {noteForm.errors.content && (
                            <p className="mt-1 text-xs text-red-600">{noteForm.errors.content}</p>
                        )}
                    </div>
                    <Button type="submit" loading={noteForm.processing} size="sm">
                        Add Note
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function TimeLogSection({ project }) {
    const timeForm = useForm({ started_at: '', ended_at: '', description: '' });

    const completedEntries = project.time_entries
        ? project.time_entries.filter((e) => e.duration_minutes)
        : [];
    const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    function handleTimeSubmit(e) {
        e.preventDefault();
        timeForm.post(route('projects.log-time', project.slug), {
            onSuccess: () => timeForm.reset(),
        });
    }

    function handleStopTimer(entry) {
        router.put(route('projects.stop-timer', { project: project.slug, entry: entry.id }));
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Time Log</CardTitle>
                    <span className="text-sm text-gray-500">
                        Total: <strong>{totalHours}h</strong>
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                {project.time_entries && project.time_entries.length > 0 ? (
                    <div className="mb-6 overflow-hidden rounded-md border border-gray-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Ended</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {project.time_entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{formatDate(entry.started_at)}</TableCell>
                                        <TableCell>{entry.description || '—'}</TableCell>
                                        <TableCell>{formatDateTime(entry.started_at)}</TableCell>
                                        <TableCell>
                                            {entry.ended_at ? formatDateTime(entry.ended_at) : (
                                                <span className="inline-flex items-center gap-1 text-amber-600">
                                                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                                    Running
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDuration(entry.duration_minutes)}</TableCell>
                                        <TableCell>
                                            {!entry.ended_at && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleStopTimer(entry)}
                                                >
                                                    Stop
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="mb-6 text-sm text-gray-500">No time entries yet.</p>
                )}

                <form onSubmit={handleTimeSubmit} className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Log Time</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <Label htmlFor="time-started">Started At</Label>
                            <Input
                                id="time-started"
                                type="datetime-local"
                                value={timeForm.data.started_at}
                                error={!!timeForm.errors.started_at}
                                onChange={(e) => timeForm.setData('started_at', e.target.value)}
                                className="mt-1"
                            />
                            {timeForm.errors.started_at && (
                                <p className="mt-1 text-xs text-red-600">{timeForm.errors.started_at}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="time-ended">Ended At</Label>
                            <Input
                                id="time-ended"
                                type="datetime-local"
                                value={timeForm.data.ended_at}
                                error={!!timeForm.errors.ended_at}
                                onChange={(e) => timeForm.setData('ended_at', e.target.value)}
                                className="mt-1"
                            />
                            {timeForm.errors.ended_at && (
                                <p className="mt-1 text-xs text-red-600">{timeForm.errors.ended_at}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="time-description">Description</Label>
                            <Input
                                id="time-description"
                                type="text"
                                placeholder="What were you working on?"
                                value={timeForm.data.description}
                                error={!!timeForm.errors.description}
                                onChange={(e) => timeForm.setData('description', e.target.value)}
                                className="mt-1"
                            />
                            {timeForm.errors.description && (
                                <p className="mt-1 text-xs text-red-600">{timeForm.errors.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" loading={timeForm.processing} size="sm">
                            Log Time
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={timeForm.processing}
                            onClick={() => {
                                timeForm.setData({
                                    started_at: new Date().toISOString().slice(0, 16),
                                    ended_at: '',
                                    description: timeForm.data.description,
                                });
                            }}
                        >
                            Start Timer
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function MaterialsSection({ project, materials }) {
    const materialForm = useForm({ material_id: '', quantity_used: '', notes: '' });

    const materialOptions = materials
        ? materials.map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` }))
        : [];

    function handleMaterialSubmit(e) {
        e.preventDefault();
        materialForm.post(route('projects.attach-material', project.slug), {
            onSuccess: () => materialForm.reset(),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Materials</CardTitle>
            </CardHeader>
            <CardContent>
                {project.materials && project.materials.length > 0 ? (
                    <div className="mb-6 overflow-hidden rounded-md border border-gray-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Unit Cost</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {project.materials.map((material) => {
                                    const qty = material.pivot?.quantity_used;
                                    const cost = material.pivot?.cost_at_time;
                                    const total = qty && cost ? qty * cost : null;
                                    return (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-medium">{material.name}</TableCell>
                                            <TableCell>{qty ?? '—'}</TableCell>
                                            <TableCell>{material.unit}</TableCell>
                                            <TableCell>{formatCurrency(cost)}</TableCell>
                                            <TableCell>{formatCurrency(total)}</TableCell>
                                            <TableCell>{material.pivot?.notes || '—'}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="mb-6 text-sm text-gray-500">No materials attached yet.</p>
                )}

                <form onSubmit={handleMaterialSubmit} className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Attach Material</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <Label htmlFor="material-select">Material</Label>
                            <Select
                                id="material-select"
                                options={materialOptions}
                                placeholder="Select material…"
                                value={materialForm.data.material_id}
                                error={!!materialForm.errors.material_id}
                                onChange={(e) => materialForm.setData('material_id', e.target.value)}
                                className="mt-1"
                            />
                            {materialForm.errors.material_id && (
                                <p className="mt-1 text-xs text-red-600">{materialForm.errors.material_id}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="material-quantity">Quantity Used</Label>
                            <Input
                                id="material-quantity"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={materialForm.data.quantity_used}
                                error={!!materialForm.errors.quantity_used}
                                onChange={(e) => materialForm.setData('quantity_used', e.target.value)}
                                className="mt-1"
                            />
                            {materialForm.errors.quantity_used && (
                                <p className="mt-1 text-xs text-red-600">{materialForm.errors.quantity_used}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="material-notes">Notes</Label>
                            <Input
                                id="material-notes"
                                type="text"
                                placeholder="Optional notes…"
                                value={materialForm.data.notes}
                                error={!!materialForm.errors.notes}
                                onChange={(e) => materialForm.setData('notes', e.target.value)}
                                className="mt-1"
                            />
                            {materialForm.errors.notes && (
                                <p className="mt-1 text-xs text-red-600">{materialForm.errors.notes}</p>
                            )}
                        </div>
                    </div>
                    <Button type="submit" loading={materialForm.processing} size="sm">
                        Attach Material
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function ExpensesSection({ project }) {
    const expenses = project.expenses || [];
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Expenses</CardTitle>
            </CardHeader>
            <CardContent>
                {expenses.length > 0 ? (
                    <div className="overflow-hidden rounded-md border border-gray-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{formatDate(expense.expense_date)}</TableCell>
                                        <TableCell>{expense.category || '—'}</TableCell>
                                        <TableCell>{expense.description || '—'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-gray-50 font-medium">
                                    <TableCell colSpan={3} className="text-right text-gray-700">
                                        Total
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-gray-900">
                                        {formatCurrency(total)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No expenses recorded.</p>
                )}
            </CardContent>
        </Card>
    );
}

function RevenuesSection({ project }) {
    const revenues = project.revenues || [];
    const total = revenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                {revenues.length > 0 ? (
                    <div className="overflow-hidden rounded-md border border-gray-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Payment Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {revenues.map((revenue) => (
                                    <TableRow key={revenue.id}>
                                        <TableCell>{formatDate(revenue.received_date)}</TableCell>
                                        <TableCell>{revenue.client_name || '—'}</TableCell>
                                        <TableCell>{revenue.description || '—'}</TableCell>
                                        <TableCell>{revenue.payment_method || '—'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(revenue.amount)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-gray-50 font-medium">
                                    <TableCell colSpan={4} className="text-right text-gray-700">
                                        Total
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-gray-900">
                                        {formatCurrency(total)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No revenue recorded.</p>
                )}
            </CardContent>
        </Card>
    );
}

export default function ProjectShow({ project, materials }) {
    const { flash } = usePage().props;

    function handleDelete() {
        if (confirm('Delete this project?')) {
            router.delete(route('projects.destroy', project.slug));
        }
    }

    return (
        <AppLayout>
            <Head title={project.title} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Flash Messages */}
                    {flash?.success && (
                        <Alert variant="success">{flash.success}</Alert>
                    )}
                    {flash?.error && (
                        <Alert variant="error">{flash.error}</Alert>
                    )}
                    {flash?.warning && (
                        <Alert variant="warning">{flash.warning}</Alert>
                    )}
                    {flash?.info && (
                        <Alert variant="info">{flash.info}</Alert>
                    )}

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                            <Badge color={STATUS_COLORS[project.status]}>
                                {STATUS_LABELS[project.status] ?? project.status}
                            </Badge>
                            {project.priority && (
                                <Badge color={PRIORITY_COLORS[project.priority]}>
                                    {PRIORITY_LABELS[project.priority] ?? project.priority}
                                </Badge>
                            )}
                            {project.is_commission && (
                                <Badge variant="secondary">Commission</Badge>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Link href={route('projects.edit', project.slug)}>
                                <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* 1. Overview Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                                {project.description && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Description
                                        </dt>
                                        <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                            {project.description}
                                        </dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Estimated Hours
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {project.estimated_hours != null ? `${project.estimated_hours}h` : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Estimated Cost
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {formatCurrency(project.estimated_cost)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Actual Cost
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {formatCurrency(project.actual_cost)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Sell Price
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {formatCurrency(project.sell_price)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Deadline
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {formatDate(project.deadline)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Started
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {formatDate(project.started_at)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Completed
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-800">
                                        {formatDate(project.completed_at)}
                                    </dd>
                                </div>
                                {project.is_commission && (
                                    <>
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Client Name
                                            </dt>
                                            <dd className="mt-1 text-sm text-gray-800">
                                                {project.client_name || '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Client Contact
                                            </dt>
                                            <dd className="mt-1 text-sm text-gray-800">
                                                {project.client_contact || '—'}
                                            </dd>
                                        </div>
                                    </>
                                )}
                                {project.notes && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Notes
                                        </dt>
                                        <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                            {project.notes}
                                        </dd>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Photos Section */}
                    <PhotosSection project={project} />

                    {/* 3. Notes Section */}
                    <NotesSection project={project} />

                    {/* 4. Time Log Section */}
                    <TimeLogSection project={project} />

                    {/* 5. Materials Section */}
                    <MaterialsSection project={project} materials={materials} />

                    {/* 6. Expenses Section */}
                    <ExpensesSection project={project} />

                    {/* 7. Revenues Section */}
                    <RevenuesSection project={project} />

                </div>
            </div>
        </AppLayout>
    );
}
