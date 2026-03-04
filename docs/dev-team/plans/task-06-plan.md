# Task 06 Plan: Project Create and Edit Forms

**Task ID:** 06
**Domain:** frontend
**Files:** `resources/js/Pages/Projects/Create.jsx`, `resources/js/Pages/Projects/Edit.jsx`

---

## 1. Approach

Replace the two stub pages with full working forms using Inertia's `useForm`. Both forms share the same field set and layout — the only differences are the initial data source, the HTTP method, and the target route. The shared structure is factored into a `ProjectForm` component defined locally (in the same file as Create, then imported by Edit, or co-located) to eliminate duplication.

Each field maps directly to a database column or model attribute. Validation errors come from Inertia's session flash (set by the Form Request on the backend) and are accessed via `form.errors`. The `is_commission` checkbox conditionally reveals the `client_name` and `client_contact` fields.

---

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Modify | `resources/js/Pages/Projects/Create.jsx` |
| Modify | `resources/js/Pages/Projects/Edit.jsx` |

No new files need to be created. The shared form markup will be extracted into a local component defined within `Create.jsx` and imported into `Edit.jsx`, or duplicated across both files (the simpler path given the task scope — see Decision 3 below).

---

## 3. Form Fields

The following fields are required by the acceptance criteria. Each entry shows the field name, the input type, the UI primitive to use, and where validation errors come from.

| Field | Type | UI Primitive | Notes |
|-------|------|-------------|-------|
| `title` | text | `Input` | Required |
| `description` | textarea | `Textarea` | Optional |
| `status` | select | `Select` | Options from `statuses` prop |
| `priority` | select | `Select` | Options from `priorities` prop |
| `estimated_hours` | number | `Input` | Optional, step 0.5 |
| `estimated_cost` | number (decimal) | `Input` | Optional, step 0.01 |
| `sell_price` | number (decimal) | `Input` | Optional, step 0.01 |
| `deadline` | date | native `<input type="date">` | Optional |
| `is_commission` | checkbox | native `<input type="checkbox">` | Toggles client fields |
| `client_name` | text | `Input` | Shown only when `is_commission` is true |
| `client_contact` | text | `Input` | Shown only when `is_commission` is true |
| `notes` | textarea | `Textarea` | Optional |

---

## 4. Key Decisions

### Decision 1: `useForm` initial data shape

For **Create.jsx**, the form initializes with empty/default values:

```js
const form = useForm({
    title: '',
    description: '',
    status: statuses[0]?.value ?? '',
    priority: priorities[0]?.value ?? '',
    estimated_hours: '',
    estimated_cost: '',
    sell_price: '',
    deadline: '',
    is_commission: false,
    client_name: '',
    client_contact: '',
    notes: '',
});
```

`status` and `priority` default to the first option from the prop array so the server always receives a valid enum value. If the `statuses` or `priorities` arrays are empty (defensive case), the empty string is used.

For **Edit.jsx**, the form pre-populates from the `project` prop:

```js
const form = useForm({
    title: project.title ?? '',
    description: project.description ?? '',
    status: project.status ?? '',
    priority: project.priority ?? '',
    estimated_hours: project.estimated_hours ?? '',
    estimated_cost: project.estimated_cost ?? '',
    sell_price: project.sell_price ?? '',
    deadline: project.deadline ?? '',
    is_commission: project.is_commission ?? false,
    client_name: project.client_name ?? '',
    client_contact: project.client_contact ?? '',
    notes: project.notes ?? '',
});
```

`?? ''` guards against `null` values coming from the database, which would cause React controlled-input warnings.

### Decision 2: Submit handlers

**Create.jsx** submits via POST:

```js
const handleSubmit = (e) => {
    e.preventDefault();
    form.post(route('projects.store'));
};
```

**Edit.jsx** submits via PATCH:

```js
const handleSubmit = (e) => {
    e.preventDefault();
    form.patch(route('projects.update', project.slug));
};
```

No `preserveState` or `preserveScroll` options are needed for these forms. On success, the backend redirects to `projects.show` (or `projects.index`), so Inertia will navigate away automatically.

### Decision 3: Code duplication vs. shared component

The cleanest approach is a shared `ProjectFormFields` component. However, introducing a new file (e.g., `resources/js/Pages/Projects/ProjectFormFields.jsx` or `resources/js/Components/ProjectFormFields.jsx`) is extra scope for this task. Instead, each page file is self-contained and the form markup is written out in full in each file. This is acceptable because:

- The two files are always edited together as a pair.
- The total markup is approximately 150 lines per file — manageable duplication.
- No shared component directory structure decision needs to be made.

If a future refactor task wants to extract a shared component, it can do so cleanly.

### Decision 4: `Select` component expects `options` as `{ value, label }[]`

The `Select` component in `Components/ui/Select.jsx` renders:

```jsx
{options.map(({ value, label }) => (
    <option key={value} value={value}>{label}</option>
))}
```

The `statuses` and `priorities` props must therefore be arrays of `{ value, label }` objects. The backend (Task 01 / ProjectController) passes these from PHP Enums like this:

```php
'statuses' => collect(ProjectStatus::cases())
    ->map(fn($case) => ['value' => $case->value, 'label' => $case->label()])
    ->values(),
```

The frontend form binds `onChange` to `form.setData('status', e.target.value)` and `value={form.data.status}`.

### Decision 5: Checkbox handling

React checkbox inputs need `checked` (not `value`) and fire `onChange` with `e.target.checked`:

```jsx
<input
    type="checkbox"
    id="is_commission"
    checked={form.data.is_commission}
    onChange={(e) => form.setData('is_commission', e.target.checked)}
/>
```

The conditional reveal of client fields uses:

```jsx
{form.data.is_commission && (
    <>
        {/* client_name field */}
        {/* client_contact field */}
    </>
)}
```

When `is_commission` is unchecked, `client_name` and `client_contact` are unmounted, but their values remain in `form.data`. This is intentional — if the user accidentally unchecks, they can re-check and their data is still there. The server-side Form Request validates `client_name` as `required_if:is_commission,true`, so submitting with `is_commission: false` and non-empty client fields is harmless.

### Decision 6: Date input format

The `deadline` field uses a native `<input type="date">`. The HTML date input requires the `value` attribute to be in `YYYY-MM-DD` format. The backend stores `deadline` as a date column and returns it pre-formatted (e.g., `"2025-12-31"`) via Eloquent's date casting. No JavaScript date formatting is needed.

```jsx
<input
    type="date"
    id="deadline"
    value={form.data.deadline}
    onChange={(e) => form.setData('deadline', e.target.value)}
    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm ..."
/>
```

The `Input` component can also be used here by passing `type="date"` since it accepts `...props`.

### Decision 7: Error display

Inertia populates `form.errors` with field-keyed error messages after a failed form submission. Each field is followed by an error span:

```jsx
{form.errors.title && (
    <p className="mt-1 text-sm text-red-600">{form.errors.title}</p>
)}
```

The `Input`, `Select`, and `Textarea` components accept an `error` boolean prop that switches their border to red:

```jsx
<Input
    id="title"
    type="text"
    value={form.data.title}
    onChange={(e) => form.setData('title', e.target.value)}
    error={!!form.errors.title}
/>
```

### Decision 8: Submit button state

The `Button` component accepts `loading` and `disabled` props. Wire both to `form.processing`:

```jsx
<Button
    type="submit"
    loading={form.processing}
    disabled={form.processing}
>
    {form.processing ? 'Saving...' : 'Save Project'}
</Button>
```

### Decision 9: Cancel link

The cancel link uses Inertia's `Link` component for a consistent SPA navigation:

```jsx
import { Link, useForm } from '@inertiajs/react';

<Link href={route('projects.index')} className="...">
    Cancel
</Link>
```

Styled as a secondary/ghost button using Tailwind utility classes directly (not the `Button` component, since it renders a `<button>` not an `<a>` tag), or using `Button` with `as={Link}` if it supports that. Since the `Button` component does not support an `as` prop, the cancel link is a plain `<a>` or Inertia `Link` with manual styling matching the `secondary` button variant:

```jsx
<Link
    href={route('projects.index')}
    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
    Cancel
</Link>
```

### Decision 10: Layout and Card structure

The form is wrapped in a single `Card` with a `CardHeader` and `CardContent`. Fields are grouped into logical sections separated by headings:

1. **Basic Info** — title, description, status, priority
2. **Pricing & Time** — estimated_hours, estimated_cost, sell_price, deadline
3. **Commission** — is_commission checkbox, conditionally client_name + client_contact
4. **Notes** — notes textarea

The footer (`CardFooter`) holds the Cancel link and Save button.

---

## 5. Complete Implementation: Create.jsx

