import AppLayout from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';

export default function Dashboard() {
    const placeholderCards = [
        { title: 'Active Projects', description: 'No projects yet' },
        { title: 'Materials Inventory', description: 'No materials tracked' },
        { title: 'Tools', description: 'No tools registered' },
        { title: 'Recent Expenses', description: 'No financial data' },
        { title: 'Time Tracked', description: '0 hours this week' },
        { title: 'Cut Lists', description: 'No cut lists created' },
    ];

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

                    {/* Widget Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {placeholderCards.map(({ title, description }) => (
                            <Card key={title}>
                                <CardHeader>
                                    <CardTitle>{title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500">{description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
