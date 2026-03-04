import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Textarea from '@/Components/ui/Textarea';
import Select from '@/Components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
import Alert from '@/Components/ui/Alert';

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
}

function formatCurrency(value) {
    if (value == null || value === '') return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getTypeLabel(value, types) {
    const found = types.find((t) => t.value === value);
    return found ? found.label : value;
}

export default function ToolShow({ tool, maintenanceTypes }) {
    const { flash } = usePage().props;
    const [showScheduleForm, setShowScheduleForm] = useState(false);

    const scheduleForm = useForm({
        maintenance_type: '',
        task: '',
        interval_days: '',
        interval_hours: '',
        notes: '',
    });

    const logForm = useForm({
        maintenance_type: '',
        description: '',
        performed_at: new Date().toISOString().split('T')[0],
        cost: '',
        schedule_id: '',
        usage_hours_at: '',
    });

    function handleDelete() {
        if (window.confirm('Are you sure you want to delete this tool?')) {
            router.delete(route('tools.destroy', tool.id));
        }
    }

    function handleScheduleSubmit(e) {
        e.preventDefault();
        scheduleForm.post(route('tools.schedules.store', tool.id), {
            onSuccess: () => {
                scheduleForm.reset();
                setShowScheduleForm(false);
            },
        });
    }

    function handleScheduleDelete(scheduleId) {
        if (window.confirm('Remove this maintenance schedule?')) {
            router.delete(route('tools.schedules.destroy', [tool.id, scheduleId]));
        }
    }

    function handleLogSubmit(e) {
        e.preventDefault();
        logForm.post(route('tools.log-maintenance', tool.id), {
            onSuccess: () => logForm.reset(),
        });
    }

    const scheduleOptions = (tool.maintenance_schedules || []).map((s) => ({
        value: s.id,
        label: s.task,
    }));

    return (
        <AppLayout>
            <Head title={tool.name} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Flash Messages */}
                    {flash?.success && <Alert variant="success">{flash.success}</Alert>}
                    {flash?.error && <Alert variant="error">{flash.error}</Alert>}

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">{tool.name}</h1>
                            {tool.brand && (
                                <p className="mt-1 text-sm text-gray-500">{tool.brand}</p>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Link href={route('tools.edit', tool.id)}>
                                <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Section 1: Tool Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tool Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Brand</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.brand || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Model Number</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.model_number || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.serial_number || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {tool.category ? tool.category.name : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.location || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(tool.purchase_date)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Purchase Price</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatCurrency(tool.purchase_price)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Warranty Expires</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(tool.warranty_expires)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Total Usage Hours</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.total_usage_hours} hrs</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Manual</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {tool.manual_url ? (
                                            <a
                                                href={tool.manual_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-amber-600 hover:text-amber-700 hover:underline"
                                            >
                                                View Manual
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{tool.notes || '—'}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Section 2: Maintenance Schedules Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Maintenance Schedules</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowScheduleForm((prev) => !prev)}
                                >
                                    {showScheduleForm ? 'Cancel' : 'Add Schedule'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Add Schedule Inline Form */}
                            {showScheduleForm && (
                                <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
                                    <p className="mb-4 text-sm font-medium text-gray-700">New Maintenance Schedule</p>
                                    <form onSubmit={handleScheduleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label htmlFor="schedule-type">Maintenance Type *</Label>
                                                <Select
                                                    id="schedule-type"
                                                    options={maintenanceTypes}
                                                    placeholder="Select type"
                                                    value={scheduleForm.data.maintenance_type}
                                                    error={!!scheduleForm.errors.maintenance_type}
                                                    onChange={(e) => scheduleForm.setData('maintenance_type', e.target.value)}
                                                    className="mt-1"
                                                />
                                                {scheduleForm.errors.maintenance_type && (
                                                    <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.maintenance_type}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="schedule-task">Task *</Label>
                                                <Input
                                                    id="schedule-task"
                                                    type="text"
                                                    placeholder="e.g. Change blade"
                                                    value={scheduleForm.data.task}
                                                    error={!!scheduleForm.errors.task}
                                                    onChange={(e) => scheduleForm.setData('task', e.target.value)}
                                                    className="mt-1"
                                                />
                                                {scheduleForm.errors.task && (
                                                    <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.task}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="schedule-interval-days">Interval (Days)</Label>
                                                <Input
                                                    id="schedule-interval-days"
                                                    type="number"
                                                    min="1"
                                                    placeholder="e.g. 90"
                                                    value={scheduleForm.data.interval_days}
                                                    error={!!scheduleForm.errors.interval_days}
                                                    onChange={(e) => scheduleForm.setData('interval_days', e.target.value)}
                                                    className="mt-1"
                                                />
                                                {scheduleForm.errors.interval_days && (
                                                    <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.interval_days}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="schedule-interval-hours">Interval (Hours)</Label>
                                                <Input
                                                    id="schedule-interval-hours"
                                                    type="number"
                                                    min="1"
                                                    placeholder="e.g. 50"
                                                    value={scheduleForm.data.interval_hours}
                                                    error={!!scheduleForm.errors.interval_hours}
                                                    onChange={(e) => scheduleForm.setData('interval_hours', e.target.value)}
                                                    className="mt-1"
                                                />
                                                {scheduleForm.errors.interval_hours && (
                                                    <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.interval_hours}</p>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">Provide at least one interval (days or hours)</p>
                                        <div>
                                            <Label htmlFor="schedule-notes">Notes</Label>
                                            <Textarea
                                                id="schedule-notes"
                                                rows={2}
                                                placeholder="Optional notes"
                                                value={scheduleForm.data.notes}
                                                error={!!scheduleForm.errors.notes}
                                                onChange={(e) => scheduleForm.setData('notes', e.target.value)}
                                                className="mt-1"
                                            />
                                            {scheduleForm.errors.notes && (
                                                <p className="mt-1 text-xs text-red-600">{scheduleForm.errors.notes}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="submit" size="sm" loading={scheduleForm.processing}>
                                                Save Schedule
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    scheduleForm.reset();
                                                    setShowScheduleForm(false);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Schedules Table */}
                            {tool.maintenance_schedules && tool.maintenance_schedules.length > 0 ? (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Task</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Interval</TableHead>
                                                <TableHead>Last Done</TableHead>
                                                <TableHead>Next Due</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tool.maintenance_schedules.map((schedule) => (
                                                <TableRow key={schedule.id}>
                                                    <TableCell className="font-medium">{schedule.task}</TableCell>
                                                    <TableCell>
                                                        {getTypeLabel(schedule.maintenance_type, maintenanceTypes)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {schedule.interval_days
                                                            ? `${schedule.interval_days} days`
                                                            : schedule.interval_hours
                                                            ? `${schedule.interval_hours} hrs`
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>{formatDate(schedule.last_performed_at)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span>{formatDate(schedule.next_due_at)}</span>
                                                            {schedule.is_overdue && (
                                                                <Badge color="#ef4444">Overdue</Badge>
                                                            )}
                                                            {!schedule.is_overdue && schedule.is_due_soon && (
                                                                <Badge color="#d97706">Due Soon</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleScheduleDelete(schedule.id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                !showScheduleForm && (
                                    <p className="text-sm text-gray-500">No maintenance schedules defined.</p>
                                )
                            )}
                        </CardContent>
                    </Card>

                    {/* Section 3: Log Maintenance Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Log Maintenance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="log-type">Maintenance Type *</Label>
                                        <Select
                                            id="log-type"
                                            options={maintenanceTypes}
                                            placeholder="Select type"
                                            value={logForm.data.maintenance_type}
                                            error={!!logForm.errors.maintenance_type}
                                            onChange={(e) => logForm.setData('maintenance_type', e.target.value)}
                                            className="mt-1"
                                        />
                                        {logForm.errors.maintenance_type && (
                                            <p className="mt-1 text-xs text-red-600">{logForm.errors.maintenance_type}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="log-schedule">Linked Schedule</Label>
                                        <select
                                            id="log-schedule"
                                            value={logForm.data.schedule_id}
                                            onChange={(e) => logForm.setData('schedule_id', e.target.value)}
                                            className={
                                                'mt-1 block w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
                                                (logForm.errors.schedule_id
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                                                    : 'border-gray-300 focus:border-amber-500 focus:ring-amber-200')
                                            }
                                        >
                                            <option value="">Not linked to schedule</option>
                                            {scheduleOptions.map(({ value, label }) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        {logForm.errors.schedule_id && (
                                            <p className="mt-1 text-xs text-red-600">{logForm.errors.schedule_id}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="log-performed-at">Date Performed *</Label>
                                        <Input
                                            id="log-performed-at"
                                            type="date"
                                            value={logForm.data.performed_at}
                                            error={!!logForm.errors.performed_at}
                                            onChange={(e) => logForm.setData('performed_at', e.target.value)}
                                            className="mt-1"
                                        />
                                        {logForm.errors.performed_at && (
                                            <p className="mt-1 text-xs text-red-600">{logForm.errors.performed_at}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="log-cost">Cost ($)</Label>
                                        <Input
                                            id="log-cost"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={logForm.data.cost}
                                            error={!!logForm.errors.cost}
                                            onChange={(e) => logForm.setData('cost', e.target.value)}
                                            className="mt-1"
                                        />
                                        {logForm.errors.cost && (
                                            <p className="mt-1 text-xs text-red-600">{logForm.errors.cost}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="log-usage-hours">Current Usage Hours</Label>
                                        <Input
                                            id="log-usage-hours"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            placeholder="e.g. 150.5"
                                            value={logForm.data.usage_hours_at}
                                            error={!!logForm.errors.usage_hours_at}
                                            onChange={(e) => logForm.setData('usage_hours_at', e.target.value)}
                                            className="mt-1"
                                        />
                                        {logForm.errors.usage_hours_at && (
                                            <p className="mt-1 text-xs text-red-600">{logForm.errors.usage_hours_at}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="log-description">Description *</Label>
                                    <Textarea
                                        id="log-description"
                                        rows={3}
                                        placeholder="Describe what was done"
                                        value={logForm.data.description}
                                        error={!!logForm.errors.description}
                                        onChange={(e) => logForm.setData('description', e.target.value)}
                                        className="mt-1"
                                    />
                                    {logForm.errors.description && (
                                        <p className="mt-1 text-xs text-red-600">{logForm.errors.description}</p>
                                    )}
                                </div>
                                <Button type="submit" loading={logForm.processing}>
                                    Log Maintenance
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Section 4: Maintenance History Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Maintenance History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tool.maintenance_logs && tool.maintenance_logs.length > 0 ? (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Cost</TableHead>
                                                <TableHead>Schedule</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tool.maintenance_logs.map((log) => {
                                                const linkedSchedule = log.schedule_id
                                                    ? tool.maintenance_schedules.find((s) => s.id === log.schedule_id)
                                                    : null;
                                                return (
                                                    <TableRow key={log.id}>
                                                        <TableCell>{formatDate(log.performed_at)}</TableCell>
                                                        <TableCell>
                                                            {getTypeLabel(log.maintenance_type, maintenanceTypes)}
                                                        </TableCell>
                                                        <TableCell>{log.description || '—'}</TableCell>
                                                        <TableCell>{formatCurrency(log.cost)}</TableCell>
                                                        <TableCell>
                                                            {linkedSchedule ? linkedSchedule.task : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No maintenance has been logged yet.</p>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </AppLayout>
    );
}
