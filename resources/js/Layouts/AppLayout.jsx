import { Link, Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const navLinks = [
    { href: '/dashboard', label: 'Dashboard', exact: true },
    { href: '/projects', label: 'Projects' },
    { href: '/materials', label: 'Materials' },
    { href: '/tools', label: 'Tools' },
    { href: '/finance', label: 'Finance' },
    { href: '/cut-list', label: 'Cut List' },
];

function isActive(href, currentUrl, exact) {
    if (exact) {
        return currentUrl === href;
    }
    return currentUrl.startsWith(href);
}

export default function AppLayout({ children, title }) {
    const { url } = usePage();
    const { auth } = usePage().props;
    const user = auth?.user;

    const [showingMobileMenu, setShowingMobileMenu] = useState(false);
    const [showingUserDropdown, setShowingUserDropdown] = useState(false);

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {title && <Head title={title} />}

            {/* Top Navigation Bar */}
            <nav className="border-b border-gray-200 bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">

                        {/* Left: App Name + Nav Links */}
                        <div className="flex items-center">
                            {/* App Name */}
                            <div className="flex shrink-0 items-center">
                                <Link
                                    href="/dashboard"
                                    className="text-lg font-bold text-gray-900 hover:text-gray-700"
                                >
                                    Workshop Manager
                                </Link>
                            </div>

                            {/* Desktop Nav Links */}
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                                {navLinks.map(({ href, label, exact }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={
                                            'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ' +
                                            (isActive(href, url, exact)
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                                        }
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Right: Timer Widget + User Dropdown */}
                        <div className="hidden sm:flex sm:items-center sm:space-x-4">
                            {/* Timer Widget Placeholder */}
                            <div className="flex items-center space-x-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5">
                                <svg
                                    className="h-4 w-4 text-gray-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span className="font-mono text-sm font-medium text-gray-700">
                                    00:00:00
                                </span>
                            </div>

                            {/* User Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowingUserDropdown(!showingUserDropdown)}
                                    className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-600 transition duration-150 ease-in-out hover:text-gray-900 focus:outline-none"
                                >
                                    {user?.name ?? 'Account'}
                                    <svg
                                        className="-me-0.5 ms-2 h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>

                                {showingUserDropdown && (
                                    <>
                                        {/* Backdrop to close dropdown */}
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowingUserDropdown(false)}
                                        />
                                        <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                                            <Link
                                                href="/profile"
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => setShowingUserDropdown(false)}
                                            >
                                                Profile
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Log Out
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Mobile: Timer + Hamburger */}
                        <div className="flex items-center space-x-3 sm:hidden">
                            {/* Timer Widget (mobile) */}
                            <span className="font-mono text-sm font-medium text-gray-700">
                                00:00:00
                            </span>

                            {/* Hamburger Button */}
                            <button
                                type="button"
                                onClick={() => setShowingMobileMenu(!showingMobileMenu)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={!showingMobileMenu ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingMobileMenu ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className={(showingMobileMenu ? 'block' : 'hidden') + ' sm:hidden'}>
                    <div className="space-y-1 px-2 pb-3 pt-2">
                        {navLinks.map(({ href, label, exact }) => (
                            <Link
                                key={href}
                                href={href}
                                className={
                                    'block rounded-md px-3 py-2 text-base font-medium transition-colors duration-150 ' +
                                    (isActive(href, url, exact)
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                                }
                                onClick={() => setShowingMobileMenu(false)}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Mobile User Section */}
                    <div className="border-t border-gray-200 pb-3 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-gray-800">
                                {user?.name}
                            </div>
                            <div className="text-sm font-medium text-gray-500">
                                {user?.email}
                            </div>
                        </div>
                        <div className="mt-3 space-y-1 px-2">
                            <Link
                                href="/profile"
                                className="block rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                onClick={() => setShowingMobileMenu(false)}
                            >
                                Profile
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Content */}
            <main>{children}</main>
        </div>
    );
}
