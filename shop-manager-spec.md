# Workshop Manager — Project Specification

## Overview

A self-hosted workshop/shop management tool built with Laravel 11 + React (Inertia.js) + Tailwind CSS. Designed for a solo woodworker managing projects, inventory, tools, and finances. Deployable via Docker on a VPS or local Raspberry Pi.

This document serves as the full project spec for a Claude Code agentic team build.

---

## Tech Stack

- **Backend:** Laravel 12 (PHP 8.3)
- **Frontend:** React 19 via Inertia.js + Tailwind CSS 4
- **Database:** PostgreSQL 16 (SQLite as fallback for local-only deploy)
- **File Storage:** Local disk (S3-compatible optional)
- **Auth:** Laravel Breeze (simple session auth, single user or small team)
- **Containerization:** Docker + Docker Compose
- **Queue:** Laravel Queue with database driver (Redis optional)
- **Search:** Laravel Scout with database driver (Meilisearch optional)

---

## Project Directory Structure

```
workshop-manager/
├── docker/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── php.ini
├── docker-compose.yml
├── app/
│   ├── Models/
│   │   ├── Project.php
│   │   ├── ProjectPhoto.php
│   │   ├── ProjectNote.php
│   │   ├── TimeEntry.php
│   │   ├── Material.php
│   │   ├── MaterialCategory.php
│   │   ├── ProjectMaterial.php
│   │   ├── Tool.php
│   │   ├── ToolCategory.php
│   │   ├── MaintenanceLog.php
│   │   ├── MaintenanceSchedule.php
│   │   ├── Supplier.php
│   │   ├── Expense.php
│   │   ├── Revenue.php
│   │   ├── CutListBoard.php
│   │   ├── CutListPiece.php
│   │   └── Tag.php
│   ├── Enums/
│   │   ├── ProjectStatus.php
│   │   ├── ProjectPriority.php
│   │   ├── MaterialUnit.php
│   │   ├── ExpenseCategory.php
│   │   └── MaintenanceType.php
│   ├── Services/
│   │   ├── CutListOptimizer.php
│   │   ├── InventoryAlertService.php
│   │   ├── MaintenanceReminderService.php
│   │   └── ProjectCostCalculator.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── DashboardController.php
│   │   │   ├── ProjectController.php
│   │   │   ├── MaterialController.php
│   │   │   ├── ToolController.php
│   │   │   ├── FinanceController.php
│   │   │   ├── CutListController.php
│   │   │   └── PortfolioController.php
│   │   └── Requests/
│   │       ├── ProjectRequest.php
│   │       ├── MaterialRequest.php
│   │       ├── ToolRequest.php
│   │       └── CutListRequest.php
│   ├── Notifications/
│   │   ├── LowStockAlert.php
│   │   └── MaintenanceDue.php
│   └── Console/
│       └── Commands/
│           ├── CheckLowStock.php
│           └── CheckMaintenanceDue.php
├── resources/
│   └── js/
│       ├── app.jsx
│       ├── Layouts/
│       │   └── AppLayout.jsx
│       ├── Pages/
│       │   ├── Dashboard.jsx
│       │   ├── Projects/
│       │   │   ├── Index.jsx
│       │   │   ├── Show.jsx
│       │   │   ├── Create.jsx
│       │   │   └── Edit.jsx
│       │   ├── Materials/
│       │   │   ├── Index.jsx
│       │   │   ├── Show.jsx
│       │   │   └── Create.jsx
│       │   ├── Tools/
│       │   │   ├── Index.jsx
│       │   │   ├── Show.jsx
│       │   │   └── Create.jsx
│       │   ├── Finance/
│       │   │   └── Index.jsx
│       │   ├── CutList/
│       │   │   └── Index.jsx
│       │   └── Portfolio/
│       │       └── Index.jsx
│       └── Components/
│           ├── ui/ (shadcn-style primitives)
│           ├── ProjectCard.jsx
│           ├── TimeTracker.jsx
│           ├── PhotoUploader.jsx
│           ├── StockLevelBadge.jsx
│           ├── MaintenanceAlert.jsx
│           ├── CutListVisualizer.jsx
│           └── DashboardWidgets/
│               ├── ActiveProjects.jsx
│               ├── LowStockItems.jsx
│               ├── UpcomingMaintenance.jsx
│               ├── RecentActivity.jsx
│               └── MonthlyFinanceSummary.jsx
├── database/
│   ├── migrations/
│   └── seeders/
│       └── DemoDataSeeder.php
├── routes/
│   └── web.php
└── tests/
    ├── Feature/
    └── Unit/
```

