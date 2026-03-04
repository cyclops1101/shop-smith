# Task Manifest — Workshop Manager Phase 1: Scaffold

**Generated:** 2026-03-03
**Scope:** Phase 1 — Full foundation scaffold so future phases can add features on top
**Total Tasks:** 12
**Parallel Groups:** 4

---

## Dependency Overview

```
Group 1 (no deps):    Task 01 — Install Breeze + React + Inertia
Group 2 (→ T01):      Task 02 — PHP Enum Classes
                      Task 03 — Database Migrations (17 tables)
Group 3 (→ T02+T03):  Task 04 — Eloquent Models (relationships, casts, traits)
                      Task 05 — Frontend Base Layout + UI Primitives
Group 4 (→ T04+T05):  Task 06 — Routes + Controller Stubs
                      Task 07 — Form Request Stubs
                      Task 08 — Model Factories
                      Task 09 — Feature Test Stubs
                      Task 10 — Page Component Stubs
                      Task 11 — HandleInertiaRequests Shared Data
                      Task 12 — Scout Configuration
```

> Note: Task 05 depends only on Task 01 (pure frontend), so it can run in Group 2 in parallel with Tasks 02 and 03. Tasks 10 and 11 depend on Task 05 and Task 06 respectively — they are slotted in Group 4 when all their blockers are done.

---

## Group 1 — No Dependencies

### Task 01: Install Breeze with React + Inertia Stack
- **Domain:** fullstack
- **Dependencies:** none
- **Parallel Group:** 1
- **Complexity:** medium
- **Description:** Install Laravel Breeze with the React + Inertia stack. Run `php artisan breeze:install react` (the Inertia React variant). This installs React 19, @inertiajs/react, the Vite React plugin, all Breeze auth pages (Login, Register, ForgotPassword, ResetPassword, VerifyEmail, Profile), the `HandleInertiaRequests` middleware, the Inertia root blade view, and the `app.jsx` entrypoint. Run `npm install` after installation. Run `php artisan migrate` to apply Breeze's default migrations (users, password_reset_tokens, sessions, cache). Verify `npm run build` completes without errors. Also install `intervention/image` via Composer for later photo thumbnail use.
- **Acceptance Criteria:**
  - [ ] `composer.json` includes `laravel/breeze` and `intervention/image`
  - [ ] `package.json` includes `@inertiajs/react`, `react`, `react-dom`, `@vitejs/plugin-react`
  - [ ] `resources/js/app.jsx` exists and bootstraps Inertia with React
  - [ ] `resources/js/Pages/Auth/Login.jsx` and other Breeze auth pages exist
  - [ ] `resources/js/Layouts/AuthenticatedLayout.jsx` and `GuestLayout.jsx` exist
  - [ ] `app/Http/Middleware/HandleInertiaRequests.php` exists and is registered
  - [ ] `resources/views/app.blade.php` exists as the Inertia root template
  - [ ] `vite.config.js` includes `@vitejs/plugin-react`
  - [ ] `npm run build` succeeds without errors
  - [ ] `php artisan migrate` runs Breeze default migrations without errors
- **Expected Files:**
  - `composer.json` (modified)
  - `package.json` (modified)
  - `vite.config.js` (modified)
  - `bootstrap/app.php` (modified — middleware registered)
  - `resources/js/app.jsx`
  - `resources/js/bootstrap.js`
  - `resources/views/app.blade.php`
  - `resources/js/Pages/Auth/Login.jsx`
  - `resources/js/Pages/Auth/Register.jsx`
  - `resources/js/Pages/Auth/ForgotPassword.jsx`
  - `resources/js/Pages/Auth/ResetPassword.jsx`
  - `resources/js/Pages/Auth/VerifyEmail.jsx`
  - `resources/js/Pages/Profile/Edit.jsx`
  - `resources/js/Layouts/AuthenticatedLayout.jsx`
  - `resources/js/Layouts/GuestLayout.jsx`
  - `app/Http/Middleware/HandleInertiaRequests.php`
- **Status:** pending

---

## Group 2 — Depends on Task 01

### Task 02: PHP Enum Classes
- **Domain:** backend
- **Dependencies:** Task 01
- **Parallel Group:** 2
- **Complexity:** low
- **Description:** Create all 5 backed string PHP Enum classes under `app/Enums/`. Each enum must define all cases exactly as specified in the schema. Add a `label(): string` method on each enum returning a human-readable string for UI selects. Also create a basic unit test file to confirm all enum case values resolve correctly.

  Enums and their cases:
  - `ProjectStatus`: `planned`, `designing`, `in_progress`, `finishing`, `on_hold`, `completed`, `archived`
  - `ProjectPriority`: `low`, `medium`, `high`, `urgent`
  - `MaterialUnit`: `piece`, `board_foot`, `linear_foot`, `square_foot`, `sheet`, `gallon`, `quart`, `pint`, `oz`, `lb`, `kg`, `each`, `box`, `bag`
  - `ExpenseCategory`: `materials`, `tools`, `shop_supplies`, `equipment`, `maintenance`, `other`
  - `MaintenanceType`: `blade_change`, `alignment`, `cleaning`, `lubrication`, `belt_replacement`, `calibration`, `filter_change`, `other`
