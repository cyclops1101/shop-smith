# Task 05 Implementation Plan — Frontend Base Layout and UI Primitives

**Task ID:** 05
**Domain:** frontend
**Parallel Group:** 2 (depends on Task 01 only — can run in parallel with Tasks 02 and 03)
**Complexity:** medium

---

## 1. Approach

Build the authenticated application shell (`AppLayout.jsx`) and all 10 shadcn-style UI primitive components, plus a `Dashboard.jsx` stub page. This task is pure frontend — no backend changes, no database interaction. It can be executed immediately after Task 01 (Breeze install) completes, in parallel with the backend Tasks 02 and 03.

The implementation creates two categories of output:

**AppLayout.jsx** — the persistent authenticated shell that every feature page will wrap itself in. Contains the sidebar navigation (desktop), mobile hamburger drawer, top bar with Timer placeholder and user menu, and a `children` content slot.

**10 UI primitive components** — self-contained, composable, Tailwind-only components. These are "shadcn-style" in architecture (named exports, className pass-through, variant props) but do NOT use the shadcn/ui library, Radix UI, or CVA. They are plain React + Tailwind utilities.

Implementation order:
1. Create the `resources/js/Components/ui/` directory structure
2. Implement all 10 primitive components (leaf-level, no cross-dependencies)
3. Implement `AppLayout.jsx` (may import Button from primitives for the user menu)
4. Implement `Dashboard.jsx` stub using AppLayout

---

## 2. Files to Create/Modify

| File | Action |
|------|--------|
| `resources/js/Layouts/AppLayout.jsx` | Create |
| `resources/js/Components/ui/Button.jsx` | Create |
| `resources/js/Components/ui/Card.jsx` | Create |
| `resources/js/Components/ui/Badge.jsx` | Create |
| `resources/js/Components/ui/Input.jsx` | Create |
| `resources/js/Components/ui/Label.jsx` | Create |
| `resources/js/Components/ui/Select.jsx` | Create |
| `resources/js/Components/ui/Textarea.jsx` | Create |
| `resources/js/Components/ui/Table.jsx` | Create |
| `resources/js/Components/ui/Modal.jsx` | Create |
| `resources/js/Components/ui/Alert.jsx` | Create |
| `resources/js/Pages/Dashboard.jsx` | Create (replaces Breeze stub if present) |

**Total: 12 files (11 creates, 1 create-or-replace)**

Note: The `resources/js/Layouts/` directory is created by Breeze (Task 01) — it will already contain `AuthenticatedLayout.jsx` and `GuestLayout.jsx`. `AppLayout.jsx` is added alongside those; it does NOT replace them (Breeze auth pages still use `GuestLayout`).

The `resources/js/Components/ui/` subdirectory likely does not exist after Breeze install. It must be created. Since all files are being written to it, the directory will be created implicitly when writing the first file (Node/filesystem creates parent directories as needed).

---

## 3. Key Decisions

### Decision 1: AppLayout uses a fixed left sidebar, not a top-only nav

A sidebar pattern is more appropriate for a shop management tool used on a desktop or tablet. It keeps navigation always visible without consuming vertical space, which is important for data-dense views (project lists, cut list visualizer, finance tables). The sidebar collapses to a slide-out drawer on mobile.

Structure:
```
<div class="flex h-screen overflow-hidden bg-gray-50">
  <aside class="hidden md:flex md:flex-col md:w-64 ...">  {/* desktop sidebar */}
    <SidebarContent />
  </aside>
  <MobileDrawer />   {/* fixed overlay, md:hidden */}
  <div class="flex flex-col flex-1 overflow-hidden">
    <TopBar />       {/* h-16, timer + user menu */}
    <main class="flex-1 overflow-y-auto p-6">
      {children}
    </main>
  </div>
</div>
```

### Decision 2: No icon library dependency — inline SVGs

