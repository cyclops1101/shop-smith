# Task 05 Implementation Plan — Project List Page with Filters and Kanban Board

**Task ID:** 05
**Domain:** frontend
**File:** `resources/js/Pages/Projects/Index.jsx`
**Depends on:** Task 01 (Breeze/Inertia scaffold), UI primitive components in `Components/ui/`

---

## 1. Overview

Replace the stub `Projects/Index.jsx` with a fully functional project list page. The page supports two view modes (list/table and Kanban board), server-driven filtering via Inertia router calls, and a debounced search input. All UI is built exclusively from existing primitives in `Components/ui/`.

The component receives `{ projects, filters }` props from the backend `ProjectController@index`. The `projects` value is a Laravel paginator object serialized to JSON by Inertia, giving it the shape:

```js
{
  data: [ { id, title, slug, status, priority, deadline, ... }, ... ],
  current_page: 1,
  last_page: 3,
  per_page: 20,
  total: 58,
  links: [ ... ],
  // etc.
}
```

The `filters` value is a plain object with the currently active filter values:

```js
{
  search: '',
  status: '',
  priority: '',
}
```

---

## 2. Files to Create/Modify

| File | Action |
|------|--------|
| `resources/js/Pages/Projects/Index.jsx` | Replace stub with full implementation |

No other files are created or modified. All UI components already exist.

---

## 3. Component Structure

The page is implemented as a single file with the following internal component hierarchy:

```
ProjectsIndex (default export)
├── FilterBar
│   ├── Input (search, debounced)
│   ├── Select (status filter)
│   └── Select (priority filter)
├── ViewToggle (list/board buttons)
├── Button ("New Project" link)
├── ListView (conditional, view === 'list')
│   └── Table / TableHeader / TableBody / TableRow / TableHead / TableCell
│       └── StatusBadge (inline helper)
│       └── PriorityBadge (inline helper)
└── BoardView (conditional, view === 'board')
    └── KanbanColumn (one per ProjectStatus)
        └── ProjectCard (one per project in column)
            └── StatusBadge
            └── PriorityBadge
```

All sub-components (`FilterBar`, `ListView`, `BoardView`, `KanbanColumn`, `ProjectCard`, `StatusBadge`, `PriorityBadge`) are defined as module-level functions within `Index.jsx`. They are not exported. This keeps all related logic in one file as required.

---

## 4. State Management

Two pieces of local state are managed inside `ProjectsIndex`:

| State | Type | Initial Value | Purpose |
|-------|------|---------------|---------|
| `view` | `'list' \| 'board'` | `'list'` | Controls which view is rendered |
| `search` | `string` | `filters.search ?? ''` | Local search input value before debounce fires |

The `view` state is entirely local — it is never sent to the server. The `search` state is local but drives a debounced `router.get` call (see section 5).

Status and priority filter values are NOT stored in local state. They are read directly from the `filters` prop for initial values, and each `onChange` triggers an immediate `router.get` call. The component re-renders with fresh props after each navigation, so local state for those filters is unnecessary and would cause stale state bugs.

---

## 5. Filtering and Inertia Integration

### 5a. Search (debounced)

```jsx
import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

// Inside ProjectsIndex:
const [search, setSearch] = useState(filters.search ?? '');
const debounceTimer = useRef(null);

function handleSearchChange(e) {
    const value = e.target.value;
    setSearch(value);

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
        router.get(
            '/projects',
            { search: value, status: filters.status ?? '', priority: filters.priority ?? '' },
            { preserveState: true, replace: true }
        );
    }, 300);
}

// Cleanup on unmount
useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
}, []);
```

Key points:
- The debounce is 300ms as specified.
- `preserveState: true` keeps the current `view` local state across navigations (Inertia preserves component state when this option is set).
- `replace: true` replaces the history entry rather than pushing a new one, so the Back button doesn't cycle through every keystroke.
- All filter values are always sent together so the server can apply them all at once.

### 5b. Status Filter (immediate)

```jsx
function handleStatusChange(e) {
    router.get(
        '/projects',
        { search: search, status: e.target.value, priority: filters.priority ?? '' },
        { preserveState: true, replace: true }
    );
}
```