- **Acceptance Criteria:**
  - [ ] All 5 enum files exist under `app/Enums/`
  - [ ] All enums use `string` backing type (`enum Foo: string`)
  - [ ] All case values match the spec exactly
  - [ ] Each enum has a `label(): string` method returning a human-readable title
  - [ ] `tests/Unit/EnumTest.php` exists with assertions on case values
  - [ ] `php artisan test --filter EnumTest` passes
- **Expected Files:**
  - `app/Enums/ProjectStatus.php`
  - `app/Enums/ProjectPriority.php`
  - `app/Enums/MaterialUnit.php`
  - `app/Enums/ExpenseCategory.php`
  - `app/Enums/MaintenanceType.php`
  - `tests/Unit/EnumTest.php`
- **Status:** pending

---

### Task 03: Database Migrations — All 17 App Tables
- **Domain:** backend
- **Dependencies:** Task 01
- **Parallel Group:** 2
- **Complexity:** high
- **Description:** Create all 17 application table migrations (beyond the Breeze defaults). All primary keys use `$table->ulid('id')->primary()`. Soft delete columns (`deleted_at`) appear only on `projects`, `materials`, and `tools`. All money columns use `decimal(10,2)` — never float. Foreign keys must specify cascade rules as defined in the spec. Add all indexes called out per-table. Migrations must be created in foreign-key dependency order.

  Order and tables:
  1. `tags` (no FK dependencies)
  2. `material_categories`
  3. `tool_categories`
  4. `suppliers`
  5. `projects` (slug varchar unique, indexes on status/priority/is_commission/created_at)
  6. `materials` (→ material_categories nullable, → suppliers nullable; indexes on category_id, supplier_id, quantity_on_hand)
  7. `tools` (→ tool_categories nullable; index on category_id)
  8. `project_photos` (→ projects cascade delete; indexes on project_id, is_portfolio)
  9. `project_notes` (→ projects cascade delete)
  10. `time_entries` (→ projects cascade delete; indexes on project_id, started_at)
  11. `project_materials` (→ projects cascade delete, → materials cascade delete; unique composite on project_id+material_id)
  12. `maintenance_schedules` (→ tools cascade delete; indexes on tool_id, next_due_at)
  13. `maintenance_logs` (→ tools cascade delete, → maintenance_schedules nullable set null; indexes on tool_id, performed_at)
  14. `expenses` (→ projects nullable set null, → suppliers nullable set null; indexes on project_id, category, expense_date)
  15. `revenues` (→ projects nullable set null; indexes on project_id, received_date)
  16. `cut_list_boards` (→ projects nullable set null, → materials nullable set null)
  17. `cut_list_pieces` (→ projects cascade delete)
  18. `taggables` pivot (→ tags cascade delete; composite index on taggable_id+taggable_type, index on tag_id)
- **Acceptance Criteria:**
  - [ ] All 17+ migration files exist in `database/migrations/`
  - [ ] `php artisan migrate:fresh` runs without errors on MySQL 8
  - [ ] All primary keys are ULID varchar(26) — no auto-incrementing integers on app tables
  - [ ] `deleted_at` column present only on `projects`, `materials`, `tools`
  - [ ] All money columns confirmed as `decimal(10,2)`
  - [ ] `projects.slug` has unique index
  - [ ] `project_materials` has unique composite index on `(project_id, material_id)`
  - [ ] `taggables` has composite index on `(taggable_id, taggable_type)`
  - [ ] Foreign key constraints exist with correct cascade rules per spec
- **Expected Files:**
  - `database/migrations/YYYY_MM_DD_000001_create_tags_table.php`
  - `database/migrations/YYYY_MM_DD_000002_create_material_categories_table.php`
  - `database/migrations/YYYY_MM_DD_000003_create_tool_categories_table.php`
  - `database/migrations/YYYY_MM_DD_000004_create_suppliers_table.php`
  - `database/migrations/YYYY_MM_DD_000005_create_projects_table.php`
  - `database/migrations/YYYY_MM_DD_000006_create_materials_table.php`
  - `database/migrations/YYYY_MM_DD_000007_create_tools_table.php`
  - `database/migrations/YYYY_MM_DD_000008_create_project_photos_table.php`
  - `database/migrations/YYYY_MM_DD_000009_create_project_notes_table.php`
  - `database/migrations/YYYY_MM_DD_000010_create_time_entries_table.php`
  - `database/migrations/YYYY_MM_DD_000011_create_project_materials_table.php`
  - `database/migrations/YYYY_MM_DD_000012_create_maintenance_schedules_table.php`
  - `database/migrations/YYYY_MM_DD_000013_create_maintenance_logs_table.php`
  - `database/migrations/YYYY_MM_DD_000014_create_expenses_table.php`
  - `database/migrations/YYYY_MM_DD_000015_create_revenues_table.php`
  - `database/migrations/YYYY_MM_DD_000016_create_cut_list_boards_table.php`
  - `database/migrations/YYYY_MM_DD_000017_create_cut_list_pieces_table.php`
  - `database/migrations/YYYY_MM_DD_000018_create_taggables_table.php`
