# Task Manifest — Workshop Manager Phase 2: Project Tracker

**Generated:** 2026-03-03
**Scope:** Phase 2 — Full project CRUD, Kanban board, persistent timer, photo upload, notes, detail page
**Total Tasks:** 10
**Parallel Groups:** 4

---

## Dependency Overview

```
Group 1 (no deps):    Task 01 — Project CRUD Backend (index, create/store, edit/update, destroy)
                      Task 02 — Photo Upload Backend (uploadPhoto + Intervention Image service)
                      Task 03 — Time Entry Backend (logTime, stopTimer; active-timer shared data)
                      Task 04 — Notes and Material Attachment Backend (addNote, attachMaterial)

Group 2 (→ T01):      Task 05 — Project List Page with filters/search (index + Kanban board view)
                      Task 06 — Project Create and Edit Forms

Group 3 (→ T01+T02+T03+T04):
                      Task 07 — Project Detail Page (show; all related data sections)

Group 4 (→ T03):      Task 08 — Persistent Timer Widget (AppLayout nav bar; start/stop/resume)

Group 4 (→ T01):      Task 09 — Project CRUD Feature Tests (full coverage for all actions)

Group 4 (→ T02+T03+T04):
                      Task 10 — Sub-resource Feature Tests (photo, time, notes, materials)
```

---

## Group 1 — No Dependencies (Backend Only)

### Task 01: Project CRUD Backend
- **Description:** Implement the four CRUD controller methods (index, create, store, show stub, edit, update, destroy) on `ProjectController`. The `show()` method only needs to pass the project; its full detail rendering is Task 07. All methods use existing Form Requests. Add a `scopeFilter` query scope or inline query logic to support filtering by status, priority, and search term. The index action uses Laravel Scout's `Project::search()` when a search term is present, falling back to Eloquent. Pass enum option arrays (statuses, priorities) to create/edit responses.
- **Domain:** backend
- **Dependencies:** none
- **Parallel Group:** 1
- **Acceptance Criteria:**
  - `index()` queries projects, accepts `?search=`, `?status=`, `?priority=` query params, paginates (15/page), passes `{ projects, filters }` to `Inertia::render('Projects/Index')`
  - `create()` passes `{ statuses, priorities }` to `Inertia::render('Projects/Create')`
  - `store()` uses `StoreProjectRequest`, calls `Project::create()` with validated data, redirects to `projects.show` on success with a flash success message
  - `show()` loads the project by slug and passes `{ project }` to `Inertia::render('Projects/Show')`
  - `edit()` passes `{ project, statuses, priorities }` to `Inertia::render('Projects/Edit')`
  - `update()` uses `UpdateProjectRequest`, calls `$project->update()`, redirects to `projects.show` with flash success
  - `destroy()` soft-deletes the project, redirects to `projects.index` with flash success
  - Status and priority options are derived from `ProjectStatus::cases()` / `ProjectPriority::cases()` using the enum's `label()` method
  - `HandleInertiaRequests` already shares `flash` data; no extra flash sharing needed in controller
- **Expected Files:**
  - `app/Http/Controllers/ProjectController.php` (modify: index, create, store, show, edit, update, destroy)
- **Complexity:** M
- **Status:** pending

---

### Task 02: Photo Upload Backend
- **Description:** Implement `ProjectController::uploadPhoto()` using `StoreProjectPhotoRequest`. Create a dedicated `PhotoUploadService` class that uses Intervention Image v3 (`ImageManager::gd()`) to generate a 400px-wide thumbnail. Store originals under `storage/app/public/projects/{project_id}/photos/` and thumbnails under `storage/app/public/projects/{project_id}/thumbnails/`. Use `Storage::disk('public')` for all file operations. Create the `ProjectPhoto` record with `file_path`, `thumbnail_path`, `caption`, and a `sort_order` that is one greater than the current max for that project.
- **Domain:** backend
- **Dependencies:** none
- **Parallel Group:** 1
- **Acceptance Criteria:**
  - `uploadPhoto()` uses `StoreProjectPhotoRequest` for validation
  - Uploaded file is stored at `projects/{project_id}/photos/{ulid}.{ext}` on the `public` disk
  - Thumbnail is generated at 400px width (aspect ratio preserved) using Intervention Image v3 `ImageManager::gd()` and `Image::read()`
  - Thumbnail stored at `projects/{project_id}/thumbnails/{ulid}.jpg`
  - A `ProjectPhoto` record is created with both paths, caption, and correct `sort_order`
  - `sort_order` is `(max existing sort_order for project) + 1`, defaulting to 0 when no photos exist
  - Response redirects back to `projects.show` with flash success message
  - `PhotoUploadService` is injected into the controller via the constructor or method injection
  - `intervention/image` is already in `composer.json`; the service class must use `ImageManager::gd()` (v3 API), NOT the v2 `Image::make()` facade
