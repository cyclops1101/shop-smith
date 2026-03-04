# Task 10 Implementation Plan: Page Component Stubs

## 1. Approach

Create 16 stub JSX page components under `resources/js/Pages/`. Each stub renders a minimal but valid React component that:

- Wraps content in `AppLayout` (except `Portfolio/Index.jsx`, which is public-facing and uses no auth layout)
- Accepts the exact prop shape that the corresponding controller will pass via Inertia
- Renders a heading identifying the page and placeholder text

These stubs serve as scaffolding that future phases will fill in with real UI. The primary goal is ensuring every Inertia route has a matching component so that `npm run build` succeeds and controller stubs from Task 06 can render without a "component not found" error.

`Dashboard.jsx` may have been created in Task 05 as part of the base layout work. If it exists, it must be updated to accept the `{ stats }` prop shape. If it does not exist, it will be created here.

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Create or update | `resources/js/Pages/Dashboard.jsx` |
| Create | `resources/js/Pages/Projects/Index.jsx` |
| Create | `resources/js/Pages/Projects/Show.jsx` |
| Create | `resources/js/Pages/Projects/Create.jsx` |
| Create | `resources/js/Pages/Projects/Edit.jsx` |
| Create | `resources/js/Pages/Materials/Index.jsx` |
| Create | `resources/js/Pages/Materials/Show.jsx` |
| Create | `resources/js/Pages/Materials/Create.jsx` |
| Create | `resources/js/Pages/Materials/Edit.jsx` |
| Create | `resources/js/Pages/Tools/Index.jsx` |
| Create | `resources/js/Pages/Tools/Show.jsx` |
| Create | `resources/js/Pages/Tools/Create.jsx` |
| Create | `resources/js/Pages/Tools/Edit.jsx` |
| Create | `resources/js/Pages/Finance/Index.jsx` |
| Create | `resources/js/Pages/CutList/Index.jsx` |
| Create | `resources/js/Pages/Portfolio/Index.jsx` |

Subdirectories `Projects/`, `Materials/`, `Tools/`, `Finance/`, `CutList/`, and `Portfolio/` must be created under `resources/js/Pages/` if they do not already exist. There are no existing files in `resources/js/Pages/` since Breeze has not been installed yet.

## 3. Key Decisions

### Decision 1: Minimal stub structure, not empty shells

Each stub must:
- Import `AppLayout` from `../../Layouts/AppLayout` (or appropriate relative path)
- Destructure the expected props in the function signature
- Return a JSX tree inside `<AppLayout>` with a heading and a paragraph

Empty components (`export default function Foo() { return null }`) would pass the build but would not satisfy the acceptance criterion requiring each page to accept props matching the controller's prop shape.

### Decision 2: AppLayout import path is relative

All pages import `AppLayout` using a relative path. The exact relative path depends on nesting depth:
- Pages at the root (`Dashboard.jsx`): `../Layouts/AppLayout`
- Pages one level deep (`Projects/Index.jsx`): `../../Layouts/AppLayout`

This is consistent with how Breeze auth pages import their layouts.

### Decision 3: Portfolio/Index.jsx uses a bare `<main>` wrapper, not AppLayout

`Portfolio/Index.jsx` is the only public page — it must not require authentication, and its layout must not include the authenticated nav bar. The stub renders a `<main>` element directly. Future phases will style this page as a clean gallery with no auth chrome.

### Decision 4: Component export names match the Inertia component string

Inertia resolves components by the string passed to `Inertia::render()`. For example, `Inertia::render('Projects/Index')` maps to the default export of `resources/js/Pages/Projects/Index.jsx`. The default export name in JSX does not technically need to match, but by convention and for readability it should. Examples: `ProjectsIndex`, `ProjectsShow`, `Dashboard`, `PortfolioIndex`.

### Decision 5: Props are destructured in the function signature

Controllers will pass props as a flat object. Using destructuring in the function signature (`function Dashboard({ stats })`) makes the expected shape explicit and serves as documentation for the next developer who implements the real page.

## 4. Verified Dependencies