- **Status:** pending

---

### Task 05: Frontend Base Layout and UI Primitives
- **Domain:** frontend
- **Dependencies:** Task 01
- **Parallel Group:** 2
- **Complexity:** medium
- **Description:** Build the shared application shell and shadcn-style UI primitives that all feature pages will use. This task is pure frontend and does not require models or migrations.

  **AppLayout.jsx** — primary authenticated layout wrapping all app pages. Must include:
  - Top navigation bar with app name ("Workshop Manager"), primary nav links (Dashboard, Projects, Materials, Tools, Finance, Cut List), a user menu dropdown, and a persistent Timer widget placeholder in the header
  - Responsive mobile hamburger menu
  - Main `children` content area
  - Uses Inertia's `Link` for all nav links
  - Active nav item visually highlighted via `usePage().url` check

  **UI Primitives** under `resources/js/Components/ui/` — self-contained, Tailwind-only components:
  - `Button.jsx` — variants: `default`, `secondary`, `destructive`, `ghost`, `outline`; sizes: `sm`, `md`, `lg`; accepts `disabled` and `loading` props
  - `Card.jsx` — named exports: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
  - `Badge.jsx` — variants: `default`, `secondary`, `destructive`, `outline`; also accepts a `color` prop (hex string) for tag-color badges
  - `Input.jsx` — styled text input, forwards all HTML input props
  - `Label.jsx` — styled form label
  - `Select.jsx` — styled native select, accepts `options` array prop `[{ value, label }]`
  - `Textarea.jsx` — styled textarea, forwards all HTML textarea props
  - `Table.jsx` — named exports: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
  - `Modal.jsx` — dialog overlay with `open` (bool), `onClose` (fn), and `title` (string) props; renders children inside
  - `Alert.jsx` — variants: `info`, `warning`, `error`, `success`

  Also create a `resources/js/Pages/Dashboard.jsx` stub that renders inside AppLayout with placeholder content.
- **Acceptance Criteria:**
  - [ ] `resources/js/Layouts/AppLayout.jsx` exists and accepts `children`
  - [ ] Nav bar includes links to Dashboard, Projects, Materials, Tools, Finance, Cut List
  - [ ] Active nav item is visually distinguished (bold, color, underline, etc.)
  - [ ] Timer widget placeholder is visible in the nav bar
  - [ ] All 10 UI primitive files exist under `resources/js/Components/ui/`
  - [ ] `Button` accepts `variant` and `size` props without errors
  - [ ] `Badge` renders with a custom background color when `color="#hex"` is passed
  - [ ] `Modal` mounts/unmounts based on `open` prop and calls `onClose` on backdrop click
  - [ ] `Dashboard.jsx` renders without errors using `AppLayout`
  - [ ] `npm run build` succeeds with all components present
- **Expected Files:**
  - `resources/js/Layouts/AppLayout.jsx`
  - `resources/js/Components/ui/Button.jsx`
  - `resources/js/Components/ui/Card.jsx`
  - `resources/js/Components/ui/Badge.jsx`
  - `resources/js/Components/ui/Input.jsx`
  - `resources/js/Components/ui/Label.jsx`
  - `resources/js/Components/ui/Select.jsx`
  - `resources/js/Components/ui/Textarea.jsx`
  - `resources/js/Components/ui/Table.jsx`
  - `resources/js/Components/ui/Modal.jsx`
  - `resources/js/Components/ui/Alert.jsx`
  - `resources/js/Pages/Dashboard.jsx`
- **Status:** pending

---

## Group 3 — Depends on Tasks 02 + 03 (and Task 01 for Task 05)