---

## Database Schema

### Enums (defined as PHP Enums, stored as strings)

```
ProjectStatus: planned | designing | in_progress | finishing | on_hold | completed | archived
ProjectPriority: low | medium | high | urgent
MaterialUnit: piece | board_foot | linear_foot | square_foot | sheet | gallon | quart | pint | oz | lb | kg | each | box | bag
ExpenseCategory: materials | tools | shop_supplies | equipment | maintenance | other
MaintenanceType: blade_change | alignment | cleaning | lubrication | belt_replacement | calibration | filter_change | other
```

---

### projects

The core table. Every build, commission, or experiment lives here.

| Column          | Type                    | Notes                                   |
| --------------- | ----------------------- | --------------------------------------- |
| id              | ulid (primary)          |                                         |
| title           | varchar(255)            |                                         |
| slug            | varchar(255)            | unique, auto-generated                  |
| description     | text, nullable          |                                         |
| status          | varchar(30)             | enum: ProjectStatus, default 'planned'  |
| priority        | varchar(20)             | enum: ProjectPriority, default 'medium' |
| estimated_hours | decimal(8,2), nullable  |                                         |
| estimated_cost  | decimal(10,2), nullable |                                         |
| actual_cost     | decimal(10,2), nullable | computed or manual                      |
| sell_price      | decimal(10,2), nullable | if commission/sale                      |
| started_at      | timestamp, nullable     |                                         |
| completed_at    | timestamp, nullable     |                                         |
| deadline        | date, nullable          |                                         |
| notes           | text, nullable          | internal notes                          |
| is_commission   | boolean                 | default false                           |
| client_name     | varchar(255), nullable  |                                         |
| client_contact  | varchar(255), nullable  |                                         |
| created_at      | timestamp               |                                         |
| updated_at      | timestamp               |                                         |
| deleted_at      | timestamp, nullable     | soft delete                             |

**Indexes:** status, priority, is_commission, created_at

---

### project_photos

| Column         | Type                   | Notes                                   |
| -------------- | ---------------------- | --------------------------------------- |
| id             | ulid                   |                                         |
| project_id     | ulid (fk → projects)   | cascade delete                          |
| file_path      | varchar(500)           |                                         |
| thumbnail_path | varchar(500), nullable | auto-generated                          |
| caption        | varchar(255), nullable |                                         |
| taken_at       | timestamp, nullable    | EXIF or manual                          |
| sort_order     | integer                | default 0                               |
| is_portfolio   | boolean                | default false — flag for public display |
| created_at     | timestamp              |                                         |

**Indexes:** project_id, is_portfolio

---

### project_notes

| Column     | Type                 | Notes              |
| ---------- | -------------------- | ------------------ |
| id         | ulid                 |                    |
| project_id | ulid (fk → projects) | cascade delete     |
| content    | text                 | markdown supported |
| created_at | timestamp            |                    |
| updated_at | timestamp            |                    |

---

### time_entries

| Column           | Type                   | Notes                             |
| ---------------- | ---------------------- | --------------------------------- |
| id               | ulid                   |                                   |
| project_id       | ulid (fk → projects)   | cascade delete                    |
| description      | varchar(255), nullable | what were you doing               |
| started_at       | timestamp              |                                   |
| ended_at         | timestamp, nullable    | null = currently running          |
| duration_minutes | integer, nullable      | computed on save, or manual entry |
| created_at       | timestamp              |                                   |

