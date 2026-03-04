import AppLayout from '@/Layouts/AppLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/Card';

export default function ToolCreate({ categories, maintenanceTypes }) {
    const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

    const form = useForm({
        name: '',
        brand: '',
        model_number: '',
        serial_number: '',
        category_id: '',
        purchase_date: '',
        purchase_price: '',
        warranty_expires: '',
        location: '',
        manual_url: '',
        notes: '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        form.post(route('tools.store'));
    }

    return (
        <AppLayout>
            <Head title="New Tool" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">New Tool</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Fill in the details below to add a new tool to your shop.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="space-y-6">
                            {/* Section 1: Basic Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Info</CardTitle>
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
                                                placeholder="e.g. DeWalt DW735 Planer"
                                                autoFocus
                                            />
                                            {form.errors.name && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Brand and Model Number */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="brand">Brand</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="brand"
                                                    type="text"
                                                    value={form.data.brand}
                                                    onChange={(e) => form.setData('brand', e.target.value)}
                                                    error={!!form.errors.brand}
                                                    placeholder="e.g. DeWalt"
                                                />
                                                {form.errors.brand && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.brand}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="model_number">Model Number</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="model_number"
                                                    type="text"
                                                    value={form.data.model_number}
                                                    onChange={(e) => form.setData('model_number', e.target.value)}
                                                    error={!!form.errors.model_number}
                                                    placeholder="e.g. DW735X"
                                                />
                                                {form.errors.model_number && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.model_number}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Serial Number and Category */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="serial_number">Serial Number</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="serial_number"
                                                    type="text"
                                                    value={form.data.serial_number}
                                                    onChange={(e) => form.setData('serial_number', e.target.value)}
                                                    error={!!form.errors.serial_number}
                                                    placeholder="e.g. SN-12345"
                                                />
                                                {form.errors.serial_number && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.serial_number}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="category_id">Category</Label>
                                            <div className="mt-1">
                                                <Select
                                                    id="category_id"
                                                    options={categoryOptions}
                                                    value={form.data.category_id}
                                                    onChange={(e) => form.setData('category_id', e.target.value)}
                                                    error={!!form.errors.category_id}
                                                    placeholder="No category"
                                                />
                                                {form.errors.category_id && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.category_id}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 2: Purchase & Warranty */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Purchase &amp; Warranty</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Purchase Date and Purchase Price */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="purchase_date">Purchase Date</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="purchase_date"
                                                    type="date"
                                                    value={form.data.purchase_date}
                                                    onChange={(e) => form.setData('purchase_date', e.target.value)}
                                                    error={!!form.errors.purchase_date}
                                                />
                                                {form.errors.purchase_date && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.purchase_date}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="purchase_price"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.data.purchase_price}
                                                    onChange={(e) => form.setData('purchase_price', e.target.value)}
                                                    error={!!form.errors.purchase_price}
                                                    placeholder="0.00"
                                                />
                                                {form.errors.purchase_price && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.purchase_price}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Warranty Expires */}
                                    <div>
                                        <Label htmlFor="warranty_expires">Warranty Expires</Label>
                                        <div className="mt-1">
                                            <Input
                                                id="warranty_expires"
                                                type="date"
                                                value={form.data.warranty_expires}
                                                onChange={(e) => form.setData('warranty_expires', e.target.value)}
                                                error={!!form.errors.warranty_expires}
                                            />
                                            {form.errors.warranty_expires && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.warranty_expires}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 3: Location & Notes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Location &amp; Notes</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Location */}
                                    <div>
                                        <Label htmlFor="location">Location</Label>
                                        <div className="mt-1">
                                            <Input
                                                id="location"
                                                type="text"
                                                value={form.data.location}
                                                onChange={(e) => form.setData('location', e.target.value)}
                                                error={!!form.errors.location}
                                                placeholder="e.g. Main shop, left wall"
                                            />
                                            {form.errors.location && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.location}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Manual URL */}
                                    <div>
                                        <Label htmlFor="manual_url">Manual URL</Label>
                                        <div className="mt-1">
                                            <Input
                                                id="manual_url"
                                                type="url"
                                                value={form.data.manual_url}
                                                onChange={(e) => form.setData('manual_url', e.target.value)}
                                                error={!!form.errors.manual_url}
                                                placeholder="https://..."
                                            />
                                            {form.errors.manual_url && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.manual_url}</p>
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
                                        Save Tool
                                    </Button>
                                    <Link
                                        href={route('tools.index')}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition-colors duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                    >
                                        Cancel
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