### Task 04: Eloquent Models with Relationships, Casts, and Traits
- **Domain:** backend
- **Dependencies:** Task 02, Task 03
- **Parallel Group:** 3
- **Complexity:** high
- **Description:** Create all 17 Eloquent model classes under `app/Models/`. Requirements for every model:
  - `HasUlids` trait — no auto-increment integer IDs
  - `$fillable` array covering all writable columns
  - `$casts` array for enum columns (→ Enum class), boolean columns, date/timestamp columns, and decimal columns

  Additional per-model requirements:
  - `Project`, `Material`, `Tool` — add `SoftDeletes` trait
  - `Project` — auto-generate `slug` from `title` using `Str::slug()` in a `booted()` static hook; `getRouteKeyName()` returns `'slug'`
  - `ProjectMaterial` — extends `Illuminate\Database\Eloquent\Relations\Pivot` (not plain Model); still uses `HasUlids`
  - `Project`, `Material`, `Tool` — use `Laravel\Scout\Searchable` trait
  - `Tag` — defines `morphedByMany` for Project, Material, Tool via the `taggables` table

  Full relationship map:
  - `Project`: hasMany(ProjectPhoto, ProjectNote, TimeEntry, ProjectMaterial, Expense, Revenue, CutListBoard, CutListPiece); belongsToMany(Material, 'project_materials'); morphToMany(Tag, 'taggable')
  - `Material`: belongsTo(MaterialCategory), belongsTo(Supplier); hasMany(ProjectMaterial); belongsToMany(Project, 'project_materials'); morphToMany(Tag, 'taggable')
  - `Tool`: belongsTo(ToolCategory); hasMany(MaintenanceSchedule, MaintenanceLog); morphToMany(Tag, 'taggable')
  - `MaintenanceSchedule`: belongsTo(Tool); hasMany(MaintenanceLog)
  - `MaintenanceLog`: belongsTo(Tool); belongsTo(MaintenanceSchedule) — nullable
  - `Expense`: belongsTo(Project) — nullable; belongsTo(Supplier) — nullable
  - `Revenue`: belongsTo(Project) — nullable
  - `CutListBoard`: belongsTo(Project) — nullable; belongsTo(Material) — nullable
  - `CutListPiece`: belongsTo(Project)
  - `ProjectPhoto`: belongsTo(Project)
  - `ProjectNote`: belongsTo(Project)
  - `TimeEntry`: belongsTo(Project)
  - `Supplier`: hasMany(Material, Expense)
  - `MaterialCategory`: hasMany(Material)
  - `ToolCategory`: hasMany(Tool)
  - `Tag`: morphedByMany(Project, 'taggable'); morphedByMany(Material, 'taggable'); morphedByMany(Tool, 'taggable')
- **Acceptance Criteria:**
  - [ ] All 17 model files exist under `app/Models/`
  - [ ] All models use `HasUlids`; none use `$incrementing = true` with integers
  - [ ] `Project`, `Material`, `Tool` use `SoftDeletes`
  - [ ] All enum columns cast to the correct Enum class (e.g., `'status' => ProjectStatus::class`)
  - [ ] `Project::getRouteKeyName()` returns `'slug'`
  - [ ] `Project` auto-generates a unique slug from title on create
  - [ ] `ProjectMaterial` extends `Pivot`
  - [ ] `Project`, `Material`, `Tool` use `Laravel\Scout\Searchable`
  - [ ] `php artisan migrate:fresh` followed by a tinker session calling relationship methods throws no errors
- **Expected Files:**
  - `app/Models/Project.php`
  - `app/Models/ProjectPhoto.php`
  - `app/Models/ProjectNote.php`
  - `app/Models/TimeEntry.php`
  - `app/Models/Material.php`
  - `app/Models/MaterialCategory.php`
  - `app/Models/ProjectMaterial.php`
  - `app/Models/Supplier.php`
  - `app/Models/Tool.php`
  - `app/Models/ToolCategory.php`
  - `app/Models/MaintenanceSchedule.php`
  - `app/Models/MaintenanceLog.php`
  - `app/Models/Expense.php`
  - `app/Models/Revenue.php`
  - `app/Models/CutListBoard.php`
  - `app/Models/CutListPiece.php`
  - `app/Models/Tag.php`
- **Status:** pending

---

## Group 4 — Depends on Task 04 (and Task 05 for frontend tasks)

### Task 06: Routes and Controller Stubs
- **Domain:** backend
- **Dependencies:** Task 04
- **Parallel Group:** 4
- **Complexity:** medium
- **Description:** Define all application routes in `routes/web.php` and create controller stub classes. Every controller method must exist with the correct signature and return a minimal `Inertia::render()` response (or `response()->noContent()` for mutations). All routes except `PortfolioController@index` must be wrapped in `auth` middleware.

  Controllers and their methods:
  - `DashboardController` — `index()`
  - `ProjectController` — `index`, `create`, `store`, `show`, `edit`, `update`, `destroy`, `uploadPhoto`, `logTime`, `stopTimer`, `attachMaterial`, `addNote`
  - `MaterialController` — `index`, `create`, `store`, `show`, `edit`, `update`, `adjustStock`
  - `ToolController` — `index`, `create`, `store`, `show`, `edit`, `update`, `logMaintenance`
  - `FinanceController` — `index`, `storeExpense`, `storeRevenue`
  - `CutListController` — `index`, `optimize`
  - `PortfolioController` — `index` (public — no auth middleware)

  Route binding rules:
  - `{project}` uses slug — enforced by `Project::getRouteKeyName()` returning `'slug'` (set in Task 04)
  - `{material}`, `{tool}`, `{entry}` use ULID (default implicit binding)

  Route naming: use standard resourceful names (`projects.index`, `projects.show`, etc.) plus explicit names for sub-resource routes (`projects.upload-photo`, `projects.log-time`, `projects.stop-timer`, `projects.attach-material`, `projects.add-note`, `materials.adjust-stock`, `tools.log-maintenance`, `finance.store-expense`, `finance.store-revenue`, `cut-list.optimize`).