**Indexes:** project_id, started_at

---

### material_categories

| Column     | Type         | Notes                                             |
| ---------- | ------------ | ------------------------------------------------- |
| id         | ulid         |                                                   |
| name       | varchar(100) | e.g., "Hardwood", "Plywood", "Hardware", "Finish" |
| sort_order | integer      | default 0                                         |

---

### materials

| Column              | Type                                      | Notes                                 |
| ------------------- | ----------------------------------------- | ------------------------------------- |
| id                  | ulid                                      |                                       |
| category_id         | ulid (fk → material_categories), nullable |                                       |
| name                | varchar(255)                              | e.g., "3/4 Baltic Birch Plywood 4x8"  |
| sku                 | varchar(100), nullable                    | supplier SKU                          |
| description         | text, nullable                            |                                       |
| unit                | varchar(30)                               | enum: MaterialUnit                    |
| quantity_on_hand    | decimal(10,2)                             | current stock                         |
| low_stock_threshold | decimal(10,2), nullable                   | alert when below this                 |
| unit_cost           | decimal(10,2), nullable                   | last known price per unit             |
| supplier_id         | ulid (fk → suppliers), nullable           | preferred supplier                    |
| location            | varchar(255), nullable                    | where in the shop — "Rack A, Shelf 2" |
| notes               | text, nullable                            |                                       |
| created_at          | timestamp                                 |                                       |
| updated_at          | timestamp                                 |                                       |
| deleted_at          | timestamp, nullable                       |                                       |

**Indexes:** category_id, supplier_id, quantity_on_hand (for low stock queries)

---

### project_materials

Pivot table linking materials to projects with quantities used.

| Column        | Type                    | Notes                                |
| ------------- | ----------------------- | ------------------------------------ |
| id            | ulid                    |                                      |
| project_id    | ulid (fk → projects)    | cascade delete                       |
| material_id   | ulid (fk → materials)   | cascade delete                       |
| quantity_used | decimal(10,2)           |                                      |
| cost_at_time  | decimal(10,2), nullable | snapshot of unit_cost when allocated |
| notes         | varchar(255), nullable  |                                      |
| created_at    | timestamp               |                                      |

**Indexes:** project_id, material_id (unique composite)

---

### suppliers

| Column       | Type                   | Notes                                                  |
| ------------ | ---------------------- | ------------------------------------------------------ |
| id           | ulid                   |                                                        |
| name         | varchar(255)           | e.g., "Rockler", "Home Depot", "Local Hardwood Dealer" |
| contact_name | varchar(255), nullable |                                                        |
| phone        | varchar(50), nullable  |                                                        |
| email        | varchar(255), nullable |                                                        |
| website      | varchar(500), nullable |                                                        |
| address      | text, nullable         |                                                        |
| notes        | text, nullable         |                                                        |
| created_at   | timestamp              |                                                        |
| updated_at   | timestamp              |                                                        |

---

### tool_categories

| Column     | Type         | Notes                                                        |
| ---------- | ------------ | ------------------------------------------------------------ |
| id         | ulid         |                                                              |
| name       | varchar(100) | e.g., "Power Tools", "Hand Tools", "Jigs", "Dust Collection" |
| sort_order | integer      | default 0                                                    |

---

### tools