- **Task 01 (Breeze install):** Required. `resources/js/Layouts/AppLayout.jsx` is created by Task 05, which depends on Task 01. If Task 05 is not complete, `AppLayout.jsx` will not exist and the import will fail at build time.
- **Task 05 (Frontend Base Layout + UI Primitives):** Required. `AppLayout.jsx` and the `Components/ui/` primitives must exist. Task 10 runs in Group 4 which is after Group 2 (where Task 05 runs), so this dependency is satisfied.
- **Task 06 (Routes + Controller Stubs):** Informational dependency. Task 10 does not call any routes, but the prop shapes are defined by what Task 06 controllers will pass. The prop list in this plan is taken directly from the task manifest and spec.
- **`@inertiajs/react`:** Installed by Task 01 via Breeze. No pages in these stubs need `useForm` or `router` yet — they are display-only stubs. The only Inertia import needed would be `Link` if the AppLayout uses it for nav, but that is AppLayout's concern, not the pages'.

## 5. Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `AppLayout.jsx` does not exist when Task 10 runs | Low | Task 10 is in Group 4; Task 05 (which creates AppLayout) is in Group 2. The manifest enforces this ordering. Implementer must verify Task 05 is complete before starting Task 10. |
| Subdirectory creation fails silently | Very low | Use the file system to create parent directories before writing files. Verify with `ls` after creation. |
| `Dashboard.jsx` already exists from Task 05 with a different prop signature | Medium | Task 05 creates a stub Dashboard with placeholder content. Task 10 must update it to accept `{ stats }` as the prop. Use `Edit` not overwrite to preserve any Task 05 work. |
| Inertia component name mismatch (case sensitivity on Linux) | Low | Linux filesystems are case-sensitive. Ensure the component path passed to `Inertia::render()` in the controller (Task 06) exactly matches the file path. E.g., `'CutList/Index'` must match `CutList/Index.jsx`, not `Cutlist/Index.jsx`. Coordinate with Task 06 implementer. |
| `npm run build` fails due to missing import in AppLayout | Low | AppLayout may import UI primitives that do not exist if Task 05 is not fully complete. Run `npm run build` as the final acceptance check and fix any import errors. |

## 6. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| All 16 page files exist in correct subdirectory under `resources/js/Pages/` | 16 files created, each in its named subdirectory as listed in Files section |
| Every page except `Portfolio/Index.jsx` imports and wraps content in `AppLayout` | 15 pages import `AppLayout` and return `<AppLayout>...</AppLayout>`; `Portfolio/Index.jsx` returns a bare `<main>` |
| `Portfolio/Index.jsx` does NOT use `AppLayout` | `Portfolio/Index.jsx` renders a `<main>` wrapper with no auth-dependent nav |
| Each page function accepts a props object matching the prop shape listed | Every function signature destructures the props listed in the task manifest |
| Page component names match the string passed to `Inertia::render()` in controllers | Default export names correspond to Inertia component strings (e.g., `Projects/Index`) |
| `npm run build` completes without errors | Verified as the final step after creating all 16 files |

---

## Appendix: Page Stubs Detail

### Dashboard.jsx
```jsx
// Props: { stats }
import AppLayout from '../Layouts/AppLayout'

export default function Dashboard({ stats }) {
  return (
    <AppLayout>
      <h1>Dashboard</h1>
      <p>Workshop overview and quick stats will appear here.</p>
    </AppLayout>
  )
}
```

### Projects/Index.jsx
```jsx
// Props: { projects, filters }
import AppLayout from '../../Layouts/AppLayout'

export default function ProjectsIndex({ projects, filters }) {
  return (
    <AppLayout>
      <h1>Projects</h1>
      <p>Project list and filters will appear here.</p>
    </AppLayout>
  )
}
```

### Projects/Show.jsx
```jsx
// Props: { project }
import AppLayout from '../../Layouts/AppLayout'

export default function ProjectsShow({ project }) {
  return (
    <AppLayout>
      <h1>Project: {project?.title ?? 'Loading...'}</h1>
      <p>Project details, time tracking, photos, and notes will appear here.</p>
    </AppLayout>
  )
}
```

### Projects/Create.jsx
```jsx
// Props: { statuses, priorities }
import AppLayout from '../../Layouts/AppLayout'

export default function ProjectsCreate({ statuses, priorities }) {
  return (
    <AppLayout>
      <h1>New Project</h1>
      <p>Project creation form will appear here.</p>
    </AppLayout>
  )
}
```