- **Acceptance Criteria:**
  - [ ] `routes/web.php` contains all routes from the spec
  - [ ] All 7 controller files exist under `app/Http/Controllers/`
  - [ ] Every controller method exists and is callable
  - [ ] `php artisan route:list` shows all routes without errors
  - [ ] Auth middleware applied to all routes except `portfolio.index`
  - [ ] `GET /portfolio` returns 200 without authentication
  - [ ] `GET /projects` returns 302 redirect when unauthenticated
- **Expected Files:**
  - `routes/web.php`
  - `app/Http/Controllers/DashboardController.php`
  - `app/Http/Controllers/ProjectController.php`
  - `app/Http/Controllers/MaterialController.php`
  - `app/Http/Controllers/ToolController.php`
  - `app/Http/Controllers/FinanceController.php`
  - `app/Http/Controllers/CutListController.php`
  - `app/Http/Controllers/PortfolioController.php`
- **Status:** pending

---

### Task 07: Form Request Stubs with Validation Rules
- **Domain:** backend
- **Dependencies:** Task 04
- **Parallel Group:** 4
- **Complexity:** medium
- **Description:** Create all Form Request classes under `app/Http/Requests/`. Every request has `authorize()` returning `true` and a `rules()` method with full validation rules. Use `Rule::enum(EnumClass::class)` for enum fields and `Rule::exists(table, 'id')` for foreign key fields. Rules must reflect the exact schema constraints from the spec.

  Requests to create and their key rules:
  - `StoreProjectRequest` — title required/string/max:255; status enum(ProjectStatus); priority enum(ProjectPriority); dates nullable/date; decimals nullable/numeric/min:0; is_commission boolean; client fields nullable/string
  - `UpdateProjectRequest` — same as Store but all fields optional (use `sometimes`)
  - `StoreProjectPhotoRequest` — file required/image/mimes:jpeg,png,webp/max:10240; caption nullable/string/max:255
  - `LogTimeRequest` — started_at required/date; ended_at nullable/date/after_or_equal:started_at; description nullable/string/max:255; duration_minutes nullable/integer/min:1
  - `AttachMaterialRequest` — material_id required/ulid/exists:materials,id; quantity_used required/numeric/min:0.01; notes nullable/string/max:255
  - `AddNoteRequest` — content required/string
  - `StoreMaterialRequest` — name required/string/max:255; unit required/enum(MaterialUnit); quantity_on_hand required/numeric/min:0; category_id nullable/ulid/exists:material_categories,id; supplier_id nullable/ulid/exists:suppliers,id; unit_cost nullable/numeric/min:0; low_stock_threshold nullable/numeric/min:0
  - `UpdateMaterialRequest` — same as Store with `sometimes`
  - `AdjustStockRequest` — quantity required/numeric (can be negative); notes nullable/string
  - `StoreToolRequest` — name required/string/max:255; category_id nullable/ulid/exists:tool_categories,id; purchase_price nullable/numeric/min:0; purchase_date nullable/date; warranty_expires nullable/date
  - `UpdateToolRequest` — same as Store with `sometimes`
  - `LogMaintenanceRequest` — maintenance_type required/enum(MaintenanceType); description required/string; performed_at required/date; cost nullable/numeric/min:0
  - `StoreExpenseRequest` — category required/enum(ExpenseCategory); description required/string/max:255; amount required/numeric/min:0.01; expense_date required/date; supplier_id nullable/ulid/exists:suppliers,id; project_id nullable/ulid/exists:projects,id
  - `StoreRevenueRequest` — description required/string/max:255; amount required/numeric/min:0.01; received_date required/date; project_id nullable/ulid/exists:projects,id; payment_method nullable/string/max:50
  - `CutListRequest` — boards required/array; boards.*.label required/string; boards.*.length/width/thickness required/numeric/min:0.1; boards.*.quantity required/integer/min:1; pieces array with same structure plus grain_direction boolean
- **Acceptance Criteria:**
  - [ ] All 15 form request files exist under `app/Http/Requests/`
  - [ ] Every request has `authorize(): bool` returning `true`
  - [ ] Every request has `rules(): array` with appropriate rules
  - [ ] Enum fields use `Rule::enum()`
  - [ ] FK fields use `Rule::exists()` pointing to the correct table
  - [ ] `php artisan test --filter FormRequestTest` passes (basic instantiation smoke test)