| Column            | Type                                  | Notes                                           |
| ----------------- | ------------------------------------- | ----------------------------------------------- |
| id                | ulid                                  |                                                 |
| category_id       | ulid (fk → tool_categories), nullable |                                                 |
| name              | varchar(255)                          | e.g., "DeWalt DW735 Planer"                     |
| brand             | varchar(100), nullable                |                                                 |
| model_number      | varchar(100), nullable                |                                                 |
| serial_number     | varchar(100), nullable                |                                                 |
| purchase_date     | date, nullable                        |                                                 |
| purchase_price    | decimal(10,2), nullable               |                                                 |
| warranty_expires  | date, nullable                        |                                                 |
| location          | varchar(255), nullable                | where in shop                                   |
| manual_url        | varchar(500), nullable                | link to PDF manual                              |
| notes             | text, nullable                        |                                                 |
| total_usage_hours | decimal(10,2)                         | default 0, tracked manually or via time entries |
| created_at        | timestamp                             |                                                 |
| updated_at        | timestamp                             |                                                 |
| deleted_at        | timestamp, nullable                   |                                                 |

**Indexes:** category_id

---

### maintenance_schedules

Define recurring maintenance tasks per tool.

| Column            | Type                | Notes                         |
| ----------------- | ------------------- | ----------------------------- |
| id                | ulid                |                               |
| tool_id           | ulid (fk → tools)   | cascade delete                |
| task              | varchar(255)        | e.g., "Replace planer blades" |
| maintenance_type  | varchar(30)         | enum: MaintenanceType         |
| interval_hours    | integer, nullable   | every N usage hours           |
| interval_days     | integer, nullable   | every N calendar days         |
| last_performed_at | timestamp, nullable |                               |
| next_due_at       | timestamp, nullable | computed                      |
| notes             | text, nullable      |                               |
| created_at        | timestamp           |                               |
| updated_at        | timestamp           |                               |

**Indexes:** tool_id, next_due_at

---

### maintenance_logs

Actual record of maintenance performed.

| Column           | Type                                        | Notes                      |
| ---------------- | ------------------------------------------- | -------------------------- |
| id               | ulid                                        |                            |
| tool_id          | ulid (fk → tools)                           | cascade delete             |
| schedule_id      | ulid (fk → maintenance_schedules), nullable | null if ad-hoc             |
| maintenance_type | varchar(30)                                 | enum: MaintenanceType      |
| description      | text                                        | what was done              |
| cost             | decimal(10,2), nullable                     | parts/supplies cost        |
| performed_at     | timestamp                                   |                            |
| usage_hours_at   | decimal(10,2), nullable                     | tool hours when maintained |
| created_at       | timestamp                                   |                            |

**Indexes:** tool_id, performed_at

---

### expenses

| Column       | Type                            | Notes                       |
| ------------ | ------------------------------- | --------------------------- |
| id           | ulid                            |                             |
| project_id   | ulid (fk → projects), nullable  | null = general shop expense |
| category     | varchar(30)                     | enum: ExpenseCategory       |
| description  | varchar(255)                    |                             |
| amount       | decimal(10,2)                   |                             |
| supplier_id  | ulid (fk → suppliers), nullable |                             |
| receipt_path | varchar(500), nullable          | photo of receipt            |
| expense_date | date                            |                             |
| created_at   | timestamp                       |                             |
| updated_at   | timestamp                       |                             |

**Indexes:** project_id, category, expense_date

---

### revenues

| Column         | Type                           | Notes                    |
| -------------- | ------------------------------ | ------------------------ |
| id             | ulid                           |                          |
| project_id     | ulid (fk → projects), nullable |                          |
| description    | varchar(255)                   |                          |
| amount         | decimal(10,2)                  |                          |
| payment_method | varchar(50), nullable          | cash, check, venmo, etc. |
| received_date  | date                           |                          |
| client_name    | varchar(255), nullable         |                          |
| created_at     | timestamp                      |                          |
| updated_at     | timestamp                      |                          |

**Indexes:** project_id, received_date

---

### cut_list_boards

Available stock boards for the cut list optimizer.

| Column      | Type                            | Notes                   |
| ----------- | ------------------------------- | ----------------------- |
| id          | ulid                            |                         |
| project_id  | ulid (fk → projects), nullable  | null = general stock    |
| material_id | ulid (fk → materials), nullable | link to inventory       |
| label       | varchar(100)                    | e.g., "Walnut Board #1" |
| length      | decimal(8,2)                    | inches                  |
| width       | decimal(8,2)                    | inches                  |
| thickness   | decimal(6,2)                    | inches                  |
| quantity    | integer                         | default 1               |
| created_at  | timestamp                       |                         |