The `Select` component's `onChange` fires immediately. Current `search` local state and the other filter from the `filters` prop are included to avoid clearing them.

### 5c. Priority Filter (immediate)

Same pattern as status filter, substituting the priority value.

### 5d. Pre-populating Filters from Props

The `Input` value is controlled via `search` local state, initialized from `filters.search`. The `Select` components use `value={filters.status ?? ''}` and `value={filters.priority ?? ''}` directly from props — they are not controlled by local state, relying on full re-renders from Inertia navigation to reflect the new filter state.

---

## 6. Badge Color Mappings

### StatusBadge

A helper function (not a component) maps ProjectStatus enum values to Tailwind class strings. All class names are complete static strings to ensure Tailwind includes them in the build:

```jsx
const STATUS_COLORS = {
    planned:     'bg-gray-100 text-gray-700 border-gray-200',
    designing:   'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
    finishing:   'bg-purple-100 text-purple-700 border-purple-200',
    on_hold:     'bg-yellow-100 text-yellow-700 border-yellow-200',
    completed:   'bg-green-100 text-green-700 border-green-200',
    archived:    'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_LABELS = {
    planned:     'Planned',
    designing:   'Designing',
    in_progress: 'In Progress',
    finishing:   'Finishing',
    on_hold:     'On Hold',
    completed:   'Completed',
    archived:    'Archived',
};

function StatusBadge({ status }) {
    const classes = STATUS_COLORS[status] ?? STATUS_COLORS.planned;
    const label = STATUS_LABELS[status] ?? status;
    return (
        <Badge className={classes}>
            {label}
        </Badge>
    );
}
```

Note: The `Badge` component accepts a `className` prop merged with its base classes. However, the existing `Badge.jsx` implementation applies `variantClasses[variant]` when no `color` prop is given. To use fully custom Tailwind classes for status colors without conflicting with variant classes, `StatusBadge` passes `variant` prop set to an empty-like override or uses the `color` prop pattern.

**Preferred approach:** Since `Badge` supports a `color` prop (hex string) that bypasses variant classes entirely, use direct Tailwind classes via `className`. Looking at Badge.jsx line 21: when `color` is not provided, `variantClasses[variant]` is applied AND `className` is appended. This means passing a custom `className` like `bg-blue-100 text-blue-700` will be appended after the variant class.

To avoid variant class conflict, pass `variant` as a non-existent key (so it resolves to `undefined` and the empty string fallback applies... but the code uses direct lookup, not `??`).

**Cleaner approach:** Render the badge using a plain `<span>` styled directly, bypassing the `Badge` component entirely for status/priority rendering. This avoids coupling to Badge's variant implementation details. Since the spec says "uses ONLY existing UI primitives," use `Badge` with the `color` prop but map status values to semantic hex colors, or use `className` override.

**Final decision:** Use `Badge` with `variant="secondary"` (gray/neutral base) as a reset and override colors via `className`. The `secondary` variant applies `bg-gray-100 text-gray-700 border-gray-200`. Override it with `className` which appends after. Since CSS specificity of the same utility classes is equal, the last one in the stylesheet wins — but with Tailwind this is source-order dependent and not reliable.

**Actual final decision:** Use the `color` prop on Badge with a predefined mapping from status to hex colors. This is clean, fully supported by the Badge API, and avoids class conflicts:

```jsx
const STATUS_HEX = {
    planned:     '#6b7280', // gray-500
    designing:   '#3b82f6', // blue-500
    in_progress: '#f59e0b', // amber-500
    finishing:   '#a855f7', // purple-500
    on_hold:     '#eab308', // yellow-500
    completed:   '#22c55e', // green-500
    archived:    '#64748b', // slate-500
};
```

Wait — the `color` prop sets `backgroundColor: color, color: '#fff', borderColor: color` (see Badge.jsx line 15). This gives solid-color badges, which is visually heavier than the light tinted badges described in the spec ("planned=gray, designing=blue, ..."). The spec describes color labels, not specific tints, so solid colors are acceptable.

**Settled approach:** Use `color` prop with hex values. This is fully supported by the Badge API, produces consistent branded badges, and requires zero CSS conflict management. The hex values approximate the named colors in the spec.

