# Task 04: Tools Index Page — Implementation Plan

**Task ID:** 04
**Domain:** frontend
**Scope:** Replace stub `resources/js/Pages/Tools/Index.jsx` with a full working page following the `Materials/Index.jsx` pattern exactly.

---

## 1. Approach

The existing `Tools/Index.jsx` is a 16-line stub that renders only a static heading. It must be replaced wholesale with a real page. The implementation strategy is:

1. Follow the structure of `Materials/Index.jsx` exactly: same import set, same component decomposition pattern (FilterBar sub-component, table sub-component, pagination, main export with debounced search).
2. Adapt for the tools domain: one Select filter (category only, no supplier) instead of two; seven table columns (Name, Brand, Model, Category, Location, Usage Hours, Actions) instead of eight; no Badge for status; no currency formatting required.
3. No new UI primitives are needed — all required components (`Button`, `Input`, `Select`, `Table` family) are already present in `resources/js/Components/ui/`.
4. No backend changes are required for this task. The controller and route already exist. The frontend page must be ready to consume the props that the controller will pass.

---

## 2. Files to Modify

| File | Action |
|---|---|
| `resources/js/Pages/Tools/Index.jsx` | Full replacement — remove stub, write complete implementation |

No other files require changes for this task.

---

## 3. Component Structure

The page is composed of three internal components plus the default export:

```
ToolsIndex (default export)
  └── FilterBar        (text search + category Select)
  └── ToolsTable       (table + empty state + prev/next pagination)
```

This mirrors the `MaterialsIndex` / `FilterBar` / `MaterialsTable` decomposition exactly, with the supplier filter removed and table columns adjusted for the tools schema.

---

## 4. Implementation Details

### 4.1 Imports

```jsx
import { useRef, useCallback } from 'react';
import { Link, Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/Table';
```

`Badge` is not imported — the tools table spec includes no badge-type indicators. `useState` is not imported — no view toggle is needed; debounce state is managed via `useRef`.

### 4.2 FilterBar component

Props: `{ filters, categoryOptions, onSearchChange, onCategoryChange }`

- Search input: `<Input type="search" placeholder="Search tools..." defaultValue={filters.search ?? ''} onChange={onSearchChange} />`
- Category select: `<Select options={categoryOptions} placeholder="All categories" value={filters.category ?? ''} onChange={onCategoryChange} />`

Layout: flex row, gap-3, items-center. Search input has `flex-1 min-w-48`. Category select has fixed width `w-44`. This matches the `FilterBar` layout in `Materials/Index.jsx`.

```jsx
function FilterBar({ filters, categoryOptions, onSearchChange, onCategoryChange }) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48">
                <Input
                    type="search"
                    placeholder="Search tools..."
                    defaultValue={filters.search ?? ''}
                    onChange={onSearchChange}
                    className="w-full"
                />
            </div>
            <div className="w-44">
                <Select
                    options={categoryOptions}
                    placeholder="All categories"
                    value={filters.category ?? ''}
                    onChange={onCategoryChange}
                />
            </div>
        </div>
    );
}
```

### 4.3 ToolsTable component

Props: `{ tools }` (the full paginator object)

Columns (7 total):

| # | Head | Content |
|---|---|---|
| 1 | Name | `<Link href="/tools/{id}">` in amber, tool name |
| 2 | Brand | `tool.brand` or `—` if null |
| 3 | Model | `tool.model_number` or `—` if null |
| 4 | Category | `tool.category?.name` or `—` if null |
| 5 | Location | `tool.location` or `—` if null |
| 6 | Usage Hours | `tool.total_usage_hours` formatted to 1 decimal place, or `—` |
| 7 | Actions | `<Link href="/tools/{id}/edit">Edit</Link>` |

The Name column link uses the tool ULID (`tool.id`) as the URL segment, matching the route binding convention for non-project models (ULID, not slug).

The `total_usage_hours` field is `decimal(10,2)` in the database. Display as a number with one decimal place (e.g., `42.5`). Use a small helper:

```jsx
const formatHours = (value) => {
    if (value === null || value === undefined) return '—';
    return Number(value).toFixed(1);
};
```

Pagination is identical to `MaterialsTable`: read `links.prev` and `links.next` from the paginator object, render enabled `<Link>` for each that exists and a greyed disabled `<span>` for each that does not. Show "Page X of Y (Z total)" counter at left.

Empty state: when `data.length === 0`, render a single `<TableRow>` with a `<TableCell colSpan={7}>` containing `"No tools found."` centred in gray.

