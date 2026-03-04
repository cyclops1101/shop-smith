import { Head } from '@inertiajs/react';

export default function PortfolioIndex({ photos }) {
    return (
        <>
            <Head title="Portfolio" />
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Portfolio</h1>
                    <p className="mt-2 text-gray-600">This page is under construction.</p>
                </div>
            </div>
        </>
    );
}
