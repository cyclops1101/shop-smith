import { Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Badge from '@/Components/ui/Badge';

const formatCurrency = (v) =>
    Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const statusColors = {
    in_progress: 'default',
    finishing: 'secondary',
    designing: 'outline',
};

const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
};

const activityIcons = {
    photo: '📷',
    time: '⏱️',
    expense: '💰',
};

export default function Dashboard({
    activeProjects = [],
    lowStockMaterials = [],
    overdueSchedules = [],
    dueSoonSchedules = [],
    recentActivity = [],
    financeSummary = {},
}) {
    return (
        <AppLayout title="Dashboard">
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Page Heading */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Workshop Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Welcome back. Here's an overview of your workshop.
                        </p>
                    </div>

                    {/* Finance Summary Cards */}
                    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-xs text-gray-500">Month Expenses</p>
                                <p className="text-lg font-bold text-red-600">
                                    {formatCurrency(financeSummary.monthExpenses ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-xs text-gray-500">Month Revenue</p>
                                <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(financeSummary.monthRevenues ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-xs text-gray-500">Month Net</p>
                                <p
                                    className={
                                        'text-lg font-bold ' +
                                        ((financeSummary.monthNet ?? 0) >= 0
                                            ? 'text-green-600'
                                            : 'text-red-600')
                                    }
                                >
                                    {formatCurrency(financeSummary.monthNet ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-xs text-gray-500">YTD Expenses</p>
                                <p className="text-lg font-bold text-red-600">
                                    {formatCurrency(financeSummary.ytdExpenses ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-xs text-gray-500">YTD Revenue</p>
                                <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(financeSummary.ytdRevenues ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-xs text-gray-500">YTD Net</p>
                                <p
                                    className={
                                        'text-lg font-bold ' +
                                        ((financeSummary.ytdNet ?? 0) >= 0
                                            ? 'text-green-600'
                                            : 'text-red-600')
                                    }
                                >
                                    {formatCurrency(financeSummary.ytdNet ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Grid: Active Projects + Alerts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Active Projects — spans 2 cols */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Active Projects
                                        <Link
                                            href="/projects"
                                            className="text-sm font-normal text-amber-600 hover:text-amber-800"
                                        >
                                            View all
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {activeProjects.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            No active projects.{' '}
                                            <Link
                                                href="/projects/create"
                                                className="text-amber-600 hover:underline"
                                            >
                                                Start one
                                            </Link>
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {activeProjects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <Link
                                                            href={route(
                                                                'projects.show',
                                                                project.slug,
                                                            )}
                                                            className="font-medium text-gray-900 hover:text-amber-600"
                                                        >
                                                            {project.title}
                                                        </Link>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <Badge
                                                                variant={
                                                                    statusColors[
                                                                        project.status
                                                                    ] ?? 'outline'
                                                                }
                                                            >
                                                                {project.status.replace('_', ' ')}
                                                            </Badge>
                                                            {project.is_commission && (
                                                                <span className="text-xs text-gray-500">
                                                                    {project.client_name
                                                                        ? `Client: ${project.client_name}`
                                                                        : 'Commission'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 text-right text-sm text-gray-500">
                                                        <div>
                                                            {project.total_hours}h logged
                                                            {project.estimated_hours
                                                                ? ` / ${project.estimated_hours}h est.`
                                                                : ''}
                                                        </div>
                                                        {project.deadline && (
                                                            <div className="text-xs">
                                                                Due {formatDate(project.deadline)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Alerts */}
                        <div className="space-y-6">
                            {/* Low Stock Alerts */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Low Stock Alerts
                                        <Link
                                            href="/materials"
                                            className="text-sm font-normal text-amber-600 hover:text-amber-800"
                                        >
                                            Inventory
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {lowStockMaterials.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            All materials are well-stocked.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {lowStockMaterials.map((mat) => (
                                                <div
                                                    key={mat.id}
                                                    className="flex items-center justify-between rounded border border-red-100 bg-red-50 px-3 py-2 text-sm"
                                                >
                                                    <div>
                                                        <Link
                                                            href={route('materials.show', mat.id)}
                                                            className="font-medium text-red-800 hover:underline"
                                                        >
                                                            {mat.name}
                                                        </Link>
                                                        {mat.supplier?.website && (
                                                            <a
                                                                href={mat.supplier.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ml-2 text-xs text-amber-600 hover:underline"
                                                            >
                                                                Reorder
                                                            </a>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-red-700">
                                                        {mat.quantity_on_hand} / {mat.low_stock_threshold}{' '}
                                                        {mat.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Upcoming Maintenance */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Tool Maintenance
                                        <Link
                                            href="/tools"
                                            className="text-sm font-normal text-amber-600 hover:text-amber-800"
                                        >
                                            Tools
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {overdueSchedules.length === 0 &&
                                    dueSoonSchedules.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            No maintenance due.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {overdueSchedules.map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="flex items-center justify-between rounded border border-red-100 bg-red-50 px-3 py-2 text-sm"
                                                >
                                                    <div>
                                                        <span className="font-medium text-red-800">
                                                            {s.task}
                                                        </span>
                                                        <span className="ml-1 text-xs text-red-600">
                                                            ({s.tool?.name})
                                                        </span>
                                                    </div>
                                                    <Badge variant="destructive">Overdue</Badge>
                                                </div>
                                            ))}
                                            {dueSoonSchedules.map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="flex items-center justify-between rounded border border-amber-100 bg-amber-50 px-3 py-2 text-sm"
                                                >
                                                    <div>
                                                        <span className="font-medium text-amber-800">
                                                            {s.task}
                                                        </span>
                                                        <span className="ml-1 text-xs text-amber-600">
                                                            ({s.tool?.name})
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-amber-700">
                                                        Due {formatDate(s.next_due_at)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentActivity.length === 0 ? (
                                    <p className="text-sm text-gray-500">No recent activity.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {recentActivity.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2"
                                            >
                                                <span className="mt-0.5 text-base">
                                                    {activityIcons[item.type] ?? '•'}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-gray-700">
                                                        {item.message}
                                                    </p>
                                                    {item.project && item.slug && (
                                                        <Link
                                                            href={route(
                                                                'projects.show',
                                                                item.slug,
                                                            )}
                                                            className="text-xs text-amber-600 hover:underline"
                                                        >
                                                            {item.project}
                                                        </Link>
                                                    )}
                                                </div>
                                                <span className="whitespace-nowrap text-xs text-gray-400">
                                                    {formatDate(item.created_at)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