- **Expected Files:**
  - `app/Http/Requests/StoreProjectRequest.php`
  - `app/Http/Requests/UpdateProjectRequest.php`
  - `app/Http/Requests/StoreProjectPhotoRequest.php`
  - `app/Http/Requests/LogTimeRequest.php`
  - `app/Http/Requests/AttachMaterialRequest.php`
  - `app/Http/Requests/AddNoteRequest.php`
  - `app/Http/Requests/StoreMaterialRequest.php`
  - `app/Http/Requests/UpdateMaterialRequest.php`
  - `app/Http/Requests/AdjustStockRequest.php`
  - `app/Http/Requests/StoreToolRequest.php`
  - `app/Http/Requests/UpdateToolRequest.php`
  - `app/Http/Requests/LogMaintenanceRequest.php`
  - `app/Http/Requests/StoreExpenseRequest.php`
  - `app/Http/Requests/StoreRevenueRequest.php`
  - `app/Http/Requests/CutListRequest.php`
  - `tests/Unit/FormRequestTest.php`
- **Status:** pending

---

### Task 08: Model Factories for All Models
- **Domain:** backend
- **Dependencies:** Task 04
- **Parallel Group:** 4
- **Complexity:** medium
- **Description:** Create Eloquent factories for all 17 models using realistic Faker data. Key rules:
  - Enum columns: use `fake()->randomElement(EnumClass::cases())->value`
  - Money columns: use `fake()->randomFloat(2, 10, 500)`
  - `Project` factory must NOT set `slug` (auto-generated by model)
  - `ProjectMaterial` factory must create both a `Project` and a `Material` via their factories for its FK columns, or accept them as states
  - `Tag` factory: `color` must be a valid 7-character hex string (e.g., `'#' . fake()->hexColor()` or `sprintf('#%06x', fake()->numberBetween(0, 0xFFFFFF))`)
  - Nullable FK columns default to `null` unless overridden via factory state
  - `MaintenanceLog` factory: `schedule_id` is nullable, defaults to null
  - All factories must work with both `make()` (no DB) and `create()` (with DB)
- **Acceptance Criteria:**
  - [ ] All 17 factory files exist under `database/factories/`
  - [ ] `ModelName::factory()->make()` works for every model without errors
  - [ ] `ModelName::factory()->create()` works on a migrated database for every model
  - [ ] Enum columns produce valid string values matching their enum's cases
  - [ ] Money/decimal fields produce positive numeric values
  - [ ] `Tag` factory produces a `color` matching `/#[0-9a-f]{6}/i`
  - [ ] `Project` factory creates a record with auto-generated slug (not null)
  - [ ] `php artisan test --filter FactoryTest` passes (smoke test creating one of each model)
- **Expected Files:**
  - `database/factories/ProjectFactory.php`
  - `database/factories/ProjectPhotoFactory.php`
  - `database/factories/ProjectNoteFactory.php`
  - `database/factories/TimeEntryFactory.php`
  - `database/factories/MaterialFactory.php`
  - `database/factories/MaterialCategoryFactory.php`
  - `database/factories/ProjectMaterialFactory.php`
  - `database/factories/SupplierFactory.php`
  - `database/factories/ToolFactory.php`
  - `database/factories/ToolCategoryFactory.php`
  - `database/factories/MaintenanceScheduleFactory.php`
  - `database/factories/MaintenanceLogFactory.php`
  - `database/factories/ExpenseFactory.php`
  - `database/factories/RevenueFactory.php`
  - `database/factories/CutListBoardFactory.php`
  - `database/factories/CutListPieceFactory.php`
  - `database/factories/TagFactory.php`
  - `tests/Unit/FactoryTest.php`
- **Status:** pending

---

### Task 09: Feature Test Stubs for All Controller Actions
- **Domain:** backend
- **Dependencies:** Task 04, Task 06
- **Parallel Group:** 4
- **Complexity:** medium
- **Description:** Create feature test classes for every controller. Each test file has one test method per controller action. Tests are stubs that assert HTTP status and basic Inertia response structure — not full business logic. All tests use `RefreshDatabase` and factories. Unauthenticated tests confirm 302 redirect. Authenticated tests use `actingAs(User::factory()->create())`. Use `$response->assertInertia(fn ($page) => $page->component('ComponentName'))` for Inertia response assertions.

  Test files:
  - `DashboardControllerTest` — `test_authenticated_user_can_view_dashboard`
  - `ProjectControllerTest` — one test per action: index, create, store (valid + invalid), show, edit, update, destroy, uploadPhoto, logTime, stopTimer, attachMaterial, addNote; plus one unauthenticated redirect test
  - `MaterialControllerTest` — one test per action: index, create, store, show, edit, update, adjustStock
  - `ToolControllerTest` — one test per action: index, create, store, show, edit, update, logMaintenance
  - `FinanceControllerTest` — tests for index, storeExpense, storeRevenue
  - `CutListControllerTest` — tests for index, optimize
  - `PortfolioControllerTest` — `test_portfolio_is_publicly_accessible` (200 without auth)
- **Acceptance Criteria:**
  - [ ] All 7 test files exist under `tests/Feature/`
  - [ ] Every controller action has at least one corresponding test method
  - [ ] `php artisan test` runs without PHP syntax errors
  - [ ] Unauthenticated requests to auth-protected routes assert a redirect (302 or 401)
  - [ ] Authenticated GET requests to index/show/create/edit assert 200
  - [ ] `PortfolioController@index` asserts 200 without authentication
  - [ ] All tests use `RefreshDatabase` trait
  - [ ] All tests use factories for test data (no hardcoded IDs)
