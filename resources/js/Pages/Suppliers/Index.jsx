import { useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';

export default function SuppliersIndex({ suppliers, filters }) {
    const debounceTimer = useRef(null);

    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            router.get('/suppliers', value ? { search: value } : {}, { preserveState: true, replace: true });
        }, 300);
    }, []);

    const { data, links } = suppliers;
    const prevLink = links?.prev;
    const nextLink = links?.next;

    return (
        <AppLayout>
            <Head title="Suppliers" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Page header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Suppliers</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {suppliers.total} supplier{suppliers.total !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <Link href="/suppliers/create">
                            <Button variant="default" size="md">
                                + New Supplier
                            </Button>
                        </Link>
                    </div>

                    {/* Search */}
                    <div className="mb-5">
                        <Input
                            type="search"
                            placeholder="Search suppliers..."
                            defaultValue={filters?.search ?? ''}
                            onChange={handleSearchChange}
                            className="w-full max-w-sm"
                        />
                    </div>

                    {/* Table */}
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-400 py-10">
                                            No suppliers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/suppliers/${s.id}`}
                                                    className="text-amber-700 hover:text-amber-900 hover:underline"
                                                >
                                                    {s.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {s.contact_name || '—'}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {s.email || '—'}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {s.phone || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link
                                                    href={`/suppliers/${s.id}/edit`}
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

                    {/* Pagination */}
                    {(prevLink || nextLink) && (
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span>
                                Page {suppliers.current_page} of {suppliers.last_page} ({suppliers.total} total)
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
            </div>
        </AppLayout>
    );
}