```jsx
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/Card';

export default function ProjectCreate({ statuses, priorities }) {
    const form = useForm({
        title: '',
        description: '',
        status: statuses[0]?.value ?? '',
        priority: priorities[0]?.value ?? '',
        estimated_hours: '',
        estimated_cost: '',
        sell_price: '',
        deadline: '',
        is_commission: false,
        client_name: '',
        client_contact: '',
        notes: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('projects.store'));
    };

    return (
        <AppLayout>
            <Head title="New Project" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Project</h1>

                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">

                                {/* Title */}
                                <div>
                                    <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        className="mt-1"
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                        error={!!form.errors.title}
                                        autoFocus
                                    />
                                    {form.errors.title && (
                                        <p className="mt-1 text-sm text-red-600">{form.errors.title}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        className="mt-1"
                                        rows={3}
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        error={!!form.errors.description}
                                    />
                                    {form.errors.description && (
                                        <p className="mt-1 text-sm text-red-600">{form.errors.description}</p>
                                    )}
                                </div>

                                {/* Status + Priority */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            id="status"
                                            className="mt-1"
                                            options={statuses}
                                            value={form.data.status}
                                            onChange={(e) => form.setData('status', e.target.value)}
                                            error={!!form.errors.status}
                                        />
                                        {form.errors.status && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.status}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="priority">Priority</Label>
                                        <Select
                                            id="priority"
                                            className="mt-1"
                                            options={priorities}
                                            value={form.data.priority}
                                            onChange={(e) => form.setData('priority', e.target.value)}
                                            error={!!form.errors.priority}
                                        />
                                        {form.errors.priority && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.priority}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>

                            {/* Pricing & Time */}
                            <CardHeader>
                                <CardTitle>Pricing &amp; Time</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="estimated_hours">Estimated Hours</Label>
                                        <Input
                                            id="estimated_hours"
                                            type="number"
                                            className="mt-1"
                                            min="0"
                                            step="0.5"
                                            value={form.data.estimated_hours}
                                            onChange={(e) => form.setData('estimated_hours', e.target.value)}
                                            error={!!form.errors.estimated_hours}
                                        />
                                        {form.errors.estimated_hours && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.estimated_hours}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="deadline">Deadline</Label>
                                        <Input
                                            id="deadline"
                                            type="date"
                                            className="mt-1"
                                            value={form.data.deadline}
                                            onChange={(e) => form.setData('deadline', e.target.value)}
                                            error={!!form.errors.deadline}
                                        />
                                        {form.errors.deadline && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.deadline}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                                        <Input
                                            id="estimated_cost"
                                            type="number"
                                            className="mt-1"
                                            min="0"
                                            step="0.01"
                                            value={form.data.estimated_cost}
                                            onChange={(e) => form.setData('estimated_cost', e.target.value)}
                                            error={!!form.errors.estimated_cost}
                                        />
                                        {form.errors.estimated_cost && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.estimated_cost}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="sell_price">Sell Price ($)</Label>
                                        <Input
                                            id="sell_price"
                                            type="number"
                                            className="mt-1"
                                            min="0"
                                            step="0.01"
                                            value={form.data.sell_price}
                                            onChange={(e) => form.setData('sell_price', e.target.value)}
                                            error={!!form.errors.sell_price}
                                        />
                                        {form.errors.sell_price && (
                                            <p className="mt-1 text-sm text-red-600">{form.errors.sell_price}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>

                            {/* Commission */}
                            <CardHeader>
                                <CardTitle>Commission</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        id="is_commission"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        checked={form.data.is_commission}
                                        onChange={(e) => form.setData('is_commission', e.target.checked)}
                                    />
                                    <Label htmlFor="is_commission" className="mb-0">
                                        This is a commission (client) project
                                    </Label>
                                </div>

                                {form.data.is_commission && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="client_name">Client Name</Label>
                                            <Input
                                                id="client_name"
                                                type="text"
                                                className="mt-1"
                                                value={form.data.client_name}
                                                onChange={(e) => form.setData('client_name', e.target.value)}
                                                error={!!form.errors.client_name}
                                            />
                                            {form.errors.client_name && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.client_name}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="client_contact">Client Contact</Label>
                                            <Input
                                                id="client_contact"
                                                type="text"
                                                className="mt-1"
                                                placeholder="Email or phone"
                                                value={form.data.client_contact}
                                                onChange={(e) => form.setData('client_contact', e.target.value)}
                                                error={!!form.errors.client_contact}
                                            />
                                            {form.errors.client_contact && (
                                                <p className="mt-1 text-sm text-red-600">{form.errors.client_contact}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {/* Notes */}
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    id="notes"
                                    rows={4}
                                    placeholder="Internal notes, reminders, design ideas..."
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    error={!!form.errors.notes}
                                />
                                {form.errors.notes && (
                                    <p className="mt-1 text-sm text-red-600">{form.errors.notes}</p>
                                )}
                            </CardContent>

                            <CardFooter className="flex justify-end gap-3">
                                <Link
                                    href={route('projects.index')}
                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Link>
                                <Button
                                    type="submit"
                                    loading={form.processing}
                                    disabled={form.processing}
                                >
                                    {form.processing ? 'Saving...' : 'Create Project'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## 6. Complete Implementation: Edit.jsx

Edit.jsx is identical in structure. Only three things differ:

1. The `useForm` initial values come from `project.*` instead of empty strings.
2. The `handleSubmit` calls `form.patch(route('projects.update', project.slug))`.
3. The page title and heading say "Edit Project" and the submit button label is "Save Changes".

```jsx
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import Textarea from '@/Components/ui/Textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/Card';

