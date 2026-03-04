import AppLayout from '@/Layouts/AppLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/Card';

export default function SupplierEdit({ supplier }) {
    const form = useForm({
        name: supplier.name,
        contact_name: supplier.contact_name ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        website: supplier.website ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        form.patch(route('suppliers.update', supplier.id));
    }

    return (
        <AppLayout>
            <Head title={`Edit Supplier: ${supplier.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Edit Supplier: {supplier.name}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Update the supplier details below.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <Card>
                            <CardHeader>
                                <CardTitle>Supplier Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Name */}
                                <div>
                                    <Label htmlFor="name">
                                        Name <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="mt-1">
                                        <Input
                                            id="name"
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            error={!!form.errors.name}
                                            placeholder="Supplier name"
                                            autoFocus
                                        />
                                        {form.errors.name && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Name */}
                                <div>
                                    <Label htmlFor="contact_name">Contact Name</Label>
                                    <div className="mt-1">
                                        <Input
                                            id="contact_name"
                                            type="text"
                                            value={form.data.contact_name}
                                            onChange={(e) => form.setData('contact_name', e.target.value)}
                                            error={!!form.errors.contact_name}
                                        />
                                        {form.errors.contact_name && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.contact_name}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <div className="mt-1">
                                        <Input
                                            id="email"
                                            type="email"
                                            value={form.data.email}
                                            onChange={(e) => form.setData('email', e.target.value)}
                                            error={!!form.errors.email}
                                        />
                                        {form.errors.email && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <Label htmlFor="phone">Phone</Label>
                                    <div className="mt-1">
                                        <Input
                                            id="phone"
                                            type="text"
                                            value={form.data.phone}
                                            onChange={(e) => form.setData('phone', e.target.value)}
                                            error={!!form.errors.phone}
                                        />
                                        {form.errors.phone && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Website */}
                                <div>
                                    <Label htmlFor="website">Website</Label>
                                    <div className="mt-1">
                                        <Input
                                            id="website"
                                            type="url"
                                            value={form.data.website}
                                            onChange={(e) => form.setData('website', e.target.value)}
                                            error={!!form.errors.website}
                                            placeholder="https://..."
                                        />
                                        {form.errors.website && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.website}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <Label htmlFor="address">Address</Label>
                                    <div className="mt-1">
                                        <Textarea
                                            id="address"
                                            value={form.data.address}
                                            onChange={(e) => form.setData('address', e.target.value)}
                                            error={!!form.errors.address}
                                            rows={3}
                                        />
                                        {form.errors.address && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.address}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <Label htmlFor="notes">Notes</Label>
                                    <div className="mt-1">
                                        <Textarea
                                            id="notes"
                                            value={form.data.notes}
                                            onChange={(e) => form.setData('notes', e.target.value)}
                                            error={!!form.errors.notes}
                                            rows={4}
                                        />
                                        {form.errors.notes && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.notes}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="gap-3">
                                <Button
                                    type="submit"
                                    loading={form.processing}
                                    disabled={form.processing}
                                >
                                    Save Supplier
                                </Button>
                                <Link
                                    href={route('suppliers.show', supplier.id)}
                                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition-colors duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                >
                                    Cancel
                                </Link>
                            </CardFooter>
                        </Card>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
