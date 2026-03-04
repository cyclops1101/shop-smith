import { useState, useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { Card, CardContent } from '@/Components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';

const STATUSES = [
    { value: 'planned', label: 'Planned', color: '#6b7280' },
    { value: 'designing', label: 'Designing', color: '#3b82f6' },
    { value: 'in_progress', label: 'In Progress', color: '#d97706' },
    { value: 'finishing', label: 'Finishing', color: '#7c3aed' },
    { value: 'on_hold', label: 'On Hold', color: '#eab308' },
    { value: 'completed', label: 'Completed', color: '#16a34a' },
    { value: 'archived', label: 'Archived', color: '#475569' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low', color: '#6b7280' },
    { value: 'medium', label: 'Medium', color: '#3b82f6' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

function getStatusConfig(value) {
    return STATUSES.find((s) => s.value === value) ?? { label: value, color: '#6b7280' };
}

function getPriorityConfig(value) {
    return PRIORITIES.find((p) => p.value === value) ?? { label: value, color: '#6b7280' };
}

function formatDeadline(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function FilterBar({ filters, onSearchChange, onStatusChange, onPriorityChange }) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48">
                <Input
                    type="search"
                    placeholder="Search projects..."
                    defaultValue={filters.search ?? ''}
                    onChange={onSearchChange}
                    className="w-full"
                />
            </div>
            <div className="w-44">
                <Select
                    options={STATUSES}
                    placeholder="All statuses"
                    value={filters.status ?? ''}
                    onChange={onStatusChange}
                />
            </div>
            <div className="w-44">
                <Select
                    options={PRIORITIES}
                    placeholder="All priorities"
                    value={filters.priority ?? ''}
                    onChange={onPriorityChange}
                />
            </div>
        </div>
    );
}

function ProjectsTable({ projects }) {
    const { data, links } = projects;

    const prevLink = links?.prev;
    const nextLink = links?.next;

    return (
        <div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-400 py-10">
                                    No projects found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((project) => {
                                const status = getStatusConfig(project.status);
                                const priority = getPriorityConfig(project.priority);
                                return (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/projects/${project.slug}`}
                                                className="text-amber-700 hover:text-amber-900 hover:underline"
                                            >
                                                {project.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge color={status.color}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge color={priority.color}>{priority.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {formatDeadline(project.deadline)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link
                                                href={`/projects/${project.slug}/edit`}
                                                className="text-sm text-gray-500 hover:text-gray-900"
                                            >
                                                Edit
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {(prevLink || nextLink) && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                        Page {projects.current_page} of {projects.last_page} ({projects.total} total)
                    </span>
                    <div className="flex gap-2">
                        {prevLink ? (
                            <Link
                                href={prevLink}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Previous
                            </Link>
                        ) : (
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                                Previous
                            </span>
                        )}
                        {nextLink ? (
                            <Link
                                href={nextLink}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Next
                            </Link>
                        ) : (
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                                Next
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function BoardCard({ project }) {
    const priority = getPriorityConfig(project.priority);
    return (
        <Link href={`/projects/${project.slug}`}>
            <Card className="mb-2 hover:shadow-md transition-shadow duration-150 cursor-pointer">
                <CardContent className="p-3">
                    <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{project.title}</p>
                    <div className="flex items-center justify-between gap-2">
                        <Badge color={priority.color} className="text-xs">
                            {priority.label}
                        </Badge>
                        {project.deadline && (
                            <span className="text-xs text-gray-400">{formatDeadline(project.deadline)}</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function BoardView({ projects }) {
    const grouped = {};
    for (const status of STATUSES) {
        grouped[status.value] = [];
    }
    for (const project of projects.data) {
        if (grouped[project.status] !== undefined) {
            grouped[project.status].push(project);
        }
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map((status) => {
                const columnProjects = grouped[status.value];
                return (
                    <div key={status.value} className="flex-shrink-0 w-60">
                        <div
                            className="mb-2 flex items-center gap-2 px-1"
                        >
                            <span
                                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm font-semibold text-gray-700">{status.label}</span>
                            <span className="ml-auto text-xs text-gray-400 font-normal">
                                {columnProjects.length}
                            </span>
                        </div>
                        <div
                            className="rounded-lg bg-gray-50 border border-gray-200 p-2 min-h-24"
                        >
                            {columnProjects.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center mt-4">No projects</p>
                            ) : (
                                columnProjects.map((project) => (
                                    <BoardCard key={project.id} project={project} />
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function ProjectsIndex({ projects, filters }) {
    const [view, setView] = useState('list');
    const debounceTimer = useRef(null);

    const navigate = useCallback((params) => {
        router.get('/projects', params, { preserveState: true, replace: true });
    }, []);

    const currentFilters = {
        search: filters?.search ?? '',
        status: filters?.status ?? '',
        priority: filters?.priority ?? '',
    };

    const handleSearchChange = useCallback(
        (e) => {
            const value = e.target.value;
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                navigate({ ...currentFilters, search: value || undefined });
            }, 300);
        },
        [currentFilters, navigate],
    );

    const handleStatusChange = useCallback(
        (e) => {
            navigate({ ...currentFilters, status: e.target.value || undefined });
        },
        [currentFilters, navigate],
    );

    const handlePriorityChange = useCallback(
        (e) => {
            navigate({ ...currentFilters, priority: e.target.value || undefined });
        },
        [currentFilters, navigate],
    );

    return (
        <AppLayout>
            <Head title="Projects" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Page header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {projects.total} project{projects.total !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <Link href="/projects/create">
                            <Button variant="default" size="md">
                                + New Project
                            </Button>
                        </Link>
                    </div>

                    {/* Toolbar: filters + view toggle */}
                    <div className="mb-5 flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex-1">
                            <FilterBar
                                filters={currentFilters}
                                onSearchChange={handleSearchChange}
                                onStatusChange={handleStatusChange}
                                onPriorityChange={handlePriorityChange}
                            />
                        </div>
                        <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
                            <button
                                onClick={() => setView('list')}
                                className={
                                    'rounded px-3 py-1.5 text-sm font-medium transition-colors duration-100 ' +
                                    (view === 'list'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100')
                                }
                                aria-pressed={view === 'list'}
                            >
                                List
                            </button>
                            <button
                                onClick={() => setView('board')}
                                className={
                                    'rounded px-3 py-1.5 text-sm font-medium transition-colors duration-100 ' +
                                    (view === 'board'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100')
                                }
                                aria-pressed={view === 'board'}
                            >
                                Board
                            </button>
                        </div>
                    </div>

                    {/* View */}
                    {view === 'list' ? (
                        <ProjectsTable projects={projects} />
                    ) : (
                        <BoardView projects={projects} />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
