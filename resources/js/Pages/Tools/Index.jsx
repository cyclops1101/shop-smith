import { useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';

function FilterBar({ filters, categoryOptions, onSearchChange, onCategoryChange }) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48">
                <Input
                    type="search"
                    placeholder="Search tools..."
                    defaultValue={filters.search ?? ''}
                    onChange={onSearchChange}
                    className="w-full"
                />
            </div>
            <div className="w-44">
                <Select
                    options={categoryOptions}
                    placeholder="All categories"
                    value={filters.category ?? ''}
                    onChange={onCategoryChange}
                />
            </div>
        </div>
    );
}

function ToolsTable({ tools }) {
    const { data, links } = tools;

    const prevLink = links?.prev;
    const nextLink = links?.next;

    return (
        <div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Usage Hours</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-400 py-10">
                                    No tools found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((tool) => (
                                <TableRow key={tool.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={'/tools/' + tool.id}
                                            className="text-amber-700 hover:text-amber-900 hover:underline"
                                        >
                                            {tool.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.brand ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.model_number ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.category?.name ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.location ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-700">
                                        {tool.total_usage_hours || 0}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/tools/${tool.id}/edit`}
                                            className="text-sm text-gray-500 hover:text-gray-900"
                                        >
                                            Edit
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {(prevLink || nextLink) && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                        Page {tools.current_page} of {tools.last_page} ({tools.total} total)
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

export default function ToolsIndex({ tools, filters, categories }) {
    const debounceTimer = useRef(null);

    const navigate = useCallback((params) => {
        router.get('/tools', params, { preserveState: true, replace: true });
    }, []);

    const currentFilters = {
        search: filters?.search ?? '',
        category: filters?.category ?? '',
    };

    const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

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

    const handleCategoryChange = useCallback(
        (e) => {
            navigate({ ...currentFilters, category: e.target.value || undefined });
        },
        [currentFilters, navigate],
    );

    return (
        <AppLayout>
            <Head title="Tools" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Page header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Tools</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {tools.total} tool{tools.total !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <Link href="/tools/create">
                            <Button variant="default" size="md">
                                + New Tool
                            </Button>
                        </Link>
                    </div>

                    {/* Filter bar */}
                    <div className="mb-5">
                        <FilterBar
                            filters={currentFilters}
                            categoryOptions={categoryOptions}
                            onSearchChange={handleSearchChange}
                            onCategoryChange={handleCategoryChange}
                        />
                    </div>

                    {/* Table */}
                    <ToolsTable tools={tools} />
                </div>
            </div>
        </AppLayout>
    );
}
