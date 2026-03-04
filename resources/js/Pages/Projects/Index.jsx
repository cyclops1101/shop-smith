import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

export default function ProjectsIndex({ projects, filters }) {
    return (
        <AppLayout>
            <Head title="Projects" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
                    <p className="mt-2 text-gray-600">This page is under construction.</p>
                </div>
            </div>
        </AppLayout>
    );
}
