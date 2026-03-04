import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Alert from '@/Components/ui/Alert';

export default function SupplierShow({ supplier }) {
    const { flash } = usePage().props;

    function handleDelete() {
        if (!confirm(`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`)) {
            return;
        }
        router.delete(route('suppliers.destroy', supplier.id));
    }

    return (
        <AppLayout>
            <Head title={supplier.name} />
            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="mb-6">
                            <Alert variant="success">{flash.success}</Alert>
                        </div>
                    )}

                    {/* Page header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-2xl font-semibold text-gray-900">{supplier.name}</h1>
                        <div className="flex items-center gap-2">
                            <Link href={route('suppliers.edit', supplier.id)}>
                                <Button variant="secondary" size="md">
                                    Edit
                                </Button>
                            </Link>
                            <Button variant="danger" size="md" onClick={handleDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Detail card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                {/* Name */}
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{supplier.name}</dd>
                                </div>

                                {/* Contact Name */}
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {supplier.contact_name || '—'}
                                    </dd>
                                </div>

                                {/* Email */}
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {supplier.email ? (
                                            <a
                                                href={`mailto:${supplier.email}`}
                                                className="text-amber-700 hover:text-amber-900 hover:underline"
                                            >
                                                {supplier.email}
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </dd>
                                </div>

                                {/* Phone */}
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {supplier.phone || '—'}
                                    </dd>
                                </div>

                                {/* Website */}
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {supplier.website ? (
                                            <a
                                                href={supplier.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-amber-700 hover:text-amber-900 hover:underline"
                                            >
                                                {supplier.website}
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </dd>
                                </div>

                                {/* Address — full width */}
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                                    <dd className="mt-1 text-sm text-gray-900" style={{ whiteSpace: 'pre-wrap' }}>
                                        {supplier.address || '—'}
                                    </dd>
                                </div>

                                {/* Notes — full width */}
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                                    <dd className="mt-1 text-sm text-gray-900" style={{ whiteSpace: 'pre-wrap' }}>
                                        {supplier.notes || '—'}
                                    </dd>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Materials count */}
                    <div className="mt-4">
                        <p className="text-sm text-gray-600">
                            {supplier.materials_count ?? 0} material(s) sourced from this supplier
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