---

### cut_list_pieces

Desired pieces to cut from available boards.

| Column          | Type                 | Notes                                 |
| --------------- | -------------------- | ------------------------------------- |
| id              | ulid                 |                                       |
| project_id      | ulid (fk → projects) | cascade delete                        |
| label           | varchar(100)         | e.g., "Side Panel A"                  |
| length          | decimal(8,2)         | inches                                |
| width           | decimal(8,2)         | inches                                |
| thickness       | decimal(6,2)         | inches                                |
| quantity        | integer              | default 1                             |
| grain_direction | boolean              | default false — if true, can't rotate |
| created_at      | timestamp            |                                       |

---

### tags

Polymorphic tagging for projects, materials, tools.

| Column | Type                 | Notes                   |
| ------ | -------------------- | ----------------------- |
| id     | ulid                 |                         |
| name   | varchar(100)         |                         |
| color  | varchar(7), nullable | hex color for UI badges |

---

### taggables (pivot)

| Column        | Type             | Notes      |
| ------------- | ---------------- | ---------- |
| tag_id        | ulid (fk → tags) |            |
| taggable_id   | ulid             |            |
| taggable_type | varchar(255)     | morph type |

**Indexes:** taggable_id + taggable_type (composite), tag_id

---

## Key Relationships Summary

```
Project hasMany: ProjectPhoto, ProjectNote, TimeEntry, ProjectMaterial, Expense, Revenue, CutListBoard, CutListPiece
Project belongsToMany: Material (through ProjectMaterial), Tag (morphToMany)

Material belongsTo: MaterialCategory, Supplier
Material belongsToMany: Project (through ProjectMaterial), Tag (morphToMany)

Tool belongsTo: ToolCategory
Tool hasMany: MaintenanceSchedule, MaintenanceLog
Tool morphToMany: Tag

MaintenanceSchedule belongsTo: Tool
MaintenanceSchedule hasMany: MaintenanceLog

Expense belongsTo: Project (nullable), Supplier (nullable)
Revenue belongsTo: Project (nullable)
```

---

## API Routes Structure

```
GET    /dashboard                    → DashboardController@index

GET    /projects                     → ProjectController@index
POST   /projects                     → ProjectController@store
GET    /projects/{project}           → ProjectController@show
PUT    /projects/{project}           → ProjectController@update
DELETE /projects/{project}           → ProjectController@destroy
POST   /projects/{project}/photos    → ProjectController@uploadPhoto
POST   /projects/{project}/time      → ProjectController@logTime
PUT    /projects/{project}/time/{entry}/stop → ProjectController@stopTimer
POST   /projects/{project}/materials → ProjectController@attachMaterial
POST   /projects/{project}/notes     → ProjectController@addNote

GET    /materials                    → MaterialController@index
POST   /materials                    → MaterialController@store
GET    /materials/{material}         → MaterialController@show
PUT    /materials/{material}         → MaterialController@update
POST   /materials/{material}/adjust  → MaterialController@adjustStock

GET    /tools                        → ToolController@index
POST   /tools                        → ToolController@store
GET    /tools/{tool}                 → ToolController@show
PUT    /tools/{tool}                 → ToolController@update
POST   /tools/{tool}/maintenance     → ToolController@logMaintenance

GET    /finance                      → FinanceController@index
POST   /finance/expenses             → FinanceController@storeExpense
POST   /finance/revenues             → FinanceController@storeRevenue

GET    /cut-list                     → CutListController@index
POST   /cut-list/optimize            → CutListController@optimize

GET    /portfolio                    → PortfolioController@index (public-facing)
```

---

## Dashboard Widgets

