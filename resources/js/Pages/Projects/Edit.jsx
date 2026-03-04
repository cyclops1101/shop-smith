import AppLayout from '@/Layouts/AppLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/Card';

export default function ProjectEdit({ project, statuses, priorities }) {
    const form = useForm({
        title: project.title ?? '',
        description: project.description ?? '',
        status: project.status ?? 'planned',
        priority: project.priority ?? 'medium',
        estimated_hours: project.estimated_hours ?? '',
        estimated_cost: project.estimated_cost ?? '',
        sell_price: project.sell_price ?? '',
        deadline: project.deadline ? project.deadline.substring(0, 10) : '',
        is_commission: project.is_commission ?? false,
        client_name: project.client_name ?? '',
        client_contact: project.client_contact ?? '',
        notes: project.notes ?? '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        form.patch(route('projects.update', project.slug));
    }

    return (
        <AppLayout>
            <Head title={`Edit: ${project.title}`} />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Project</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Update the details for <span className="font-medium">{project.title}</span>.
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
                                    {/* Title */}
                                    <div>
                                        <Label htmlFor="title">
                                            Title <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="mt-1">
                                            <Input
                                                id="title"
                                                type="text"
                                                value={form.data.title}
                                                onChange={(e) => form.setData('title', e.target.value)}
                                                error={!!form.errors.title}
                                                placeholder="e.g. Dining Room Table"
                                                autoFocus
                                            />
                                            {form.errors.title && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.title}</p>
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
                                                placeholder="Brief description of the project..."
                                            />
                                            {form.errors.description && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status and Priority */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="status">Status</Label>
                                            <div className="mt-1">
                                                <Select
                                                    id="status"
                                                    options={statuses}
                                                    value={form.data.status}
                                                    onChange={(e) => form.setData('status', e.target.value)}
                                                    error={!!form.errors.status}
                                                />
                                                {form.errors.status && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.status}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="priority">Priority</Label>
                                            <div className="mt-1">
                                                <Select
                                                    id="priority"
                                                    options={priorities}
                                                    value={form.data.priority}
                                                    onChange={(e) => form.setData('priority', e.target.value)}
                                                    error={!!form.errors.priority}
                                                />
                                                {form.errors.priority && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.priority}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 2: Pricing & Time */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pricing &amp; Time</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {/* Estimated Hours */}
                                        <div>
                                            <Label htmlFor="estimated_hours">Estimated Hours</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="estimated_hours"
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={form.data.estimated_hours}
                                                    onChange={(e) => form.setData('estimated_hours', e.target.value)}
                                                    error={!!form.errors.estimated_hours}
                                                    placeholder="0.0"
                                                />
                                                {form.errors.estimated_hours && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.estimated_hours}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Deadline */}
                                        <div>
                                            <Label htmlFor="deadline">Deadline</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="deadline"
                                                    type="date"
                                                    value={form.data.deadline}
                                                    onChange={(e) => form.setData('deadline', e.target.value)}
                                                    error={!!form.errors.deadline}
                                                />
                                                {form.errors.deadline && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.deadline}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Estimated Cost */}
                                        <div>
                                            <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="estimated_cost"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={form.data.estimated_cost}
                                                    onChange={(e) => form.setData('estimated_cost', e.target.value)}
                                                    error={!!form.errors.estimated_cost}
                                                    placeholder="0.00"
                                                />
                                                {form.errors.estimated_cost && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.estimated_cost}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sell Price */}
                                        <div>
                                            <Label htmlFor="sell_price">Sell Price ($)</Label>
                                            <div className="mt-1">
                                                <Input
                                                    id="sell_price"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={form.data.sell_price}
                                                    onChange={(e) => form.setData('sell_price', e.target.value)}
                                                    error={!!form.errors.sell_price}
                                                    placeholder="0.00"
                                                />
                                                {form.errors.sell_price && (
                                                    <p className="mt-1 text-sm text-red-600">{form.errors.sell_price}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 3: Commission */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Commission</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="is_commission"
                                            type="checkbox"
                                            checked={form.data.is_commission}
                                            onChange={(e) => form.setData('is_commission', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <Label htmlFor="is_commission" className="mb-0 cursor-pointer">
                                            This is a commissioned project
                                        </Label>
                                    </div>

                                    {form.data.is_commission && (
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                                            <div>
                                                <Label htmlFor="client_name">Client Name</Label>
                                                <div className="mt-1">
                                                    <Input
                                                        id="client_name"
                                                        type="text"
                                                        value={form.data.client_name}
                                                        onChange={(e) => form.setData('client_name', e.target.value)}
                                                        error={!!form.errors.client_name}
                                                        placeholder="Jane Smith"
                                                    />
                                                    {form.errors.client_name && (
                                                        <p className="mt-1 text-sm text-red-600">{form.errors.client_name}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <Label htmlFor="client_contact">Client Contact</Label>
                                                <div className="mt-1">
                                                    <Input
                                                        id="client_contact"
                                                        type="text"
                                                        value={form.data.client_contact}
                                                        onChange={(e) => form.setData('client_contact', e.target.value)}
                                                        error={!!form.errors.client_contact}
                                                        placeholder="jane@example.com or (555) 123-4567"
                                                    />
                                                    {form.errors.client_contact && (
                                                        <p className="mt-1 text-sm text-red-600">{form.errors.client_contact}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Section 4: Notes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Label htmlFor="notes">Additional Notes</Label>
                                        <div className="mt-1">
                                            <Textarea
                                                id="notes"
                                                value={form.data.notes}
                                                onChange={(e) => form.setData('notes', e.target.value)}
                                                error={!!form.errors.notes}
                                                rows={4}
                                                placeholder="Any additional notes, references, or details..."
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
                                        Save Project
                                    </Button>
                                    <Link
                                        href={route('projects.show', project.slug)}
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