export default function ProjectEdit({ project, statuses, priorities }) {
    const form = useForm({
        title: project.title ?? '',
        description: project.description ?? '',
        status: project.status ?? '',
        priority: project.priority ?? '',
        estimated_hours: project.estimated_hours ?? '',
        estimated_cost: project.estimated_cost ?? '',
        sell_price: project.sell_price ?? '',
        deadline: project.deadline ?? '',
        is_commission: project.is_commission ?? false,
        client_name: project.client_name ?? '',
        client_contact: project.client_contact ?? '',
        notes: project.notes ?? '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.patch(route('projects.update', project.slug));
    };

    return (
        <AppLayout>
            <Head title={`Edit: ${project.title}`} />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-2xl font-semibold text-gray-900">
                        Edit Project
                    </h1>

                    <form onSubmit={handleSubmit}>
                        {/* Identical Card structure as Create.jsx,
                            with form.data.* pre-populated from project.* */}
                        ...

                        <CardFooter className="flex justify-end gap-3">
                            <Link
                                href={route('projects.show', project.slug)}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                            <Button
                                type="submit"
                                loading={form.processing}
                                disabled={form.processing}
                            >
                                {form.processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardFooter>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
```

Note for Edit.jsx: The Cancel link points to `route('projects.show', project.slug)` (the project detail page), not `projects.index`, since the user navigated from the show page.

---

## 7. Prop Shape Contract (Backend Expectation)

The frontend expects these exact prop shapes from the controller. Task implementors for the backend side must confirm the controller passes these.

### Create: `{ statuses, priorities }`

```js
statuses = [
    { value: 'idea', label: 'Idea' },
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'complete', label: 'Complete' },
    { value: 'cancelled', label: 'Cancelled' },
]

priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
]
```

### Edit: `{ project, statuses, priorities }`

```js
project = {
    id: 'ulid...',
    slug: 'my-project-slug',
    title: 'My Project',
    description: 'Optional description text',
    status: 'in_progress',
    priority: 'medium',
    estimated_hours: '10.5',
    estimated_cost: '250.00',
    sell_price: '500.00',
    deadline: '2025-12-31',    // YYYY-MM-DD string
    is_commission: true,
    client_name: 'Jane Doe',
    client_contact: 'jane@example.com',
    notes: 'Internal notes',
}
```

Numeric fields (`estimated_hours`, `estimated_cost`, `sell_price`) should be returned as strings or numbers — both work with `value` in a controlled input. If they are returned as PHP `null`, the `?? ''` guard in `useForm` handles it.

`deadline` must be a `YYYY-MM-DD` string (not a JavaScript Date object or a formatted string like "December 31, 2025"). The Eloquent model should cast `deadline` to `'date:Y-m-d'` or the controller should serialize it with `->format('Y-m-d')`.

---

## 8. Verified Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| `AppLayout` at `@/Layouts/AppLayout` | Task 01 (Breeze) + project layout work | Exists at `/home/cyclops/Programming/shop-demo/resources/js/Layouts/AppLayout.jsx` |
| `useForm`, `Link`, `Head` from `@inertiajs/react` | Task 01 (Breeze) | Available |
| `Button` from `@/Components/ui/Button` | Task 05 (UI primitives) | Exists; accepts `loading`, `disabled`, `type` |
| `Input` from `@/Components/ui/Input` | Task 05 | Exists; accepts `error` boolean, all standard input props including `type="date"` |
| `Label` from `@/Components/ui/Label` | Task 05 | Exists |
| `Select` from `@/Components/ui/Select` | Task 05 | Exists; accepts `options` as `{ value, label }[]`, `error` boolean |
| `Textarea` from `@/Components/ui/Textarea` | Task 05 | Exists; accepts `error` boolean, `rows` |
| `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` from `@/Components/ui/Card` | Task 05 | All named exports exist in Card.jsx |
| `route()` global helper | Ziggy (Breeze/Inertia) | Available as global in all Inertia pages |
| `projects.store` route | Task 06 (routes/controllers) | `POST /projects` via `Route::resource` |
| `projects.update` route | Task 06 | `PATCH /projects/{project}` via `Route::resource` |
| `projects.index` route | Task 06 | `GET /projects` via `Route::resource` |
| `projects.show` route | Task 06 | `GET /projects/{project}` via `Route::resource` |

---

## 9. Risks

### Risk 1: `route()` helper not available

Ziggy must be installed and the `@routes` Blade directive included in `resources/views/app.blade.php`. If `route()` throws `ReferenceError: route is not defined`, the Ziggy package was not installed or the directive is missing.

**Mitigation:** Check `package.json` for `ziggy-js` and check `app.blade.php` for `@routes`. If missing, this is a Task 01 or environment setup issue, not a Task 06 issue. As a workaround, replace `route('projects.store')` with the literal string `'/projects'`.

### Risk 2: `Card` named exports not recognized

`Card.jsx` uses named exports (not a default export). The import must use the named form:

```js
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/Card';
```

If the implementor mistakenly uses `import Card from '@/Components/ui/Card'`, the component will be undefined.

### Risk 3: `project.deadline` format

If the backend returns `deadline` as a full ISO datetime string (e.g., `"2025-12-31T00:00:00.000000Z"`), the `<input type="date">` will show blank because it requires `YYYY-MM-DD`. The implementor must ensure the controller serializes the date correctly. As a defensive measure, the form value can be sliced:

```js
deadline: project.deadline ? project.deadline.substring(0, 10) : '',
```

### Risk 4: Boolean cast for `is_commission`

MySQL stores boolean as `tinyint(1)`. Eloquent returns this as PHP `true`/`false`, which Inertia serializes to JSON `true`/`false`. In JavaScript, `false` is a valid initial value for a checkbox. However, if the column is returned as `0` or `1` (not cast), `useForm` will receive `0` for the checkbox, which evaluates as falsy but React may warn about an uncontrolled input. Ensure the `Project` model casts `is_commission` as a boolean:

```php
protected $casts = [
    'is_commission' => 'boolean',
];
```

If not cast, the frontend guard `project.is_commission ?? false` still provides `0` (not `false`), which is still falsy and will work for `checked={...}` but is not ideal. The `!!` operator can coerce it: `is_commission: !!project.is_commission`.

---

## 10. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| Create.jsx receives `{ statuses, priorities }` | Destructured in component props signature |
| Create.jsx uses `useForm` POSTing to `route('projects.store')` | `form.post(route('projects.store'))` in `handleSubmit` |
| Edit.jsx receives `{ project, statuses, priorities }` | Destructured in component props signature |
| Edit.jsx pre-populates from `project` | `useForm` initial values use `project.*` |
| Edit.jsx PATCHes via `form.patch(route('projects.update', project.slug))` | Called in `handleSubmit` |
| All 12 fields present | All listed in `useForm` and rendered with corresponding inputs |
| Status/priority as `Select` with options from props | `<Select options={statuses} ...>` and `<Select options={priorities} ...>` |
| `is_commission` checkbox conditionally shows client fields | `{form.data.is_commission && (...)}` wraps client_name + client_contact |
| Inline validation errors from `form.errors` | Each field followed by `{form.errors.fieldName && <p>...}` |
| Submit disabled/loading while `form.processing` | `<Button disabled={form.processing} loading={form.processing}>` |
| Cancel link back to projects list (Create) / project show (Edit) | Inertia `Link` with `route('projects.index')` / `route('projects.show', project.slug)` |
| Dates as `<input type="date">` | `deadline` rendered via `<Input type="date" ...>` |