- **Expected Files:**
  - `tests/Feature/DashboardControllerTest.php`
  - `tests/Feature/ProjectControllerTest.php`
  - `tests/Feature/MaterialControllerTest.php`
  - `tests/Feature/ToolControllerTest.php`
  - `tests/Feature/FinanceControllerTest.php`
  - `tests/Feature/CutListControllerTest.php`
  - `tests/Feature/PortfolioControllerTest.php`
- **Status:** pending

---

### Task 10: Page Component Stubs — All Feature Pages
- **Domain:** frontend
- **Dependencies:** Task 05, Task 06
- **Parallel Group:** 4
- **Complexity:** medium
- **Description:** Create stub JSX page components for every route that renders a view. Each stub uses `AppLayout` as its layout wrapper and renders a heading and placeholder text. Pages accept the props Inertia will pass from controllers (typed as function parameters, even if not yet used). `Portfolio/Index.jsx` is a public page and must NOT use `AppLayout` — give it a minimal layout without auth-dependent nav.

  Pages to create:
  - `resources/js/Pages/Dashboard.jsx` — may already exist from Task 05; update to accept `{ stats }` prop shape
  - `resources/js/Pages/Projects/Index.jsx` — accepts `{ projects, filters }`
  - `resources/js/Pages/Projects/Show.jsx` — accepts `{ project }`
  - `resources/js/Pages/Projects/Create.jsx` — accepts `{ statuses, priorities }`
  - `resources/js/Pages/Projects/Edit.jsx` — accepts `{ project, statuses, priorities }`
  - `resources/js/Pages/Materials/Index.jsx` — accepts `{ materials, categories }`
  - `resources/js/Pages/Materials/Show.jsx` — accepts `{ material }`
  - `resources/js/Pages/Materials/Create.jsx` — accepts `{ categories, suppliers, units }`
  - `resources/js/Pages/Materials/Edit.jsx` — accepts `{ material, categories, suppliers, units }`
  - `resources/js/Pages/Tools/Index.jsx` — accepts `{ tools, categories }`
  - `resources/js/Pages/Tools/Show.jsx` — accepts `{ tool }`
  - `resources/js/Pages/Tools/Create.jsx` — accepts `{ categories }`
  - `resources/js/Pages/Tools/Edit.jsx` — accepts `{ tool, categories }`
  - `resources/js/Pages/Finance/Index.jsx` — accepts `{ expenses, revenues, summary }`
  - `resources/js/Pages/CutList/Index.jsx` — accepts `{ boards, pieces, result }`
  - `resources/js/Pages/Portfolio/Index.jsx` — accepts `{ photos }`, no auth layout
- **Acceptance Criteria:**
  - [ ] All 16 page files exist in correct subdirectory under `resources/js/Pages/`
  - [ ] Every page except `Portfolio/Index.jsx` imports and wraps content in `AppLayout`
  - [ ] `Portfolio/Index.jsx` does NOT use `AppLayout`
  - [ ] Each page function accepts a props object matching the prop shape listed above
  - [ ] Page component names (file exports) match the string passed to `Inertia::render()` in the controllers
  - [ ] `npm run build` completes without errors
- **Expected Files:**
  - `resources/js/Pages/Dashboard.jsx`
  - `resources/js/Pages/Projects/Index.jsx`
  - `resources/js/Pages/Projects/Show.jsx`
  - `resources/js/Pages/Projects/Create.jsx`
  - `resources/js/Pages/Projects/Edit.jsx`
  - `resources/js/Pages/Materials/Index.jsx`
  - `resources/js/Pages/Materials/Show.jsx`
  - `resources/js/Pages/Materials/Create.jsx`
  - `resources/js/Pages/Materials/Edit.jsx`
  - `resources/js/Pages/Tools/Index.jsx`
  - `resources/js/Pages/Tools/Show.jsx`
  - `resources/js/Pages/Tools/Create.jsx`
  - `resources/js/Pages/Tools/Edit.jsx`
  - `resources/js/Pages/Finance/Index.jsx`
  - `resources/js/Pages/CutList/Index.jsx`
  - `resources/js/Pages/Portfolio/Index.jsx`
- **Status:** pending

---

### Task 11: HandleInertiaRequests — Shared Global Data
- **Domain:** backend
- **Dependencies:** Task 04, Task 06
- **Parallel Group:** 4
- **Complexity:** low
- **Description:** Update the `HandleInertiaRequests` middleware (scaffolded by Breeze in Task 01) so that every Inertia response automatically receives the global data all pages need. The `share()` method must merge:
  - `auth.user` — the authenticated user's safe fields `{ id, name, email }` or `null` for guests
  - `flash` — session flash data merged for keys `success`, `error`, `warning`, `info`
  - `appName` — value of `config('app.name')`

  This allows all pages to call `usePage().props.auth.user`, `usePage().props.flash`, and `usePage().props.appName` without the controller passing them explicitly.