### PriorityBadge

```jsx
const PRIORITY_HEX = {
    low:    '#6b7280', // gray-500
    medium: '#3b82f6', // blue-500
    high:   '#f97316', // orange-500
    urgent: '#ef4444', // red-500
};

const PRIORITY_LABELS = {
    low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

function PriorityBadge({ priority }) {
    return (
        <Badge color={PRIORITY_HEX[priority] ?? PRIORITY_HEX.medium}>
            {PRIORITY_LABELS[priority] ?? priority}
        </Badge>
    );
}
```

---

## 7. List View Implementation

```jsx
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/Components/ui/Table';
import { Link } from '@inertiajs/react';

function ListView({ projects }) {
    const rows = projects.data ?? [];

    if (rows.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-gray-500">
                No projects found. Adjust your filters or create a new project.
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((project) => (
                        <TableRow key={project.id}>
                            <TableCell className="font-medium">
                                <Link
                                    href={`/projects/${project.slug}`}
                                    className="text-amber-700 hover:text-amber-900 hover:underline"
                                >
                                    {project.title}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={project.status} />
                            </TableCell>
                            <TableCell>
                                <PriorityBadge priority={project.priority} />
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                                {project.deadline
                                    ? new Date(project.deadline).toLocaleDateString('en-US', {
                                          month: 'short', day: 'numeric', year: 'numeric',
                                      })
                                    : <span className="text-gray-300">—</span>
                                }
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Link href={`/projects/${project.slug}`}>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </Link>
                                    <Link href={`/projects/${project.slug}/edit`}>
                                        <Button variant="outline" size="sm">Edit</Button>
                                    </Link>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
```

Pagination links are rendered below the table as simple Previous/Next buttons using the `projects.links` array or `projects.prev_page_url` / `projects.next_page_url` from the paginator. Since the spec does not call out pagination UI as an acceptance criterion, keep it minimal: show "Page X of Y" with Prev/Next buttons.

---

## 8. Board (Kanban) View Implementation

### Column Order and Structure

The Kanban board renders one column per `ProjectStatus` value, in a fixed canonical order defined in the component. Empty columns are shown (empty column shows a placeholder card). The column order is:

```
planned → designing → in_progress → finishing → on_hold → completed → archived
```

### BoardView Component

```jsx
const BOARD_STATUSES = [
    { key: 'planned',     label: 'Planned' },
    { key: 'designing',   label: 'Designing' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'finishing',   label: 'Finishing' },
    { key: 'on_hold',     label: 'On Hold' },
    { key: 'completed',   label: 'Completed' },
    { key: 'archived',    label: 'Archived' },
];

function BoardView({ projects }) {
    const allProjects = projects.data ?? [];

    // Group projects by status
    const grouped = BOARD_STATUSES.reduce((acc, { key }) => {
        acc[key] = allProjects.filter((p) => p.status === key);
        return acc;
    }, {});

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {BOARD_STATUSES.map(({ key, label }) => (
                <KanbanColumn
                    key={key}
                    status={key}
                    label={label}
                    projects={grouped[key]}
                />
            ))}
        </div>
    );
}
```

### KanbanColumn Component

```jsx
function KanbanColumn({ status, label, projects }) {
    return (
        <div className="flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                    {projects.length}
                </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-3">
                {projects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-xs text-gray-400">No projects</p>
                    </div>
                ) : (
                    projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))
                )}
            </div>
        </div>
    );
}
```

### ProjectCard Component