The main dashboard should show at a glance:

1. **Active Projects** — cards for each in_progress/finishing project with progress indicator and hours logged
2. **Low Stock Alerts** — materials below their threshold, with quick-reorder links to supplier websites
3. **Upcoming Maintenance** — tools with maintenance due within 7 days or overdue
4. **Recent Activity** — timeline of recent actions (photos added, time logged, materials used)
5. **Monthly Finance Summary** — simple bar chart: expenses vs revenue for current month, with running totals for the year
6. **Timer Widget** — persistent timer in the nav bar, one-click start/stop tied to active project

---

## Claude Code Agentic Team Build Plan

### Phase 1: Scaffold (Day 1 morning)

- Laravel project init with Breeze + React + Inertia
- Docker Compose setup (PHP-FPM, Nginx, PostgreSQL)
- All migrations from this spec
- Model definitions with relationships
- Enum classes
- Tailwind config + base layout component
- Route file with all routes stubbed

### Phase 2: Project Tracker (Day 1 afternoon – Day 2)

- Full CRUD pages for projects
- Status workflow with visual Kanban-style board view
- Time entry start/stop with persistent timer
- Photo upload with thumbnail generation
- Project notes with markdown rendering
- Project detail page showing all related data

### Phase 3: Inventory & Materials (Day 2 – Day 3 morning)

- Materials CRUD with category filtering
- Stock adjustment with history
- Supplier management
- Link materials to projects with quantity tracking
- Low stock query and alert notification
- Cost tracking per project based on materials used

### Phase 4: Tool Management (Day 3)

- Tools CRUD with categories
- Maintenance schedule definitions
- Maintenance logging
- Due/overdue calculation
- Notification system for upcoming maintenance

### Phase 5: Finances (Day 3 – Day 4 morning)

- Expense and revenue entry
- Link to projects and suppliers
- Receipt photo upload
- Monthly/yearly summary views
- Profit per project calculation
- Simple charts (Recharts)

### Phase 6: Dashboard & Polish (Day 4)

- Dashboard with all widgets
- Global search across projects/materials/tools
- Mobile responsive pass
- Dark mode (shop-friendly — bright screens in dim shops are annoying)
- Demo data seeder for showcasing

### Phase 7: Cut List Optimizer (Day 5 — stretch)

- Board and piece input UI
- First Fit Decreasing bin packing algorithm
- Visual output showing cuts on boards with waste highlighted
- Save/load cut lists per project

### Phase 8: Portfolio (Day 5 — stretch)

- Public-facing page showing portfolio-flagged photos
- Filterable by tag
- Simple, clean gallery layout
- No auth required for viewing

---

## Seed Data for Demos

The DemoDataSeeder should create:

- 6-8 projects across all statuses (include a "Kitchen Island Extension Leaf" and "MTG Deck Storage Box" for authenticity)
- 20+ materials across categories (hardwoods, plywood, hardware, finishes)
- 10+ tools with maintenance schedules
- 3-4 suppliers
- Time entries scattered across projects
- Sample expenses and revenues
- A few tags ("commission", "gift", "prototype", "shop improvement")

---

## Environment Variables

```env
APP_NAME="Workshop Manager"
APP_URL=http://localhost:8080
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=workshop
DB_USERNAME=workshop
DB_PASSWORD=<generated>
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
```

---

## Notes for Claude Code Team

- Use ULIDs throughout, not auto-incrementing IDs. Laravel supports them natively.
- Soft deletes on projects, materials, and tools. Hard delete everything else.
- Keep the UI clean and functional, not flashy. Think "tool" not "app." Good contrast, large touch targets for shop use with dirty hands.
- Mobile-first for the daily use views (timer, project status). Desktop-optimized for data entry and finance views.
- All money fields use decimal(10,2), never float.
- Photo storage: store originals + generate 400px thumbnails on upload.
- The cut list optimizer is the demo showpiece — invest in good visualization here.
