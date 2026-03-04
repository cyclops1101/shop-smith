import { useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

function FilterBar({ filters, categoryOptions, supplierOptions, onSearchChange, onCategoryChange, onSupplierChange }) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48">
                <Input
                    type="search"
                    placeholder="Search materials..."
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
            <div className="w-44">
                <Select
                    options={supplierOptions}
                    placeholder="All suppliers"
                    value={filters.supplier ?? ''}
                    onChange={onSupplierChange}
                />
            </div>
        </div>
    );
}

function MaterialsTable({ materials }) {
    const { data, links } = materials;

    const prevLink = links?.prev;
    const nextLink = links?.next;

    return (
        <div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>In Stock</TableHead>
                            <TableHead>Low Stock</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-gray-400 py-10">
                                    No materials found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((material) => {
                                const isLowStock =
                                    material.low_stock_threshold !== null &&
                                    material.low_stock_threshold !== undefined &&
                                    parseFloat(material.quantity_on_hand) <= parseFloat(material.low_stock_threshold);

                                return (
                                    <TableRow key={material.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/materials/${material.id}`}
                                                className="text-amber-700 hover:text-amber-900 hover:underline"
                                            >
                                                {material.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {material.sku ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {material.category?.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {material.unit}
                                        </TableCell>
                                        <TableCell className="text-gray-700">
                                            {material.quantity_on_hand}
                                        </TableCell>
                                        <TableCell>
                                            {isLowStock ? (
                                                <Badge color="#ef4444">Low Stock</Badge>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-gray-700">
                                            {formatCurrency(material.unit_cost)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link
                                                href={`/materials/${material.id}/edit`}
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
                        Page {materials.current_page} of {materials.last_page} ({materials.total} total)
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

export default function MaterialsIndex({ materials, filters, categories, suppliers }) {
    const debounceTimer = useRef(null);

    const navigate = useCallback((params) => {
        router.get('/materials', params, { preserveState: true, replace: true });
    }, []);

    const currentFilters = {
        search: filters?.search ?? '',
        category: filters?.category ?? '',
        supplier: filters?.supplier ?? '',
    };

    const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));
    const supplierOptions = (suppliers ?? []).map((s) => ({ value: s.id, label: s.name }));

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

    const handleSupplierChange = useCallback(
        (e) => {
            navigate({ ...currentFilters, supplier: e.target.value || undefined });
        },
        [currentFilters, navigate],
    );

    return (
        <AppLayout>
            <Head title="Materials" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Page header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Materials</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {materials.total} material{materials.total !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <Link href="/materials/create">
                            <Button variant="default" size="md">
                                + New Material
                            </Button>
                        </Link>
                    </div>

                    {/* Filter bar */}
                    <div className="mb-5">
                        <FilterBar
                            filters={currentFilters}
                            categoryOptions={categoryOptions}
                            supplierOptions={supplierOptions}
                            onSearchChange={handleSearchChange}
                            onCategoryChange={handleCategoryChange}
                            onSupplierChange={handleSupplierChange}
                        />
                    </div>

                    {/* Table */}
                    <MaterialsTable materials={materials} />
                </div>
            </div>
        </AppLayout>
    );
}