### Projects/Edit.jsx
```jsx
// Props: { project, statuses, priorities }
import AppLayout from '../../Layouts/AppLayout'

export default function ProjectsEdit({ project, statuses, priorities }) {
  return (
    <AppLayout>
      <h1>Edit Project: {project?.title ?? 'Loading...'}</h1>
      <p>Project edit form will appear here.</p>
    </AppLayout>
  )
}
```

### Materials/Index.jsx
```jsx
// Props: { materials, categories }
import AppLayout from '../../Layouts/AppLayout'

export default function MaterialsIndex({ materials, categories }) {
  return (
    <AppLayout>
      <h1>Materials</h1>
      <p>Materials inventory list and category filters will appear here.</p>
    </AppLayout>
  )
}
```

### Materials/Show.jsx
```jsx
// Props: { material }
import AppLayout from '../../Layouts/AppLayout'

export default function MaterialsShow({ material }) {
  return (
    <AppLayout>
      <h1>Material: {material?.name ?? 'Loading...'}</h1>
      <p>Material detail, stock history, and project usage will appear here.</p>
    </AppLayout>
  )
}
```

### Materials/Create.jsx
```jsx
// Props: { categories, suppliers, units }
import AppLayout from '../../Layouts/AppLayout'

export default function MaterialsCreate({ categories, suppliers, units }) {
  return (
    <AppLayout>
      <h1>Add Material</h1>
      <p>Material creation form will appear here.</p>
    </AppLayout>
  )
}
```

### Materials/Edit.jsx
```jsx
// Props: { material, categories, suppliers, units }
import AppLayout from '../../Layouts/AppLayout'

export default function MaterialsEdit({ material, categories, suppliers, units }) {
  return (
    <AppLayout>
      <h1>Edit Material: {material?.name ?? 'Loading...'}</h1>
      <p>Material edit form will appear here.</p>
    </AppLayout>
  )
}
```

### Tools/Index.jsx
```jsx
// Props: { tools, categories }
import AppLayout from '../../Layouts/AppLayout'

export default function ToolsIndex({ tools, categories }) {
  return (
    <AppLayout>
      <h1>Tools</h1>
      <p>Tool inventory list and category filters will appear here.</p>
    </AppLayout>
  )
}
```

### Tools/Show.jsx
```jsx
// Props: { tool }
import AppLayout from '../../Layouts/AppLayout'

export default function ToolsShow({ tool }) {
  return (
    <AppLayout>
      <h1>Tool: {tool?.name ?? 'Loading...'}</h1>
      <p>Tool detail, maintenance schedules, and logs will appear here.</p>
    </AppLayout>
  )
}
```

### Tools/Create.jsx
```jsx
// Props: { categories }
import AppLayout from '../../Layouts/AppLayout'

export default function ToolsCreate({ categories }) {
  return (
    <AppLayout>
      <h1>Add Tool</h1>
      <p>Tool creation form will appear here.</p>
    </AppLayout>
  )
}
```

### Tools/Edit.jsx
```jsx
// Props: { tool, categories }
import AppLayout from '../../Layouts/AppLayout'

export default function ToolsEdit({ tool, categories }) {
  return (
    <AppLayout>
      <h1>Edit Tool: {tool?.name ?? 'Loading...'}</h1>
      <p>Tool edit form will appear here.</p>
    </AppLayout>
  )
}
```

### Finance/Index.jsx
```jsx
// Props: { expenses, revenues, summary }
import AppLayout from '../../Layouts/AppLayout'

export default function FinanceIndex({ expenses, revenues, summary }) {
  return (
    <AppLayout>
      <h1>Finance</h1>
      <p>Expense and revenue tracking, monthly summaries, and charts will appear here.</p>
    </AppLayout>
  )
}
```

### CutList/Index.jsx
```jsx
// Props: { boards, pieces, result }
import AppLayout from '../../Layouts/AppLayout'

export default function CutListIndex({ boards, pieces, result }) {
  return (
    <AppLayout>
      <h1>Cut List Optimizer</h1>
      <p>Board and piece input, optimization controls, and visual output will appear here.</p>
    </AppLayout>
  )
}
```

### Portfolio/Index.jsx
```jsx
// Props: { photos }
// NOTE: No AppLayout — this is a public page with no authentication requirement.

export default function PortfolioIndex({ photos }) {
  return (
    <main>
      <h1>Portfolio</h1>
      <p>Public photo gallery will appear here.</p>
    </main>
  )
}
```