Lucide React, Heroicons, and similar libraries are not in the current `package.json` (Task 01 only installs Breeze's dependencies). Adding them is out of scope for Task 05. Instead, each icon used in `AppLayout.jsx` is a small inline SVG component defined in the same file. SVGs use `currentColor` stroke so they inherit text color from their parent. This approach is zero-dependency and the icons can be replaced with a library later without changing component APIs.

Icons needed: Grid/Dashboard, FolderOpen/Projects, Package/Materials, Wrench/Tools, DollarSign/Finance, Scissors/CutList, Menu/hamburger, X/close, Play, ChevronDown.

### Decision 3: Active nav detection via usePage().url — startsWith matching

`usePage().url` returns the current path (e.g., `/projects/my-project`). Active state is detected with `url.startsWith(item.href)` rather than strict equality. This means the Projects nav link is highlighted on `/projects`, `/projects/create`, and `/projects/my-project/edit` — the correct behavior. The Dashboard link uses strict equality (`url === '/dashboard'`) to avoid matching everything that starts with `/d`.

### Decision 4: Timer widget is a non-functional placeholder

Task 05 scope is the placeholder only. The timer shows `00:00:00` in a monospace font with a Play button. No state, no timers, no project linking. Task 06 (Routes + Controller Stubs) and later feature tasks will replace this with a real timer component. The placeholder is rendered as a `<div>` not a `<button>` at the container level — only the inner play icon is a button stub.

### Decision 5: UserMenu is a simple dropdown stub

Displays the authenticated user's name from `usePage().props.auth.user`. On click, shows a dropdown with a "Sign Out" link pointing to Breeze's logout route (`/logout` via POST). Implemented with a `useState` dropdown toggle. No popover library needed — uses `relative + absolute` positioning.

The sign-out link must use Inertia's `router.post('/logout')` (not an `<a>` tag) because Breeze's logout route is a `POST` route protected by CSRF.

### Decision 6: UI primitives use named exports where components are compound

Per the task manifest, `Card.jsx` exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` and `Table.jsx` exports `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. These use named exports (not a default export with static properties) because Vite and tree-shaking work better with named exports.

All other primitives (`Button`, `Badge`, `Input`, `Label`, `Select`, `Textarea`, `Modal`, `Alert`) use a single default export.

### Decision 7: Badge accepts both variant prop and color prop

The `color` prop (hex string like `"#4a7c59"`) sets an inline `style={{ backgroundColor: color }}` on the badge element. When `color` is provided, it overrides the `variant` Tailwind class. This enables Tag model colors (arbitrary hex) to be displayed directly without needing Tailwind's JIT to know the hex values at build time.

Pattern:
```jsx
const style = color ? { backgroundColor: color, color: '#fff' } : {};
const className = color ? '' : variantClasses[variant];
```

### Decision 8: Modal uses createPortal for z-index isolation

Rendering the modal inside the DOM tree of the component that triggers it risks z-index conflicts with the sidebar overlay. `ReactDOM.createPortal(content, document.body)` renders the modal at the body level, ensuring it always appears above all other content. An Escape key listener is added via `useEffect` cleanup pattern.

### Decision 9: All form primitive components (Input, Label, Select, Textarea) are wrappers with error support

Each form component wraps the native HTML element and:
1. Applies consistent Tailwind styling
2. Accepts an `error` prop (string) that renders a red error message below the field
3. Spreads remaining props onto the native element (`...props`) for full HTML attribute compatibility
4. Accepts `className` prop merged with default classes

This pattern is compatible with Inertia's `useForm` hook — errors from `form.errors.fieldName` can be passed directly to the `error` prop.

### Decision 10: Dashboard.jsx stub accepts stats prop shape

The manifest specifies `Dashboard.jsx` accepts `{ stats }`. The stub renders a heading "Dashboard" inside `AppLayout` with placeholder text for each widget area. The `stats` prop is accepted but not yet used — this allows `DashboardController@index` to return `Inertia::render('Dashboard', ['stats' => []])` without the page component crashing.

---

## 4. Component Specifications

### AppLayout.jsx

```jsx
// resources/js/Layouts/AppLayout.jsx
import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', exact: true },
    { label: 'Projects',  href: '/projects' },
    { label: 'Materials', href: '/materials' },
    { label: 'Tools',     href: '/tools' },
    { label: 'Finance',   href: '/finance' },
    { label: 'Cut List',  href: '/cut-list' },
];

export default function AppLayout({ children, title }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { url, props } = usePage();
    const user = props.auth?.user;

    const isActive = (item) =>
        item.exact ? url === item.href : url.startsWith(item.href);

    // SidebarContent, TopBar, TimerWidget, UserMenu as inner components
    // Full implementation described below
    return ( /* ... */ );
}
```

**SidebarContent** (inner component, not exported):
- App name "Workshop Manager" at top, styled as a header
- Maps `NAV_ITEMS` to `<Link>` components with active styling
- Active item: `bg-amber-600 text-white` (amber/wood tone matches woodworking theme)
- Inactive item: `text-gray-300 hover:bg-gray-700 hover:text-white`
- Each nav link has an icon (inline SVG) + label in a flex row

**MobileDrawer** (inner component, not exported):
- Conditionally rendered when `sidebarOpen === true`
- Fixed overlay: `fixed inset-0 z-40 md:hidden`
- Backdrop div: `fixed inset-0 bg-black/50` with `onClick={() => setSidebarOpen(false)}`
- Slide-in aside with same `SidebarContent` content

**TopBar** (inner component):
- `flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200`
- Left: hamburger button (visible only on mobile, `md:hidden`)
- Center: optional `title` prop displayed as `h1`
- Right: `TimerWidget` + `UserMenu`

**TimerWidget** (inner component):
```jsx
function TimerWidget() {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 text-sm font-mono text-gray-600 select-none">
            <span>00:00:00</span>
            <button
                type="button"
                aria-label="Start timer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                {/* Play SVG icon */}
            </button>
        </div>
    );
}
```

**UserMenu** (inner component):
- Shows user's name with a ChevronDown icon
- `useState(open)` for dropdown visibility
- Dropdown: absolute positioned below, contains "Profile" link and "Sign Out" button
- Sign out: `router.post('/logout')` (POST to Breeze logout route)
- Click-outside: `useEffect` + document `mousedown` listener to close dropdown

---

### Button.jsx

```jsx
// resources/js/Components/ui/Button.jsx
// Variants: default, secondary, destructive, ghost, outline
// Sizes: sm, md, lg
// Props: variant, size, loading, disabled, children, className, ...props

const variantClasses = {
    default:     'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
    secondary:   'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    ghost:       'text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400',
    outline:     'border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400',
};

const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export default function Button({
    variant = 'default',
    size = 'md',
    loading = false,
    disabled,
    children,
    className = '',
    ...props
}) {
    const base = 'inline-flex items-center justify-center font-medium rounded-md ' +
                 'transition-colors focus:outline-none focus-visible:ring-2 ' +
                 'focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            className={`${base} ${variantClasses[variant] ?? variantClasses.default} ${sizeClasses[size] ?? sizeClasses.md} ${className}`}
            disabled={loading || disabled}
            {...props}
        >
            {loading && (
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
}
```

---

### Card.jsx

```jsx
// resources/js/Components/ui/Card.jsx
// Named exports: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

export function Card({ className = '', children, ...props }) {
    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ className = '', children, ...props }) {
    return (
        <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className = '', children, ...props }) {
    return (
        <h3 className={`text-lg font-semibold leading-none tracking-tight text-gray-900 ${className}`} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ className = '', children, ...props }) {
    return (
        <p className={`text-sm text-gray-500 ${className}`} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ className = '', children, ...props }) {
    return (
        <div className={`p-6 pt-0 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className = '', children, ...props }) {
    return (
        <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
            {children}
        </div>
    );
}
```

---

### Badge.jsx

```jsx
// resources/js/Components/ui/Badge.jsx
// Variants: default, secondary, destructive, outline
// color prop: hex string — overrides variant background

