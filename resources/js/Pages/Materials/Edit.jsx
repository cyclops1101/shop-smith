import AppLayout from '@/Layouts/AppLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/Card';

export default function MaterialEdit({ material, units, categories, suppliers }) {
    const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
    const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }));

    const form = useForm({
        name: material.name,
        sku: material.sku ?? '',
        description: material.description ?? '',
        category_id: material.category_id ?? '',
        unit: material.unit,
        quantity_on_hand: material.quantity_on_hand,
        low_stock_threshold: material.low_stock_threshold ?? '',
        unit_cost: material.unit_cost ?? '',
        supplier_id: material.supplier_id ?? '',
        location: material.location ?? '',
        notes: material.notes ?? '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        form.patch(route('materials.update', material.id));
    }

    return (
        <AppLayout>
            <Head title={`Edit: ${material.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Material</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Update the details for <span className="font-medium">{material.name}</span>.
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
                                                placeholder="e.g. 3/4 Baltic Birch Plywood"
                                                autoFocus
                                            />
                                            {form.errors.name && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* SKU */}
                                    <div>
                                        <Label htmlFor="sku">SKU</Label>
                                        <div className="mt-1">
                                            <Input
                                                id="sku"
                                                type="text"
                                                value={form.data.sku}
                                                onChange={(e) => form.setData('sku', e.target.value)}
                                                error={!!form.errors.sku}
                                                placeholder="e.g. SKU-0001-AB"
                                            />
                                            {form.errors.sku && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.sku}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <div className="mt-1">
                                            <Textarea
                                                id="description"
                                                value={form.data.description}
                                                onChange={(e) => form.setData('description', e.target.value)}
                                                error={!!form.errors.description}
                                                rows={3}
                                            />
                                            {form.errors.description && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Category and Unit */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                                        <div>
                                            <Label htmlFor="unit">
                                                Unit <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="mt-1">
                                                <Select
                                                    id="unit"
                                                    options={units}
                                                    value={form.data.unit}
                                                    onChange={(e) => form.setData('unit', e.target.value)}
                                                    error={!!form.errors.unit}
                                                />
                                                {form.errors.unit && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.unit}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 2: Stock */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Stock</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {/* Quantity on Hand */}
                                        <div>
                                            <Label htmlFor="quantity_on_hand">
                                                Quantity on Hand <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="quantity_on_hand"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.data.quantity_on_hand}
                                                    onChange={(e) => form.setData('quantity_on_hand', e.target.value)}
                                                    error={!!form.errors.quantity_on_hand}
                                                    placeholder="0.00"
                                                />
                                                {form.errors.quantity_on_hand && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.quantity_on_hand}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unit Cost */}
                                        <div>
                                            <Label htmlFor="unit_cost">Unit Cost ($)</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="unit_cost"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.data.unit_cost}
                                                    onChange={(e) => form.setData('unit_cost', e.target.value)}
                                                    error={!!form.errors.unit_cost}
                                                    placeholder="0.00"
                                                />
                                                {form.errors.unit_cost && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.unit_cost}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Low Stock Threshold */}
                                    <div>
                                        <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                                        <div className="mt-1">
                                            <Input
                                                id="low_stock_threshold"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.data.low_stock_threshold}
                                                onChange={(e) => form.setData('low_stock_threshold', e.target.value)}
                                                error={!!form.errors.low_stock_threshold}
                                                placeholder="0.00"
                                            />
                                            {form.errors.low_stock_threshold && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.low_stock_threshold}</p>
                                            )}
                                            <p className="mt-1 text-sm text-gray-500">
                                                Alert when stock falls at or below this amount
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 3: Supplier & Location */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Supplier &amp; Location</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Supplier */}
                                    <div>
                                        <Label htmlFor="supplier_id">Supplier</Label>
                                        <div className="mt-1">
                                            <Select
                                                id="supplier_id"
                                                options={supplierOptions}
                                                value={form.data.supplier_id}
                                                onChange={(e) => form.setData('supplier_id', e.target.value)}
                                                error={!!form.errors.supplier_id}
                                                placeholder="No supplier"
                                            />
                                            {form.errors.supplier_id && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.supplier_id}</p>
                                            )}
                                        </div>
                                    </div>

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
                                                placeholder="e.g. Shelf A3, Bin 12"
                                            />
                                            {form.errors.location && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.location}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 4: Notes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
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
                                        Save Material
                                    </Button>
                                    <Link
                                        href={route('materials.show', material.id)}
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
