import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
import Alert from '@/Components/ui/Alert';

function formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function MaterialShow({ material }) {
    const { flash } = usePage().props;

    const adjustForm = useForm({ quantity: '', notes: '' });

    function handleAdjust(e) {
        e.preventDefault();
        adjustForm.post(route('materials.adjust-stock', material.id), {
            onSuccess: () => adjustForm.reset(),
        });
    }

    function handleDelete() {
        if (window.confirm('Are you sure?')) {
            router.delete(route('materials.destroy', material.id));
        }
    }

    const isLowStock =
        material.low_stock_threshold != null &&
        parseFloat(material.quantity_on_hand) <= parseFloat(material.low_stock_threshold);

    const projects = material.projects || [];

    const totalMaterialCost = projects.reduce((sum, project) => {
        const cost = project.pivot?.cost_at_time;
        const qty = project.pivot?.quantity_used;
        if (cost != null && qty != null) {
            return sum + parseFloat(cost) * parseFloat(qty);
        }
        return sum;
    }, 0);

    const hasTotalCost = projects.some(
        (p) => p.pivot?.cost_at_time != null && p.pivot?.quantity_used != null
    );

    return (
        <AppLayout>
            <Head title={material.name} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Flash Messages */}
                    {flash?.success && <Alert variant="success">{flash.success}</Alert>}
                    {flash?.error && <Alert variant="error">{flash.error}</Alert>}

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <h1 className="text-2xl font-semibold text-gray-900">{material.name}</h1>
                        <div className="flex shrink-0 items-center gap-2">
                            <Link href={route('materials.edit', material.id)}>
                                <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Section 1: Overview Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{material.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">SKU</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{material.sku || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {material.category ? material.category.name : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {material.supplier ? material.supplier.name : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Unit</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{material.unit}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{material.location || '—'}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{material.description || '—'}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{material.notes || '—'}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Section 2: Stock Level Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Level</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-3xl font-bold text-gray-900">
                                        {material.quantity_on_hand}
                                    </span>
                                    <span className="text-sm text-gray-500">{material.unit}</span>
                                    {isLowStock && (
                                        <Badge color="#ef4444">Low Stock</Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Unit Cost</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {formatCurrency(material.unit_cost)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Low Stock Threshold</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {material.low_stock_threshold != null
                                                ? `Low stock threshold: ${material.low_stock_threshold}`
                                                : 'No threshold set'}
                                        </dd>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Adjustment Sub-form */}
                            <div className="border-t border-gray-200 pt-6">
                                <p className="mb-3 text-sm font-medium text-gray-700">Adjust Stock</p>
                                <form onSubmit={handleAdjust} className="space-y-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="adjust-quantity">Quantity</Label>
                                            <Input
                                                id="adjust-quantity"
                                                type="number"
                                                step="0.01"
                                                placeholder="+10 or -5"
                                                value={adjustForm.data.quantity}
                                                error={!!adjustForm.errors.quantity}
                                                onChange={(e) => adjustForm.setData('quantity', e.target.value)}
                                                className="mt-1"
                                            />
                                            {adjustForm.errors.quantity && (
                                                <p className="mt-1 text-xs text-red-600">{adjustForm.errors.quantity}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="adjust-notes">Notes (optional)</Label>
                                            <Input
                                                id="adjust-notes"
                                                type="text"
                                                placeholder="Reason for adjustment"
                                                value={adjustForm.data.notes}
                                                error={!!adjustForm.errors.notes}
                                                onChange={(e) => adjustForm.setData('notes', e.target.value)}
                                                className="mt-1"
                                            />
                                            {adjustForm.errors.notes && (
                                                <p className="mt-1 text-xs text-red-600">{adjustForm.errors.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button type="submit" loading={adjustForm.processing} size="sm">
                                        Adjust Stock
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Project Usage Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {projects.length > 0 ? (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Project</TableHead>
                                                <TableHead>Qty Used</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>Cost at Time</TableHead>
                                                <TableHead>Total Cost</TableHead>
                                                <TableHead>Notes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {projects.map((project) => {
                                                const qty = project.pivot?.quantity_used;
                                                const cost = project.pivot?.cost_at_time;
                                                const total =
                                                    cost != null && qty != null
                                                        ? parseFloat(cost) * parseFloat(qty)
                                                        : null;
                                                return (
                                                    <TableRow key={project.id}>
                                                        <TableCell className="font-medium">
                                                            <Link
                                                                href={'/projects/' + project.slug}
                                                                className="text-amber-600 hover:text-amber-700 hover:underline"
                                                            >
                                                                {project.title}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>{qty ?? '—'}</TableCell>
                                                        <TableCell>{material.unit}</TableCell>
                                                        <TableCell>{formatCurrency(cost)}</TableCell>
                                                        <TableCell>{formatCurrency(total)}</TableCell>
                                                        <TableCell>{project.pivot?.notes || '—'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {hasTotalCost && (
                                                <TableRow className="bg-gray-50 font-medium">
                                                    <TableCell colSpan={4} className="text-right text-gray-700">
                                                        Total Material Cost
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-gray-900">
                                                        {formatCurrency(totalMaterialCost)}
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    This material hasn't been used in any projects yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </AppLayout>
    );
}