const variantClasses = {
    default:     'bg-amber-100 text-amber-800',
    secondary:   'bg-gray-100 text-gray-700',
    destructive: 'bg-red-100 text-red-700',
    outline:     'border border-gray-300 text-gray-600',
};

export default function Badge({ variant = 'default', color, className = '', children, ...props }) {
    const inlineStyle = color ? { backgroundColor: color, color: '#ffffff' } : {};
    const variantClass = color ? '' : (variantClasses[variant] ?? variantClasses.default);

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClass} ${className}`}
            style={inlineStyle}
            {...props}
        >
            {children}
        </span>
    );
}
```

---

### Input.jsx

```jsx
// resources/js/Components/ui/Input.jsx
// Props: label, error, id, className, ...props (forwarded to <input>)

export default function Input({ label, error, id, className = '', ...props }) {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
                    text-gray-900 placeholder-gray-400
                    focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500
                    disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
                    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    ${className}`}
                {...props}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
```

---

### Label.jsx

```jsx
// resources/js/Components/ui/Label.jsx
// A styled <label> element for standalone use alongside Input/Select/etc.

export default function Label({ className = '', children, ...props }) {
    return (
        <label
            className={`block text-sm font-medium text-gray-700 ${className}`}
            {...props}
        >
            {children}
        </label>
    );
}
```

---

### Select.jsx

```jsx
// resources/js/Components/ui/Select.jsx
// Props: label, error, options ([{ value, label }]), id, placeholder, className, ...props