- **Expected Files:**
  - `app/Services/PhotoUploadService.php` (create)
  - `app/Http/Controllers/ProjectController.php` (modify: uploadPhoto)
- **Complexity:** M
- **Status:** pending

---

### Task 03: Time Entry Backend and Active Timer Shared Data
- **Description:** Implement `ProjectController::logTime()` and `ProjectController::stopTimer()`. `logTime()` creates a `TimeEntry` record; if `ended_at` is null, the entry represents a running timer (started_at set, ended_at null, duration_minutes null). `stopTimer()` sets `ended_at = now()` and computes `duration_minutes` using Carbon diff. Extend `HandleInertiaRequests::share()` to expose the currently running timer entry (the authenticated user's active `TimeEntry` where `ended_at IS NULL`) as `activeTimer` in the shared Inertia props so the nav bar widget can display it globally.
- **Domain:** backend
- **Dependencies:** none
- **Parallel Group:** 1
- **Acceptance Criteria:**
  - `logTime()` uses `LogTimeRequest`, creates `TimeEntry` with `project_id`, `started_at`, `ended_at`, `description`, and `duration_minutes`
  - When `ended_at` is provided, `duration_minutes` is computed as the diff in minutes if not sent by the client; when `ended_at` is null, duration is null (running timer)
  - Only one running timer can exist at a time: before creating a new running entry, any existing entry with `ended_at IS NULL` for any project belonging to this installation is stopped automatically (set `ended_at = now()`, compute duration)
  - `stopTimer()` accepts the `{project}` and `{entry}` route parameters (both already registered in `routes/web.php`), sets `ended_at = now()`, sets `duration_minutes = Carbon::parse($entry->started_at)->diffInMinutes(now())`, saves, redirects back with flash success
  - `HandleInertiaRequests::share()` adds `activeTimer` key: `null` when unauthenticated or no running timer; when running, includes `{ id, project_id, project_slug, project_title, started_at }` with enough data for the widget
  - `TimeEntry` model already has `const UPDATED_AT = null` — do not add `updated_at`
- **Expected Files:**
  - `app/Http/Controllers/ProjectController.php` (modify: logTime, stopTimer)
  - `app/Http/Middleware/HandleInertiaRequests.php` (modify: share activeTimer)
- **Complexity:** M
- **Status:** pending

---

### Task 04: Notes and Material Attachment Backend
- **Description:** Implement `ProjectController::addNote()` and `ProjectController::attachMaterial()`. `addNote()` creates a `ProjectNote` record. `attachMaterial()` uses the BelongsToMany `sync`/`attach` approach on the project's `materials()` relationship. When the same material is attached twice, update its `quantity_used` (increment or replace per the request). Also compute and store `cost_at_time` from the material's current `unit_cost * quantity_used` at the time of attachment.
- **Domain:** backend
- **Dependencies:** none
- **Parallel Group:** 1
- **Acceptance Criteria:**
  - `addNote()` uses `AddNoteRequest`, creates `ProjectNote` with `project_id` and `content`, redirects back to `projects.show` with flash success
  - `attachMaterial()` uses `AttachMaterialRequest`, attaches or updates the `project_materials` pivot row
  - If the material is not yet attached, call `$project->materials()->attach($materialId, [...])`; if already attached, call `$project->materials()->updateExistingPivot($materialId, [...])`
  - `cost_at_time` stored on the pivot is `material->unit_cost * quantity_used` (may be null if `unit_cost` is null)
  - Both actions redirect back to `projects.show` with a flash success message
  - `ProjectNote` model uses `HasUlids` — do not manually set the `id`
  - `ProjectMaterial` pivot uses `HasUlids` — the ULID is generated by `HasUlids` on create; do not pass `id` to attach/sync calls
- **Expected Files:**
  - `app/Http/Controllers/ProjectController.php` (modify: addNote, attachMaterial)
- **Complexity:** S
- **Status:** pending

---

## Group 2 — Depends on Task 01

### Task 05: Project List Page with Filters and Kanban Board
- **Description:** Build the `Projects/Index.jsx` page with two views: a list/table view and a Kanban board view. The list view renders projects in a `Table` component with columns for title, status badge, priority badge, deadline, and an action link to the detail page. The Kanban board groups projects by status column, rendering a `Card` per project. Include a filter bar at the top with a search text input (debounced, triggers `router.get` with updated query params), a status `Select` filter, and a priority `Select` filter. Filters persist in the URL query string via Inertia's `router.get(..., { preserveState: true })`.
- **Domain:** frontend
- **Dependencies:** Task 01
- **Parallel Group:** 2
- **Acceptance Criteria:**
  - Page receives `{ projects, filters }` props from the controller (projects is a Laravel paginator object serialized by Inertia)
  - A toggle button switches between list view and board (Kanban) view; state is local (not URL-persisted)
  - List view renders all projects in a `Table` with columns: Title (link to show page), Status (Badge), Priority (Badge), Deadline, Actions
  - Board view renders one column per `ProjectStatus` enum value; each column contains project `Card`s for projects in that status; empty columns are shown with a zero-count label
  - Search input is debounced (300ms) and triggers `router.get('/projects', { search: value, ...otherFilters }, { preserveState: true, replace: true })`
  - Status and priority `Select` filters trigger immediate `router.get` on change
  - Filter values are pre-populated from the `filters` prop on mount
  - A "New Project" `Button` links to `/projects/create`
  - Status badge colors: planned=gray, designing=blue, in_progress=amber, finishing=purple, on_hold=yellow, completed=green, archived=slate
  - Priority badge colors: low=gray, medium=blue, high=orange, urgent=red
  - Uses only existing UI primitives: `Table`, `Card`, `Badge`, `Button`, `Select`, `Input`
- **Expected Files:**
  - `resources/js/Pages/Projects/Index.jsx` (modify: full implementation)
- **Complexity:** L
- **Status:** pending

---

### Task 06: Project Create and Edit Forms
- **Description:** Build `Projects/Create.jsx` and `Projects/Edit.jsx` as full working forms using Inertia's `useForm` hook. Both forms share the same field set. The create form POSTs to `/projects`; the edit form PATCHes to `/projects/{slug}`. Include all fillable project fields: title, description, status, priority, estimated_hours, estimated_cost, sell_price, deadline, is_commission (checkbox), client_name, client_contact, and notes (textarea). Show inline validation errors via `form.errors`. Display a loading state on the submit button while `form.processing` is true.
- **Domain:** frontend
- **Dependencies:** Task 01
- **Parallel Group:** 2
- **Acceptance Criteria:**
  - `Create.jsx` receives `{ statuses, priorities }` props; renders a form that `useForm` POSTs to `route('projects.store')` via `form.post()`
  - `Edit.jsx` receives `{ project, statuses, priorities }` props; pre-populates form data from `project`; submits via `form.patch(route('projects.update', project.slug))`
  - All fields render with proper `Label` and input components from `Components/ui/`
  - Status and priority render as `Select` components with options from the `statuses` / `priorities` props
  - `is_commission` renders as a checkbox; when checked, client_name and client_contact fields become visible (conditional render)
  - Inline validation errors render below each field using the `form.errors` object
  - Submit button shows a spinner and is disabled while `form.processing` is true (Button `loading` prop)
  - A "Cancel" link navigates back to the project list
  - Both pages wrap content in `AppLayout` with an appropriate `title` prop
  - Dates render as `<input type="date">` with the `Input` primitive
- **Expected Files:**
  - `resources/js/Pages/Projects/Create.jsx` (modify: full implementation)
  - `resources/js/Pages/Projects/Edit.jsx` (modify: full implementation)
- **Complexity:** M
- **Status:** pending

---

## Group 3 — Depends on Tasks 01, 02, 03, 04

### Task 07: Project Detail Page
- **Description:** Build the full `Projects/Show.jsx` detail page and update `ProjectController::show()` to eager-load all related data. The page is divided into tabbed or sectioned panels: Overview (project metadata), Photos, Notes, Time Log, Materials, and Expenses/Revenue. Each section renders its data and includes the inline action forms needed to add more (add note form, log time form, attach material form, upload photo form). Markdown in notes is rendered client-side using a lightweight approach (convert `\n` to `<br>` and wrap in a `<pre>` or use a simple renderer — no extra npm packages).
- **Domain:** fullstack
- **Dependencies:** Task 01, Task 02, Task 03, Task 04
- **Parallel Group:** 3
- **Acceptance Criteria:**
  - `ProjectController::show()` eager-loads: `photos` (ordered by sort_order), `notes` (ordered by created_at desc), `timeEntries` (ordered by started_at desc), `materials` (with pivot data), `expenses` (ordered by expense_date desc), `revenues` (ordered by received_date desc)
  - Controller passes `{ project }` with all nested relations serialized (Inertia handles JSON serialization)
  - Page header shows title, status badge, priority badge, and Edit / Delete buttons
  - Delete button triggers `router.delete(route('projects.destroy', project.slug))` with a `window.confirm` guard
  - Overview section shows: description, estimated_hours, estimated_cost, sell_price, started_at, completed_at, deadline, is_commission flag, client_name, client_contact, notes field
  - Photos section: thumbnail grid; each thumbnail links to the full image (storage URL); an upload form with file input and optional caption using `useForm` and `form.post(route('projects.upload-photo', project.slug))`; upload form uses `forceFormData: true` in the `useForm` options
  - Notes section: list of notes newest-first; note content rendered preserving whitespace; an "Add Note" textarea form using `useForm` and `form.post(route('projects.add-note', project.slug))`
  - Time Log section: table of time entries with started_at, ended_at, duration (formatted as Xh Ym), description; total hours shown; a "Log Time" form with started_at datetime input, optional ended_at, and description; a "Start Timer" shortcut button that submits with `started_at = now()` and no `ended_at`
  - Materials section: table showing material name, quantity_used, cost_at_time, notes; an "Attach Material" form with a material select (populated from a `materials` prop of all available materials), quantity input, and notes input; controller must pass `{ materials: Material::all(['id','name','unit']) }` in addition to project data
  - Expenses section: table of linked expenses with description, category, amount, date
  - Revenues section: table of linked revenues with description, amount, date
  - All inline action forms redirect back to the same show page; flash messages display using the `Alert` component reading from `usePage().props.flash`
  - Photos stored in public storage are accessible via `/storage/projects/{id}/photos/{file}` URLs (requires `php artisan storage:link` to have been run)
- **Expected Files:**
  - `app/Http/Controllers/ProjectController.php` (modify: show — add eager loads and pass materials list)
  - `resources/js/Pages/Projects/Show.jsx` (modify: full implementation)
- **Complexity:** L
- **Status:** pending

---

## Group 4 — Depends on Task 03

### Task 08: Persistent Timer Widget in AppLayout
- **Description:** Replace the static `00:00:00` placeholder in `AppLayout.jsx` with a live timer widget. The widget reads `activeTimer` from `usePage().props.activeTimer`. When no active timer exists, it shows `00:00:00` in gray. When a timer is running, it ticks up every second using `setInterval` inside a `useEffect`, computing elapsed time from `activeTimer.started_at` to the current client time. The widget shows the elapsed time in `HH:MM:SS` format in amber. Clicking the widget when a timer is running navigates to the linked project's show page via `router.visit`. The widget is purely a display widget — starting and stopping timers is done from the project detail page (Task 07).
- **Domain:** frontend
- **Dependencies:** Task 03
- **Parallel Group:** 4
- **Acceptance Criteria:**
  - `activeTimer` is read from `usePage().props.activeTimer`
  - When `activeTimer` is null, widget displays `00:00:00` in a gray, non-interactive style
  - When `activeTimer` is set, widget displays elapsed time that ticks up every second
  - Elapsed time computed as `Date.now() - new Date(activeTimer.started_at).getTime()` converted to H:MM:SS
  - `setInterval` is started when `activeTimer` becomes non-null and cleared via `useEffect` cleanup when it becomes null or the component unmounts
  - When `activeTimer` is set, widget renders as a clickable element that calls `router.visit('/projects/' + activeTimer.project_slug)`
  - Widget displays on both desktop (right of nav) and mobile (left of hamburger) — both existing placeholder locations
  - When running, the elapsed time text uses amber color to distinguish from idle state
  - No extra npm packages needed — use vanilla JS `Date` arithmetic
- **Expected Files:**
  - `resources/js/Layouts/AppLayout.jsx` (modify: replace static timer with live widget)
- **Complexity:** M
- **Status:** pending

---

## Group 4 — Depends on Task 01

### Task 09: Project CRUD Feature Tests
- **Description:** Expand `ProjectControllerTest` with comprehensive feature tests for all CRUD actions. Tests cover: authentication guard, successful creation with valid data, validation failures, successful update, soft delete, and Inertia component assertions. All tests use `RefreshDatabase` and `Project::factory()`. Use `assertInertia` for Inertia response assertions.
- **Domain:** backend
- **Dependencies:** Task 01
- **Parallel Group:** 4
- **Acceptance Criteria:**
  - Test: unauthenticated GET `/projects` redirects to login (already exists — keep it)
  - Test: authenticated GET `/projects` returns Inertia component `Projects/Index` with `projects` and `filters` props
  - Test: GET `/projects?search=foo` returns filtered results (at minimum, does not 500)
  - Test: GET `/projects?status=planned` returns filtered results
  - Test: GET `/projects/create` returns Inertia component `Projects/Create` with `statuses` and `priorities` props
  - Test: POST `/projects` with valid data creates a project and redirects to show page
  - Test: POST `/projects` with missing title returns 422 with validation errors
  - Test: GET `/projects/{slug}` returns Inertia component `Projects/Show` with `project` prop containing the project data
  - Test: GET `/projects/{slug}/edit` returns Inertia component `Projects/Edit` with `project`, `statuses`, `priorities` props
  - Test: PATCH `/projects/{slug}` with valid data updates the project and redirects
  - Test: PATCH `/projects/{slug}` with invalid status enum value returns 422
  - Test: DELETE `/projects/{slug}` soft-deletes and redirects to index; project is not found in DB with `Project::all()` but is found with `Project::withTrashed()`
  - All tests use `#[Test]` attribute (PHPUnit 11 style — no `/** @test */` docblock)
  - All tests use `RefreshDatabase` trait
- **Expected Files:**
  - `tests/Feature/ProjectControllerTest.php` (modify: add all new test methods)
- **Complexity:** M
- **Status:** pending

---

## Group 4 — Depends on Tasks 02, 03, 04

### Task 10: Sub-resource Feature Tests (Photo, Time, Notes, Materials)
- **Description:** Create `tests/Feature/ProjectSubResourceTest.php` with feature tests for the five sub-resource controller actions: `uploadPhoto`, `logTime`, `stopTimer`, `addNote`, and `attachMaterial`. Tests verify HTTP responses, database state, and redirect behavior. Mock file storage using `Storage::fake('public')` for photo tests.
- **Domain:** backend
- **Dependencies:** Task 02, Task 03, Task 04
- **Parallel Group:** 4
- **Acceptance Criteria:**
  - Test: POST `/projects/{slug}/photos` with a valid image file stores the photo and creates a `ProjectPhoto` record
  - Test: POST `/projects/{slug}/photos` with a non-image file returns 422
  - Test: `Storage::fake('public')` is used so no real files are written during tests
  - Test: POST `/projects/{slug}/time` with `started_at` and `ended_at` creates a `TimeEntry` with a computed `duration_minutes`
  - Test: POST `/projects/{slug}/time` with only `started_at` (no `ended_at`) creates a running `TimeEntry` with `ended_at = null`
  - Test: POST `/projects/{slug}/time` without `started_at` returns 422
  - Test: PUT `/projects/{slug}/time/{entry}/stop` on a running entry sets `ended_at` and `duration_minutes`
  - Test: POST `/projects/{slug}/notes` with valid content creates a `ProjectNote`
  - Test: POST `/projects/{slug}/notes` with empty content returns 422
  - Test: POST `/projects/{slug}/materials` with valid data creates a `project_materials` pivot row
  - Test: POST `/projects/{slug}/materials` with a non-existent `material_id` returns 422
  - All tests use `RefreshDatabase`, `#[Test]` attributes, and factories
  - All tests run as an authenticated user via `actingAs()`
- **Expected Files:**
  - `tests/Feature/ProjectSubResourceTest.php` (create)
- **Complexity:** M
- **Status:** pending

---

## Execution Plan

| Task | Title | Group | Domain | Complexity | Depends On |
|------|-------|-------|--------|------------|------------|
| 01 | Project CRUD Backend | 1 | backend | M | none |
| 02 | Photo Upload Backend | 1 | backend | M | none |
| 03 | Time Entry Backend + Shared Timer Data | 1 | backend | M | none |
| 04 | Notes and Material Attachment Backend | 1 | backend | S | none |
| 05 | Project List Page + Kanban Board | 2 | frontend | L | T01 |
| 06 | Project Create and Edit Forms | 2 | frontend | M | T01 |
| 07 | Project Detail Page (fullstack) | 3 | fullstack | L | T01, T02, T03, T04 |
| 08 | Persistent Timer Widget | 4 | frontend | M | T03 |
| 09 | Project CRUD Feature Tests | 4 | backend | M | T01 |
| 10 | Sub-resource Feature Tests | 4 | backend | M | T02, T03, T04 |

### Parallel Execution Strategy

**Group 1** — All four backend tasks have no dependencies on each other and all touch only `ProjectController.php` in distinct methods. An implementer may work on them in sequence within a single task or, if multiple agents are available, they should be coordinated carefully since they share the same file. The safest order within one agent: T01 → T04 → T02 → T03 (simplest to most complex).

**Group 2** — Tasks 05 and 06 can run in parallel once Group 1 is complete. They touch entirely separate files.

**Group 3** — Task 07 is a fullstack task requiring all of Group 1 to be done (all sub-resource backend actions must be implemented before the detail page can wire up its inline forms).

**Group 4** — Tasks 08, 09, and 10 can all run in parallel. Task 08 requires T03 (the `activeTimer` shared data). Tasks 09 and 10 require their respective backend tasks from Group 1.

---

## File Ownership Map

| Task | Exclusively Owns |
|------|-----------------|
| 01 | `ProjectController.php` (index, create, store, show, edit, update, destroy methods) |
| 02 | `app/Services/PhotoUploadService.php`; `ProjectController.php` uploadPhoto method |
| 03 | `ProjectController.php` (logTime, stopTimer); `HandleInertiaRequests.php` (activeTimer share) |
| 04 | `ProjectController.php` (addNote, attachMaterial) |
| 05 | `resources/js/Pages/Projects/Index.jsx` |
| 06 | `resources/js/Pages/Projects/Create.jsx`, `resources/js/Pages/Projects/Edit.jsx` |
| 07 | `resources/js/Pages/Projects/Show.jsx`; `ProjectController.php` (show method eager-load update) |
| 08 | `resources/js/Layouts/AppLayout.jsx` (timer widget section only) |
| 09 | `tests/Feature/ProjectControllerTest.php` |
| 10 | `tests/Feature/ProjectSubResourceTest.php` |

> **Note on `ProjectController.php` shared ownership:** Tasks 01–04 and 07 all touch this one file but in strictly non-overlapping methods. If executing sequentially within a single agent, apply changes in order. If parallelizing across agents, each agent must be scoped to its specific methods only and changes merged carefully.
