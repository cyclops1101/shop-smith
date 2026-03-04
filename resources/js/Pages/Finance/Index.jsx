import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';

function formatCurrency(value) {
    if (value == null || value === '') return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
}

export default function FinanceIndex({
    expenses,
    revenues,
    summary,
    monthlyChart,
    expensesByCategory,
    projectProfit,
    categories,
    projects,
    suppliers,
}) {
    const { flash } = usePage().props;

    const expenseList = expenses ?? [];
    const revenueList = revenues ?? [];
    const monthlyData = monthlyChart ?? [];
    const categoryData = expensesByCategory ?? [];
    const profitData = projectProfit ?? [];
    const categoryOptions = categories ?? [];
    const projectOptions = (projects ?? []).map((p) => ({ value: p.id, label: p.title }));
    const supplierOptions = (suppliers ?? []).map((s) => ({ value: s.id, label: s.name }));

    const expenseForm = useForm({
        category: '',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        project_id: '',
        supplier_id: '',
        receipt: null,
    });

    const revenueForm = useForm({
        description: '',
        amount: '',
        received_date: new Date().toISOString().split('T')[0],
        project_id: '',
        client_name: '',
        payment_method: '',
    });

    function handleExpenseSubmit(e) {
        e.preventDefault();
        expenseForm.post(route('finance.store-expense'), {
            forceFormData: true,
            onSuccess: () => expenseForm.reset(),
        });
    }

    function handleRevenueSubmit(e) {
        e.preventDefault();
        revenueForm.post(route('finance.store-revenue'), {
            onSuccess: () => revenueForm.reset(),
        });
    }

    function handleDeleteExpense(id) {
        if (window.confirm('Delete this expense?')) {
            router.delete(route('finance.destroy-expense', id));
        }
    }

    function handleDeleteRevenue(id) {
        if (window.confirm('Delete this revenue entry?')) {
            router.delete(route('finance.destroy-revenue', id));
        }
    }

    const netIncomeColor =
        summary?.netIncome != null && summary.netIncome >= 0
            ? 'text-green-600'
            : 'text-red-600';

    return (
        <AppLayout>
            <Head title="Finance" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Flash Messages */}
                    {flash?.success && <Alert variant="success">{flash.success}</Alert>}
                    {flash?.error && <Alert variant="error">{flash.error}</Alert>}

                    {/* Page Header */}
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
                        <p className="mt-1 text-sm text-gray-500">Track expenses, revenues, and project profitability.</p>
                    </div>

                    {/* Section 2: Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                                <p className="mt-2 text-2xl font-bold text-red-600">
                                    {formatCurrency(summary?.totalExpenses)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                <p className="mt-2 text-2xl font-bold text-green-600">
                                    {formatCurrency(summary?.totalRevenues)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm font-medium text-gray-500">Net Income</p>
                                <p className={`mt-2 text-2xl font-bold ${netIncomeColor}`}>
                                    {formatCurrency(summary?.netIncome)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 3: Charts */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(v) => formatCurrency(v)} />
                                        <Legend />
                                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                                        <Bar dataKey="revenues" fill="#16a34a" name="Revenue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Expenses by Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart layout="vertical" data={categoryData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(v) => formatCurrency(v)} />
                                        <Bar dataKey="amount" fill="#d97706" name="Expenses" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 4: Entry Forms */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Expense Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Log Expense</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="expense-category">Category *</Label>
                                        <Select
                                            id="expense-category"
                                            options={categoryOptions}
                                            placeholder="Select category"
                                            value={expenseForm.data.category}
                                            error={!!expenseForm.errors.category}
                                            onChange={(e) => expenseForm.setData('category', e.target.value)}
                                            className="mt-1"
                                        />
                                        {expenseForm.errors.category && (
                                            <p className="mt-1 text-xs text-red-600">{expenseForm.errors.category}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="expense-description">Description *</Label>
                                        <Input
                                            id="expense-description"
                                            type="text"
                                            placeholder="What was purchased?"
                                            value={expenseForm.data.description}
                                            error={!!expenseForm.errors.description}
                                            onChange={(e) => expenseForm.setData('description', e.target.value)}
                                            className="mt-1"
                                        />
                                        {expenseForm.errors.description && (
                                            <p className="mt-1 text-xs text-red-600">{expenseForm.errors.description}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="expense-amount">Amount ($) *</Label>
                                            <Input
                                                id="expense-amount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={expenseForm.data.amount}
                                                error={!!expenseForm.errors.amount}
                                                onChange={(e) => expenseForm.setData('amount', e.target.value)}
                                                className="mt-1"
                                            />
                                            {expenseForm.errors.amount && (
                                                <p className="mt-1 text-xs text-red-600">{expenseForm.errors.amount}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="expense-date">Date *</Label>
                                            <Input
                                                id="expense-date"
                                                type="date"
                                                value={expenseForm.data.expense_date}
                                                error={!!expenseForm.errors.expense_date}
                                                onChange={(e) => expenseForm.setData('expense_date', e.target.value)}
                                                className="mt-1"
                                            />
                                            {expenseForm.errors.expense_date && (
                                                <p className="mt-1 text-xs text-red-600">{expenseForm.errors.expense_date}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="expense-project">Project</Label>
                                        <Select
                                            id="expense-project"
                                            options={projectOptions}
                                            placeholder="No project"
                                            value={expenseForm.data.project_id}
                                            error={!!expenseForm.errors.project_id}
                                            onChange={(e) => expenseForm.setData('project_id', e.target.value)}
                                            className="mt-1"
                                        />
                                        {expenseForm.errors.project_id && (
                                            <p className="mt-1 text-xs text-red-600">{expenseForm.errors.project_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="expense-supplier">Supplier</Label>
                                        <Select
                                            id="expense-supplier"
                                            options={supplierOptions}
                                            placeholder="No supplier"
                                            value={expenseForm.data.supplier_id}
                                            error={!!expenseForm.errors.supplier_id}
                                            onChange={(e) => expenseForm.setData('supplier_id', e.target.value)}
                                            className="mt-1"
                                        />
                                        {expenseForm.errors.supplier_id && (
                                            <p className="mt-1 text-xs text-red-600">{expenseForm.errors.supplier_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="expense-receipt">Receipt</Label>
                                        <input
                                            id="expense-receipt"
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => expenseForm.setData('receipt', e.target.files[0] ?? null)}
                                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-100"
                                        />
                                        {expenseForm.errors.receipt && (
                                            <p className="mt-1 text-xs text-red-600">{expenseForm.errors.receipt}</p>
                                        )}
                                    </div>

                                    <Button type="submit" loading={expenseForm.processing}>
                                        Add Expense
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Revenue Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Log Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleRevenueSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="revenue-description">Description *</Label>
                                        <Input
                                            id="revenue-description"
                                            type="text"
                                            placeholder="What was sold or received?"
                                            value={revenueForm.data.description}
                                            error={!!revenueForm.errors.description}
                                            onChange={(e) => revenueForm.setData('description', e.target.value)}
                                            className="mt-1"
                                        />
                                        {revenueForm.errors.description && (
                                            <p className="mt-1 text-xs text-red-600">{revenueForm.errors.description}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="revenue-amount">Amount ($) *</Label>
                                            <Input
                                                id="revenue-amount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={revenueForm.data.amount}
                                                error={!!revenueForm.errors.amount}
                                                onChange={(e) => revenueForm.setData('amount', e.target.value)}
                                                className="mt-1"
                                            />
                                            {revenueForm.errors.amount && (
                                                <p className="mt-1 text-xs text-red-600">{revenueForm.errors.amount}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="revenue-date">Date Received *</Label>
                                            <Input
                                                id="revenue-date"
                                                type="date"
                                                value={revenueForm.data.received_date}
                                                error={!!revenueForm.errors.received_date}
                                                onChange={(e) => revenueForm.setData('received_date', e.target.value)}
                                                className="mt-1"
                                            />
                                            {revenueForm.errors.received_date && (
                                                <p className="mt-1 text-xs text-red-600">{revenueForm.errors.received_date}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="revenue-client">Client Name</Label>
                                        <Input
                                            id="revenue-client"
                                            type="text"
                                            placeholder="Client or customer name"
                                            value={revenueForm.data.client_name}
                                            error={!!revenueForm.errors.client_name}
                                            onChange={(e) => revenueForm.setData('client_name', e.target.value)}
                                            className="mt-1"
                                        />
                                        {revenueForm.errors.client_name && (
                                            <p className="mt-1 text-xs text-red-600">{revenueForm.errors.client_name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="revenue-payment-method">Payment Method</Label>
                                        <Input
                                            id="revenue-payment-method"
                                            type="text"
                                            placeholder="e.g. Cash, Check, Venmo"
                                            value={revenueForm.data.payment_method}
                                            error={!!revenueForm.errors.payment_method}
                                            onChange={(e) => revenueForm.setData('payment_method', e.target.value)}
                                            className="mt-1"
                                        />
                                        {revenueForm.errors.payment_method && (
                                            <p className="mt-1 text-xs text-red-600">{revenueForm.errors.payment_method}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="revenue-project">Project</Label>
                                        <Select
                                            id="revenue-project"
                                            options={projectOptions}
                                            placeholder="No project"
                                            value={revenueForm.data.project_id}
                                            error={!!revenueForm.errors.project_id}
                                            onChange={(e) => revenueForm.setData('project_id', e.target.value)}
                                            className="mt-1"
                                        />
                                        {revenueForm.errors.project_id && (
                                            <p className="mt-1 text-xs text-red-600">{revenueForm.errors.project_id}</p>
                                        )}
                                    </div>

                                    <Button type="submit" loading={revenueForm.processing}>
                                        Add Revenue
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 5: Expense List Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Expenses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expenseList.length > 0 ? (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Supplier</TableHead>
                                                <TableHead>Project</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Receipt</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expenseList.map((expense) => {
                                                const categoryLabel =
                                                    categoryOptions.find((c) => c.value === expense.category)?.label ??
                                                    expense.category;
                                                return (
                                                    <TableRow key={expense.id}>
                                                        <TableCell className="whitespace-nowrap text-sm text-gray-600">
                                                            {formatDate(expense.expense_date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {categoryLabel ? (
                                                                <Badge variant="secondary">{categoryLabel}</Badge>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-900">
                                                            {expense.description || '—'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-600">
                                                            {expense.supplier?.name ?? '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {expense.project ? (
                                                                <Link
                                                                    href={route('projects.show', expense.project.slug)}
                                                                    className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
                                                                >
                                                                    {expense.project.title}
                                                                </Link>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm font-medium text-red-600">
                                                            {formatCurrency(expense.amount)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {expense.receipt_path ? (
                                                                <a
                                                                    href={`/storage/${expense.receipt_path}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
                                                                >
                                                                    View
                                                                </a>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDeleteExpense(expense.id)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No expenses recorded yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Section 6: Revenue List Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {revenueList.length > 0 ? (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Payment Method</TableHead>
                                                <TableHead>Project</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {revenueList.map((revenue) => (
                                                <TableRow key={revenue.id}>
                                                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                                                        {formatDate(revenue.received_date)}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-900">
                                                        {revenue.description || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {revenue.client_name || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {revenue.payment_method || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {revenue.project ? (
                                                            <Link
                                                                href={route('projects.show', revenue.project.slug)}
                                                                className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
                                                            >
                                                                {revenue.project.title}
                                                            </Link>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-green-600">
                                                        {formatCurrency(revenue.amount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteRevenue(revenue.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No revenue recorded yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Section 7: Profit Per Project (conditional) */}
                    {profitData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Profit Per Project</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Project</TableHead>
                                                <TableHead className="text-right">Total Revenue</TableHead>
                                                <TableHead className="text-right">Total Expenses</TableHead>
                                                <TableHead className="text-right">Net Profit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {profitData.map((row) => {
                                                const profitColor =
                                                    row.profit >= 0 ? 'text-green-600' : 'text-red-600';
                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell>
                                                            <Link
                                                                href={route('projects.show', row.slug)}
                                                                className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
                                                            >
                                                                {row.title}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm text-green-600">
                                                            {formatCurrency(row.revenues)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm text-red-600">
                                                            {formatCurrency(row.expenses)}
                                                        </TableCell>
                                                        <TableCell
                                                            className={`text-right text-sm font-bold ${profitColor}`}
                                                        >
                                                            {formatCurrency(row.profit)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </AppLayout>
    );
}