export default function Select({ label, error, options = [], id, placeholder, className = '', ...props }) {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={`block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
                    text-gray-900
                    focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500
                    disabled:cursor-not-allowed disabled:bg-gray-50
                    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
```

---

### Textarea.jsx

```jsx
// resources/js/Components/ui/Textarea.jsx
// Props: label, error, rows, id, className, ...props

export default function Textarea({ label, error, rows = 4, id, className = '', ...props }) {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                rows={rows}
                className={`block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
                    text-gray-900 placeholder-gray-400
                    focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500
                    disabled:cursor-not-allowed disabled:bg-gray-50
                    resize-y
                    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    ${className}`}
                {...props}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
```

---

### Table.jsx

```jsx
// resources/js/Components/ui/Table.jsx
// Named exports: Table, TableHeader, TableBody, TableRow, TableHead, TableCell

export function Table({ className = '', children, ...props }) {
    return (
        <div className="w-full overflow-auto">
            <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ className = '', children, ...props }) {
    return (
        <thead className={`border-b border-gray-200 bg-gray-50 ${className}`} {...props}>
            {children}
        </thead>
    );
}

export function TableBody({ className = '', children, ...props }) {
    return (
        <tbody className={`divide-y divide-gray-100 ${className}`} {...props}>
            {children}
        </tbody>
    );
}

export function TableRow({ className = '', children, ...props }) {
    return (
        <tr className={`hover:bg-gray-50 transition-colors ${className}`} {...props}>
            {children}
        </tr>
    );
}

export function TableHead({ className = '', children, ...props }) {
    return (
        <th
            className={`h-10 px-4 text-left align-middle font-medium text-gray-500 text-xs uppercase tracking-wide ${className}`}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({ className = '', children, ...props }) {
    return (
        <td className={`px-4 py-3 align-middle text-gray-700 ${className}`} {...props}>
            {children}
        </td>
    );
}
```

---

### Modal.jsx

```jsx
// resources/js/Components/ui/Modal.jsx
// Props: open (bool), onClose (fn), title (string), children, footer (ReactNode)
// Uses createPortal to render at document.body level

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, footer }) {
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                aria-hidden="true"
                onClick={onClose}
            />
            {/* Dialog */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close"
                        >
                            {/* X icon SVG */}
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {children}
                </div>
                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
```

---

### Alert.jsx

```jsx
// resources/js/Components/ui/Alert.jsx
// Variants: info, warning, error, success
// Props: variant, title, children, className, onDismiss (optional fn)

const variantConfig = {
    info:    { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-800',  icon: 'ℹ' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: '⚠' },
    error:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800',   icon: '✕' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✓' },
};

export default function Alert({ variant = 'info', title, children, className = '', onDismiss }) {
    const config = variantConfig[variant] ?? variantConfig.info;

    return (
        <div className={`rounded-md border p-4 ${config.bg} ${config.border} ${className}`} role="alert">
            <div className="flex">
                <span className={`mr-3 font-bold ${config.text}`} aria-hidden="true">
                    {config.icon}
                </span>
                <div className="flex-1">
                    {title && (
                        <p className={`text-sm font-medium ${config.text}`}>{title}</p>
                    )}
                    {children && (
                        <div className={`text-sm ${config.text} ${title ? 'mt-1' : ''}`}>
                            {children}
                        </div>
                    )}
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className={`ml-3 ${config.text} hover:opacity-70 transition-opacity`}
                        aria-label="Dismiss"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
```

---

### Dashboard.jsx

```jsx
// resources/js/Pages/Dashboard.jsx
import AppLayout from '@/Layouts/AppLayout';

export default function Dashboard({ stats = {} }) {
    return (
        <AppLayout title="Dashboard">
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-gray-500">Your workshop at a glance.</p>

                {/* Widget placeholder grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[
                        'Active Projects',
                        'Low Stock Alerts',
                        'Upcoming Maintenance',
                        'Recent Activity',
                        'Monthly Finance',
                    ].map((widget) => (
                        <div
                            key={widget}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
                        >
                            <h3 className="text-sm font-medium text-gray-500 mb-2">{widget}</h3>
                            <p className="text-gray-400 text-sm">Coming soon</p>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## 5. Verified Dependencies

| Dependency | Required By | Status |
|------------|-------------|--------|
| Task 01 — Breeze with React + Inertia installed | `@inertiajs/react` (Link, usePage, router), React 19, `resources/js/Layouts/` directory | Must complete before Task 05 |
| `@inertiajs/react` package | `Link`, `usePage`, `router` imports in AppLayout.jsx | Installed by Breeze (Task 01) |
| React 19 | JSX, useState, useEffect, createPortal | Installed by Breeze (Task 01) |
| Tailwind CSS 4 | All utility classes in components | Installed by Breeze (Task 01) via `@tailwindcss/vite` |
| `resources/js/app.jsx` | Inertia root bootstrap, resolves page components | Created by Breeze (Task 01) |

No backend dependencies. This task does not import any PHP models, enums, or controllers.

---

## 6. Tailwind CSS 4 Compatibility Notes

Tailwind CSS 4 uses a CSS-first configuration (`@import "tailwindcss"` in a CSS file) rather than `tailwind.config.js`. All utility classes used in these components are standard and available in Tailwind CSS 4:

- Flex, grid, spacing, sizing utilities — unchanged from v3
- Color utilities (`bg-gray-50`, `text-amber-600`, etc.) — unchanged
- Ring utilities (`ring-2`, `ring-amber-500`) — unchanged
- `focus-visible:` variant — available in v4
- `backdrop-blur-sm` — available in v4

Potentially changed in v4:
- `ring-offset-*` utilities — these have changed in Tailwind v4. **Do NOT use `ring-offset` utilities** in these components. Use `focus-visible:ring-2` without offset for focus indicators.
- Custom color configuration — not needed since all colors use built-in palette

The `@` path alias (`@/Layouts/AppLayout`) depends on Vite's path resolution. Breeze configures this alias in `vite.config.js` pointing to `resources/js`. All import paths using `@/` will resolve correctly.

---

## 7. Risks

### Risk 1: Dashboard.jsx may already exist from Breeze Task 01

Breeze installs a `resources/js/Pages/Dashboard.jsx` as part of its auth scaffold. The Task 05 `Dashboard.jsx` replaces it. The Breeze version uses `AuthenticatedLayout` — the Task 05 version uses `AppLayout`. This is intentional.

**Mitigation:** Read the existing file before overwriting it. If Breeze's Dashboard imports any components that Task 05 should preserve (it typically doesn't — it's a bare welcome page), note them. The Task 05 Dashboard is a clean replace.

### Risk 2: createPortal requires document to be defined

`ReactDOM.createPortal(content, document.body)` will throw if `document` is not defined (SSR context). Breeze's React + Inertia setup in Laravel 12 does not enable SSR by default (the `--ssr` flag must be passed to `breeze:install`). If SSR is enabled in Task 01, add an SSR guard:

```jsx
if (typeof document === 'undefined') return null;
```

Add this check in `Modal.jsx` before the `createPortal` call.

**Mitigation:** Check `vite.config.js` after Task 01 completes. If it includes `laravel-vite-plugin` with an `ssr` entry point, add the SSR guard. If not, no action needed.

### Risk 3: UserMenu click-outside closes on every click

A `document.mousedown` listener that closes the dropdown will fire even when clicking inside the dropdown. Use a `useRef` on the dropdown container and check `ref.current.contains(event.target)` to prevent this.

**Mitigation:** Implement the click-outside handler with a ref:
```jsx
const menuRef = useRef(null);
useEffect(() => {
    const handler = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
            setMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
}, []);
```

### Risk 4: Modal body scroll lock conflicts with page scroll

Setting `document.body.style.overflow = 'hidden'` when the modal opens prevents page scroll. However, if two modals are opened simultaneously (unlikely but possible), the cleanup of the first modal's effect will re-enable scroll while the second is still open.

**Mitigation:** This is acceptable for the current single-user tool. A future refactor could use a scroll lock counter. For Task 05, the simple approach is sufficient.

### Risk 5: Tailwind purge not picking up dynamic classes in Badge

The `color` prop uses inline `style` rather than Tailwind classes, so there is no purge risk for Badge. However, if any other component uses string interpolation to build class names (e.g., `bg-${color}-500`), Tailwind's class detection will miss those. **All Tailwind class names must be complete static strings** — no string interpolation in class names.

**Mitigation:** Review all component implementations before finalizing. All variant maps use complete string values (`'bg-amber-600 text-white'` not `'bg-' + color + '-600'`). This is already enforced in the specifications above.

### Risk 6: Active nav item detection — /cut-list vs /dashboard conflict

`url.startsWith('/dashboard')` would match `/dashboard-settings` if such a route existed. Using `exact: true` on the Dashboard nav item and `url === item.href` prevents this. All other nav items use `url.startsWith()` which is safe for the current route structure (no `/projects-archive` type routes).

**Mitigation:** The `NAV_ITEMS` array includes an `exact` flag for Dashboard. The `isActive` function checks this flag.

---

## 8. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| `resources/js/Layouts/AppLayout.jsx` exists and accepts `children` | Created in section 4; `children` is rendered in the `<main>` element |
| Nav bar includes links to Dashboard, Projects, Materials, Tools, Finance, Cut List | `NAV_ITEMS` array includes all 6 routes; each rendered as Inertia `Link` |
| Active nav item is visually distinguished | `isActive()` function applies `bg-amber-600 text-white` to the matching nav item |
| Timer widget placeholder is visible in the nav bar | `TimerWidget` component rendered in `TopBar`, shows `00:00:00` with a play button |
| All 10 UI primitive files exist under `resources/js/Components/ui/` | Button, Card, Badge, Input, Label, Select, Textarea, Table, Modal, Alert — all specified in section 4 |
| `Button` accepts `variant` and `size` props without errors | `variantClasses` and `sizeClasses` objects handle all specified variants/sizes; unknown values fall back to defaults via `??` |
| `Badge` renders with a custom background color when `color="#hex"` is passed | `color` prop sets inline `style={{ backgroundColor: color }}` and clears variant class |
| `Modal` mounts/unmounts based on `open` prop and calls `onClose` on backdrop click | `if (!open) return null` handles mount; backdrop `onClick={onClose}` handles dismiss; Escape key also triggers `onClose` |
| `Dashboard.jsx` renders without errors using `AppLayout` | Stub page imports and renders `<AppLayout title="Dashboard">` with placeholder content |
| `npm run build` succeeds with all components present | No external dependencies added; all imports are from `react`, `react-dom`, and `@inertiajs/react` (all available after Task 01) |