```jsx
function ToolsTable({ tools }) {
    const { data, links } = tools;
    const prevLink = links?.prev;
    const nextLink = links?.next;

    return (
        <div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Usage Hours</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-400 py-10">
                                    No tools found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((tool) => (
                                <TableRow key={tool.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/tools/${tool.id}`}
                                            className="text-amber-700 hover:text-amber-900 hover:underline"
                                        >
                                            {tool.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.brand ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.model_number ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.category?.name ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tool.location ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-gray-700">
                                        {formatHours(tool.total_usage_hours)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/tools/${tool.id}/edit`}
                                            className="text-sm text-gray-500 hover:text-gray-900"
                                        >
                                            Edit
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {(prevLink || nextLink) && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                        Page {tools.current_page} of {tools.last_page} ({tools.total} total)
                    </span>
                    <div className="flex gap-2">
                        {prevLink ? (
                            <Link
                                href={prevLink}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Previous
                            </Link>
                        ) : (
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                                Previous
                            </span>
                        )}
                        {nextLink ? (
                            <Link
                                href={nextLink}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Next
                            </Link>
                        ) : (
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                                Next
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
```

### 4.4 Main export: `ToolsIndex`

Props: `{ tools, filters, categories }`

- `tools`: Laravel paginator object with `data[]`, `current_page`, `last_page`, `total`, `links`
- `filters`: object with `search` and `category` keys (may be undefined/null when no filters active)
- `categories`: array of `{ id, name }` objects for the category select

```jsx
export default function ToolsIndex({ tools, filters, categories }) {
    const debounceTimer = useRef(null);

    const navigate = useCallback((params) => {
        router.get('/tools', params, { preserveState: true, replace: true });
    }, []);

    const currentFilters = {
        search:   filters?.search   ?? '',
        category: filters?.category ?? '',
    };

    const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));

    const handleSearchChange = useCallback(
        (e) => {
            const value = e.target.value;
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                navigate({ ...currentFilters, search: value || undefined });
            }, 300);
        },
        [currentFilters, navigate],
    );

    const handleCategoryChange = useCallback(
        (e) => {
            navigate({ ...currentFilters, category: e.target.value || undefined });
        },
        [currentFilters, navigate],
    );

    return (
        <AppLayout>
            <Head title="Tools" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Page header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Tools</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {tools.total} tool{tools.total !== 1 ? 's' : ''} total
                            </p>
                        </div>
                        <Link href="/tools/create">
                            <Button variant="default" size="md">
                                + New Tool
                            </Button>
                        </Link>
                    </div>

                    {/* Filter bar */}
                    <div className="mb-5">
                        <FilterBar
                            filters={currentFilters}
                            categoryOptions={categoryOptions}
                            onSearchChange={handleSearchChange}
                            onCategoryChange={handleCategoryChange}
                        />
                    </div>

                    {/* Table */}
                    <ToolsTable tools={tools} />
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## 5. Decisions with Rationale

| Decision | Choice | Rationale |
|---|---|---|
| No supplier filter | Omitted | The tools schema has no `supplier_id` field. Tools have only a `category_id` foreign key. Spec confirms filter bar has only search + category. |
| Name link URL | `/tools/{tool.id}` using ULID | Tools use ULID for route binding (per CLAUDE.md convention for non-project models). No slug field exists on `Tool`. |
| Edit link URL | `/tools/{tool.id}/edit` | Same ULID binding, matching `Route::resource('tools', ToolController::class)`. |
| `model_number` column label | "Model" | The database column is `model_number`; the UI spec says "Model". The column head reads "Model" while the cell accesses `tool.model_number`. |
| `formatHours` helper | `Number(value).toFixed(1)` | `total_usage_hours` is `decimal(10,2)` in MySQL, serialized as a string. One decimal place is sufficient for hours display and matches workshop context. Returns `—` for null. |
| Empty string filters cleared to `undefined` | `value || undefined` in navigate calls | Prevents empty string query params (`?search=`, `?category=`) from appearing in the URL, keeping URLs clean and consistent with how the backend expects absent filters. |
| `useRef` for debounce timer | Same pattern as `Materials/Index.jsx` | Avoids re-renders on timer updates; ref persists across renders without triggering effects. |
| `categoryOptions` mapped in main export | `(categories ?? []).map(...)` | Keeps `FilterBar` a pure display component that accepts pre-mapped options. Nullish coalescing guards against the controller stub passing no `categories` prop. |

---

## 6. Verified Dependencies

All the following are confirmed to exist in the codebase:

| Dependency | Location | Status |
|---|---|---|
| `AppLayout` | `resources/js/Layouts/AppLayout.jsx` | Confirmed present |
| `Button` (with `variant`, `size` props) | `resources/js/Components/ui/Button.jsx` | Confirmed; `variant="default"` renders amber-600 button |
| `Input` (with `type`, `defaultValue`, `onChange`) | `resources/js/Components/ui/Input.jsx` | Confirmed; `forwardRef` wrapped |
| `Select` (with `options`, `placeholder`, `value`, `onChange`) | `resources/js/Components/ui/Select.jsx` | Confirmed; `options` must be `[{ value, label }]` array |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `resources/js/Components/ui/Table.jsx` | Confirmed; all six named exports present |
| `Link`, `Head`, `router` from `@inertiajs/react` | npm package | Confirmed in use by `Materials/Index.jsx` |
| Existing stub `Tools/Index.jsx` | `resources/js/Pages/Tools/Index.jsx` | Confirmed; 16-line stub with `{ tools, categories }` props already declared |
| Route `GET /tools` | `routes/web.php` | Requires confirmation; expected as `Route::resource('tools', ToolController::class)` |
| Route `GET /tools/create` | Same resource route | Requires confirmation |
| Route `GET /tools/{tool}/edit` | Same resource route | Requires confirmation; binds by ULID |

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Controller `index()` does not yet pass `tools`, `filters`, `categories` props | High — controller is likely a stub | Use nullish coalescing throughout (`?? []`, `?? {}`, `?? ''`) so the page renders without errors when props are absent. The page will show an empty table gracefully. |
| `tools` prop is undefined (controller passes nothing) | Medium | Wrap all `tools.*` accesses with optional chaining or a default value: `tools?.total ?? 0`, `tools?.data ?? []`. Consider a fallback at the top of the component body. |
| `model_number` field name differs from spec label "Model" | Low | Confirmed in schema: database column is `model_number`. The UI head uses "Model" for brevity. No mismatch in data access. |
| `total_usage_hours` precision display | Low | The spec says "Usage Hours" with no formatting requirement. Displaying one decimal place (`toFixed(1)`) is readable and safe. If the team prefers raw value, `String(tool.total_usage_hours)` also works but may show trailing zeros (e.g., `0.00`). |
| Name link 404s if Show page does not yet exist | Low | `Tools/Show.jsx` exists in the filesystem (confirmed via glob). Whether the controller `show()` method is implemented is a separate concern outside this task's scope. |
| Route name for `tools/create` | Low | If `Route::resource` is used, `GET /tools/create` is the standard create route. If the route is missing or named differently, the "+ New Tool" link will 404 but will not cause a JS error. |

---

## 8. Acceptance Criteria Coverage

| Criterion from task spec | How it is satisfied |
|---|---|
| Page header: "Tools" title | `<h1>Tools</h1>` in main export |
| Page header: total count | `{tools.total} tool{s}` paragraph below h1 |
| Page header: "+ New Tool" button | `<Link href="/tools/create"><Button>+ New Tool</Button></Link>` |
| Filter bar: debounced search (300ms) | `handleSearchChange` with `useRef` timer, 300ms delay, `preserveState: true` |
| Filter bar: category Select | `<Select options={categoryOptions} value={filters.category}>` in `FilterBar` |
| Filter navigation | `router.get('/tools', params, { preserveState: true, replace: true })` in `navigate()` |
| Table column: Name (amber link to /tools/{id}) | `<Link href="/tools/{tool.id}" className="text-amber-700 ...">` |
| Table column: Brand | `tool.brand ?? '—'` |
| Table column: Model | `tool.model_number ?? '—'` |
| Table column: Category | `tool.category?.name ?? '—'` |
| Table column: Location | `tool.location ?? '—'` |
| Table column: Usage Hours | `formatHours(tool.total_usage_hours)` |
| Table column: Actions (Edit link) | `<Link href="/tools/{tool.id}/edit">Edit</Link>` |
| All nulls display as "—" | `?? '—'` on every nullable field; `formatHours` returns `'—'` for null |
| Pagination: Previous/Next with page info | Links from `tools.links.prev` / `tools.links.next`; disabled spans when absent; "Page X of Y (Z total)" counter |
| Empty state: "No tools found." | `<TableCell colSpan={7}>No tools found.</TableCell>` when `data.length === 0` |