- **Acceptance Criteria:**
  - [ ] `HandleInertiaRequests::share()` includes `auth.user`, `flash`, and `appName` in the returned array
  - [ ] `auth.user` only exposes `id`, `name`, `email` — not `password` or other sensitive fields
  - [ ] Flash keys `success`, `error`, `warning`, `info` are all present (even if null)
  - [ ] An unauthenticated Inertia request has `auth.user = null`
  - [ ] `php artisan test` still passes after the change
- **Expected Files:**
  - `app/Http/Middleware/HandleInertiaRequests.php`
- **Status:** pending

---

### Task 12: Laravel Scout Configuration with Database Driver
- **Domain:** backend
- **Dependencies:** Task 04
- **Parallel Group:** 4
- **Complexity:** low
- **Description:** Configure Laravel Scout to use the database driver for full-text search on `Project`, `Material`, and `Tool`. Publish the Scout config file. Set `SCOUT_DRIVER=database` in `.env`. Define `toSearchableArray()` on each of the three Searchable models specifying the fields that should be indexed:
  - `Project::toSearchableArray()` — returns `id`, `title`, `description`, `client_name`, `notes`
  - `Material::toSearchableArray()` — returns `id`, `name`, `description`, `sku`, `location`
  - `Tool::toSearchableArray()` — returns `id`, `name`, `brand`, `model_number`, `serial_number`, `notes`

  Confirm `laravel/scout` is required via Composer (it may already be included; if not, add it). The database Scout driver does not require additional external services.
- **Acceptance Criteria:**
  - [ ] `config/scout.php` exists (published via vendor:publish)
  - [ ] `.env` has `SCOUT_DRIVER=database`
  - [ ] `composer.json` includes `laravel/scout`
  - [ ] `Project`, `Material`, `Tool` each implement `toSearchableArray()` returning the correct fields
  - [ ] `Project::search('test')` does not throw a class-not-found or driver error in tinker
  - [ ] `php artisan test` passes after this change
- **Expected Files:**
  - `config/scout.php`
  - `.env` (modified — `SCOUT_DRIVER=database`)
  - `app/Models/Project.php` (modified — `toSearchableArray()` added)
  - `app/Models/Material.php` (modified — `toSearchableArray()` added)
  - `app/Models/Tool.php` (modified — `toSearchableArray()` added)
- **Status:** pending

---

## Execution Summary

| Task | Title | Group | Domain | Complexity | Depends On |
|------|-------|-------|--------|------------|------------|
| 01 | Install Breeze + React + Inertia | 1 | fullstack | medium | none |
| 02 | PHP Enum Classes | 2 | backend | low | T01 |
| 03 | Database Migrations (17 tables) | 2 | backend | high | T01 |
| 05 | Frontend Base Layout + UI Primitives | 2 | frontend | medium | T01 |
| 04 | Eloquent Models | 3 | backend | high | T02, T03 |
| 06 | Routes + Controller Stubs | 4 | backend | medium | T04 |
| 07 | Form Request Stubs | 4 | backend | medium | T04 |
| 08 | Model Factories | 4 | backend | medium | T04 |
| 09 | Feature Test Stubs | 4 | backend | medium | T04, T06 |
| 10 | Page Component Stubs | 4 | frontend | medium | T05, T06 |
| 11 | HandleInertiaRequests Shared Data | 4 | backend | low | T04, T06 |
| 12 | Scout Configuration | 4 | backend | low | T04 |

---

## File Ownership Map

| Task | Exclusively Owns |
|------|-----------------|
| 01 | `vite.config.js`, `resources/js/app.jsx`, `resources/views/app.blade.php`, `bootstrap/app.php`, all Breeze auth/profile pages, both Breeze layouts, `HandleInertiaRequests.php` (initial scaffold) |
| 02 | `app/Enums/*.php`, `tests/Unit/EnumTest.php` |
| 03 | All `database/migrations/` files for app tables |
| 04 | All `app/Models/*.php` files |
| 05 | `resources/js/Layouts/AppLayout.jsx`, `resources/js/Components/ui/*.jsx`, `resources/js/Pages/Dashboard.jsx` (initial) |
| 06 | `routes/web.php`, all `app/Http/Controllers/*.php` (initial stubs) |
| 07 | All `app/Http/Requests/*.php`, `tests/Unit/FormRequestTest.php` |
| 08 | All `database/factories/*.php`, `tests/Unit/FactoryTest.php` |
| 09 | All `tests/Feature/*ControllerTest.php` |
| 10 | All `resources/js/Pages/**/*.jsx` (feature page stubs) |
| 11 | `app/Http/Middleware/HandleInertiaRequests.php` (shared data update) |
| 12 | `config/scout.php`, `.env` Scout setting; `toSearchableArray()` additions to Project/Material/Tool models |
