import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

export default function CutListIndex({ boards, pieces, result }) {
    return (
        <AppLayout>
            <Head title="Cut List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Cut List</h1>
                    <p className="mt-2 text-gray-600">This page is under construction.</p>
                </div>
            </div>
        </AppLayout>
    );
}