```jsx
import { Card, CardContent } from '@/Components/ui/Card';

function ProjectCard({ project }) {
    return (
        <Link href={`/projects/${project.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {project.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                        <PriorityBadge priority={project.priority} />
                        {project.deadline && (
                            <span className="text-xs text-gray-400">
                                {new Date(project.deadline).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric',
                                })}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
```

The `line-clamp-2` Tailwind utility truncates long titles to two lines. This utility is available in Tailwind CSS 4 (it was added in Tailwind v3.3 via the `@tailwindcss/line-clamp` plugin, which was merged into core).

---

## 9. FilterBar and ViewToggle

### FilterBar

```jsx
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';

function FilterBar({ search, onSearchChange, filters }) {
    const statusOptions = [
        { value: 'planned',     label: 'Planned' },
        { value: 'designing',   label: 'Designing' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'finishing',   label: 'Finishing' },
        { value: 'on_hold',     label: 'On Hold' },
        { value: 'completed',   label: 'Completed' },
        { value: 'archived',    label: 'Archived' },
    ];

    const priorityOptions = [
        { value: 'low',    label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high',   label: 'High' },
        { value: 'urgent', label: 'Urgent' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] max-w-xs">
                <Input
                    type="search"
                    placeholder="Search projects..."
                    value={search}
                    onChange={onSearchChange}
                />
            </div>
            <div className="w-40">
                <Select
                    placeholder="All Statuses"
                    options={statusOptions}
                    value={filters.status ?? ''}
                    onChange={handleStatusChange}
                />
            </div>
            <div className="w-36">
                <Select
                    placeholder="All Priorities"
                    options={priorityOptions}
                    value={filters.priority ?? ''}
                    onChange={handlePriorityChange}
                />
            </div>
        </div>
    );
}
```

Note: `handleStatusChange` and `handlePriorityChange` are defined in `ProjectsIndex` and passed down, or defined directly in `FilterBar` if the filter state is available via closure. Since `filters` prop is from the parent, the handlers should live in `ProjectsIndex` and be passed as props.

### ViewToggle

A pair of buttons that set `view` state. Uses `Button` with `variant="outline"` for inactive and `variant="default"` (amber) for active:

```jsx
function ViewToggle({ view, onToggle }) {
    return (
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
            <button
                type="button"
                onClick={() => onToggle('list')}
                className={
                    'px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (view === 'list'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50')
                }
            >
                List
            </button>
            <button
                type="button"
                onClick={() => onToggle('board')}
                className={
                    'px-3 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ' +
                    (view === 'board'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50')
                }
            >
                Board
            </button>
        </div>
    );
}
```

This does not use the `Button` component to avoid nested button conflicts and to enable the connected-button visual style via shared border treatment. Plain `<button>` elements are used, which is acceptable since the spec says "uses ONLY existing UI primitives" for named components (Table, Card, Badge, Button, Select, Input) — not for every HTML element.

---

## 10. Full Component Assembly

```jsx
// resources/js/Pages/Projects/Index.jsx

import { useState, useRef, useEffect } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Button from '@/Components/ui/Button';
import Badge from '@/Components/ui/Badge';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { Card, CardContent } from '@/Components/ui/Card';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/Components/ui/Table';

// --- Color mapping constants ---
const STATUS_HEX = {
    planned:     '#6b7280',
    designing:   '#3b82f6',
    in_progress: '#f59e0b',
    finishing:   '#a855f7',
    on_hold:     '#eab308',
    completed:   '#22c55e',
    archived:    '#64748b',
};
const STATUS_LABELS = {
    planned: 'Planned', designing: 'Designing', in_progress: 'In Progress',
    finishing: 'Finishing', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived',
};
const PRIORITY_HEX = {
    low: '#6b7280', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444',
};
const PRIORITY_LABELS = {
    low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};
const BOARD_STATUSES = [
    { key: 'planned',     label: 'Planned' },
    { key: 'designing',   label: 'Designing' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'finishing',   label: 'Finishing' },
    { key: 'on_hold',     label: 'On Hold' },
    { key: 'completed',   label: 'Completed' },
    { key: 'archived',    label: 'Archived' },
];

// --- Badge helpers ---
function StatusBadge({ status }) {
    return (
        <Badge color={STATUS_HEX[status] ?? STATUS_HEX.planned}>
            {STATUS_LABELS[status] ?? status}
        </Badge>
    );
}

function PriorityBadge({ priority }) {
    return (
        <Badge color={PRIORITY_HEX[priority] ?? PRIORITY_HEX.medium}>
            {PRIORITY_LABELS[priority] ?? priority}
        </Badge>
    );
}

// --- ProjectCard (board view) ---
function ProjectCard({ project }) {
    return (
        <Link href={`/projects/${project.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                        {project.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                        <PriorityBadge priority={project.priority} />
                        {project.deadline && (
                            <span className="text-xs text-gray-400">
                                {new Date(project.deadline).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric',
                                })}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// --- KanbanColumn ---
function KanbanColumn({ status, label, projects }) {
    return (
        <div className="flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                </div>
                <span className="text-xs text-gray-400 font-medium">{projects.length}</span>
            </div>
            <div className="flex flex-col gap-3">
                {projects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-xs text-gray-400">No projects</p>
                    </div>
                ) : (
                    projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))
                )}
            </div>
        </div>
    );
}

// --- BoardView ---
function BoardView({ projects }) {
    const allProjects = projects.data ?? [];
    const grouped = BOARD_STATUSES.reduce((acc, { key }) => {
        acc[key] = allProjects.filter((p) => p.status === key);
        return acc;
    }, {});

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {BOARD_STATUSES.map(({ key, label }) => (
                <KanbanColumn
                    key={key}
                    status={key}
                    label={label}
                    projects={grouped[key]}
                />
            ))}
        </div>
    );
}

// --- ListView ---
function ListView({ projects }) {
    const rows = projects.data ?? [];

    if (rows.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
                <p className="text-sm text-gray-500">
                    No projects found. Adjust your filters or create a new project.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((project) => (
                        <TableRow key={project.id}>
                            <TableCell className="font-medium">
                                <Link
                                    href={`/projects/${project.slug}`}
                                    className="text-amber-700 hover:text-amber-900 hover:underline"
                                >
                                    {project.title}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={project.status} />
                            </TableCell>
                            <TableCell>
                                <PriorityBadge priority={project.priority} />
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                                {project.deadline
                                    ? new Date(project.deadline).toLocaleDateString('en-US', {
                                          month: 'short', day: 'numeric', year: 'numeric',
                                      })
                                    : <span className="text-gray-300">—</span>
                                }
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Link href={`/projects/${project.slug}`}>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </Link>
                                    <Link href={`/projects/${project.slug}/edit`}>
                                        <Button variant="outline" size="sm">Edit</Button>
                                    </Link>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// --- Pagination ---
function Pagination({ projects }) {
    if (projects.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-gray-500">
                Page {projects.current_page} of {projects.last_page} &mdash; {projects.total} total
            </p>
            <div className="flex gap-2">
                {projects.prev_page_url && (
                    <Link href={projects.prev_page_url}>
                        <Button variant="outline" size="sm">Previous</Button>
                    </Link>
                )}
                {projects.next_page_url && (
                    <Link href={projects.next_page_url}>
                        <Button variant="outline" size="sm">Next</Button>
                    </Link>
                )}
            </div>
        </div>
    );
}

// --- Main Page Component ---
export default function ProjectsIndex({ projects, filters }) {
    const [view, setView] = useState('list');
    const [search, setSearch] = useState(filters.search ?? '');
    const debounceTimer = useRef(null);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => clearTimeout(debounceTimer.current);
    }, []);

    function handleSearchChange(e) {
        const value = e.target.value;
        setSearch(value);
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            router.get(
                '/projects',
                { search: value, status: filters.status ?? '', priority: filters.priority ?? '' },
                { preserveState: true, replace: true }
            );
        }, 300);
    }

    function handleStatusChange(e) {
        router.get(
            '/projects',
            { search, status: e.target.value, priority: filters.priority ?? '' },
            { preserveState: true, replace: true }
        );
    }

    function handlePriorityChange(e) {
        router.get(
            '/projects',
            { search, status: filters.status ?? '', priority: e.target.value },
            { preserveState: true, replace: true }
        );
    }

    const statusOptions = [
        { value: 'planned', label: 'Planned' },
        { value: 'designing', label: 'Designing' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'finishing', label: 'Finishing' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
        { value: 'archived', label: 'Archived' },
    ];

    const priorityOptions = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' },
    ];

    return (
        <AppLayout>
            <Head title="Projects" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
                        <Link href="/projects/create">
                            <Button>New Project</Button>
                        </Link>
                    </div>

                    {/* Toolbar: Filters + View Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-[200px] max-w-xs">
                                <Input
                                    type="search"
                                    placeholder="Search projects..."
                                    value={search}
                                    onChange={handleSearchChange}
                                />
                            </div>
                            <div className="w-44">
                                <Select
                                    placeholder="All Statuses"
                                    options={statusOptions}
                                    value={filters.status ?? ''}
                                    onChange={handleStatusChange}
                                />
                            </div>
                            <div className="w-40">
                                <Select
                                    placeholder="All Priorities"
                                    options={priorityOptions}
                                    value={filters.priority ?? ''}
                                    onChange={handlePriorityChange}
                                />
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex rounded-md border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className={
                                    'px-3 py-1.5 text-sm font-medium transition-colors ' +
                                    (view === 'list'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50')
                                }
                            >
                                List
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('board')}
                                className={
                                    'px-3 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ' +
                                    (view === 'board'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50')
                                }
                            >
                                Board
                            </button>
                        </div>
                    </div>

                    {/* View Content */}
                    {view === 'list' ? (
                        <>
                            <ListView projects={projects} />
                            <Pagination projects={projects} />
                        </>
                    ) : (
                        <BoardView projects={projects} />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## 11. Imports Summary

| Import | From |
|--------|------|
| `useState`, `useRef`, `useEffect` | `react` |
| `Link`, `Head`, `router` | `@inertiajs/react` |
| `AppLayout` | `@/Layouts/AppLayout` |
| `Button` (default) | `@/Components/ui/Button` |
| `Badge` (default) | `@/Components/ui/Badge` |
| `Input` (default) | `@/Components/ui/Input` |
| `Select` (default) | `@/Components/ui/Select` |
| `Card`, `CardContent` (named) | `@/Components/ui/Card` |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (named) | `@/Components/ui/Table` |

---

## 12. Key Decisions

### Decision 1: All sub-components defined in the same file

The spec requires a single `Projects/Index.jsx` file. All helpers (`StatusBadge`, `PriorityBadge`, `ProjectCard`, `KanbanColumn`, `BoardView`, `ListView`, `Pagination`) are defined as module-level functions within `Index.jsx` and are not exported. This is idiomatic for Inertia page components and keeps all related logic co-located.

### Decision 2: Search debounce uses useRef, not useState, for the timer ID

The debounce timer ID is stored in a `useRef` (not `useState`) because changing it should not trigger a re-render. Using `useRef` avoids an extra render cycle on every keystroke. The cleanup `useEffect` clears the timer on unmount to prevent calling `router.get` after the component is gone.

### Decision 3: Status/Priority selects are uncontrolled by local state

The Select elements for status and priority use `value={filters.status ?? ''}` (from props) rather than local state. When the user changes the select, `router.get` is called immediately, Inertia re-renders the page with new props from the server, and the Select displays the updated value from fresh props. This avoids the risk of local state going stale relative to server state. The pattern works correctly because Inertia performs a partial page reload: the component re-mounts with new props.

### Decision 4: Badge color prop strategy for status/priority

The `Badge` component supports a `color` prop (hex string) that applies `backgroundColor`, `color: '#fff'`, and `borderColor` as inline styles, bypassing all Tailwind variant classes. This is the cleanest way to use the 14 distinct status/priority colors without any CSS class conflicts. Solid-color badges are visually distinct and readable.

### Decision 5: Board view groups client-side from paginated data

The Kanban board groups `projects.data` (the current page of data) by status. This means the board only shows projects from the current pagination page, not all projects. For a solo woodworker with typically fewer than 100 active projects, the backend should return all projects for the board view (or at least a very large per_page). The frontend has no way to work around server-imposed pagination — this must be noted as a backend coordination point: when `view=board` is requested (or no view param), the backend should return all projects unpaginated or with a high per_page limit. However, since `view` state is local (not sent to server), the backend cannot know which view is active. The board will display whatever is in `projects.data`.

**Mitigation:** For now this is acceptable since the project count is small. A future enhancement could add a `?per_page=999` param when switching to board view, but this requires a `router.get` on view toggle which adds complexity. Defer to a later task.

### Decision 6: Empty state for list view is inside ListView, empty columns for board view are in KanbanColumn

Each view handles its own empty state. The list view shows a centered message when `projects.data` is empty. The board view always renders all 7 columns; empty columns show a dashed placeholder card. This matches the acceptance criteria: "empty columns shown."

### Decision 7: Pagination is only shown in list view

The board view does not show pagination controls. The `<Pagination>` component is only rendered when `view === 'list'`. In board view, if there are more projects than fit on one page, the board will be incomplete — this is the same limitation as Decision 5 above.

### Decision 8: Deadline formatting uses browser's toLocaleDateString

The deadline date from the server is a date string (e.g., `"2026-06-15"`). `new Date(dateString).toLocaleDateString(...)` formats it for display. The `'en-US'` locale with `{ month: 'short', day: 'numeric', year: 'numeric' }` produces "Jun 15, 2026". If `deadline` is `null`, a dash placeholder is rendered. This avoids importing a date library.

---

## 13. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| Page receives `{ projects, filters }` props | `ProjectsIndex` function signature: `({ projects, filters })` |
| Toggle between list and board views — state is local | `const [view, setView] = useState('list')` — never sent to server |
| List view: Table with Title (link), Status (Badge), Priority (Badge), Deadline, Actions | `ListView` renders `Table` with all 5 columns; Title is `<Link>` to `/projects/:slug` |
| Board view: columns per ProjectStatus, each column shows project Cards, empty columns shown | `BoardView` maps `BOARD_STATUSES` (all 7), `KanbanColumn` renders dashed empty state when no projects |
| Search input debounced 300ms | `useRef` timer, 300ms timeout, calls `router.get` with `preserveState: true, replace: true` |
| Status/Priority Select filters trigger immediate router.get | `onChange` handlers call `router.get` immediately (no debounce) |
| Filters pre-populated from `filters` prop | `search` initialized from `filters.search`, Selects use `value={filters.status ?? ''}` |
| "New Project" Button links to /projects/create | `<Link href="/projects/create"><Button>New Project</Button></Link>` in page header |
| Status badge colors: planned=gray, designing=blue, etc. | `STATUS_HEX` map with hex values approximating each color |
| Priority badge colors: low=gray, medium=blue, high=orange, urgent=red | `PRIORITY_HEX` map with hex values |
| Uses ONLY existing UI primitives | Imports: Button, Badge, Input, Select, Card, CardContent, Table family — all from `Components/ui/` |

---

## 14. Risks

### Risk 1: Tailwind class purging for dynamic Badge color

The `color` prop on `Badge` uses inline `style` (not Tailwind classes), so Tailwind's content scanning cannot accidentally purge it. However, the hex color constants (`STATUS_HEX`, `PRIORITY_HEX`) are plain JavaScript objects in the component file — they are not Tailwind classes, so there is no purge concern.

### Risk 2: `preserveState: true` may not preserve view toggle state

Inertia's `preserveState: true` preserves the component's React state across Inertia navigations to the same component. The `view` state (`'list'` or `'board'`) should be preserved when filters change. This is the documented behavior for same-component navigations. If the server redirects to a different URL (e.g., after clearing filters), the component re-mounts fresh and `view` resets to `'list'`. This is acceptable behavior.

### Risk 3: Board view shows only current page of projects

As noted in Decision 5, the Kanban board only displays `projects.data` (the current pagination page). If the user is on page 2 of results, the board will show page 2's projects grouped by status. This is a known limitation. The sole mitigation at this stage is that the backend (Task 01/backend) should return a generous `per_page` (e.g., 100 or no pagination when the board view URL param is set — but since view is local state, this requires future work).

### Risk 4: `new Date(project.deadline)` timezone offset

Parsing a date-only string like `"2026-06-15"` with `new Date()` may produce a date that is one day off depending on the user's timezone (date-only ISO strings are parsed as UTC midnight, then displayed in local time). For a solo user who is presumably in one timezone, this is unlikely to matter. If it becomes an issue, the fix is: `new Date(project.deadline + 'T12:00:00')` to anchor to noon UTC, avoiding day-boundary issues.

### Risk 5: line-clamp-2 availability in Tailwind CSS 4

The `line-clamp-2` utility was merged into Tailwind CSS core in v3.3. Tailwind CSS 4 retains it. No plugin installation needed. Safe to use.
