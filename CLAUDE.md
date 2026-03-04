# Workshop Manager — CLAUDE.md

## Project Overview
Self-hosted workshop/shop management tool for a solo woodworker. Manages projects, inventory, tools, and finances.

## Tech Stack
- **Backend:** Laravel 12 (PHP 8.3) with Laravel Sail
- **Frontend:** React 19 via Inertia.js + Tailwind CSS 4
- **Database:** MySQL 8 (via Sail)
- **Auth:** Laravel Breeze (React + Inertia stack)
- **Queue:** Database driver
- **Search:** Laravel Scout with database driver

## Conventions

### Backend
- Use ULIDs for all primary keys (`$table->ulid('id')->primary()`, `HasUlids` trait)
- Soft deletes on: projects, materials, tools. Hard delete everything else.
- All money fields: `decimal(10,2)` — never float
- PHP Enums (backed by strings) for status/type fields
- Form requests for all validation — never validate in controllers
- Route model binding with slug for projects, ULID for other models
- Use Laravel's built-in features: Eloquent scopes, observers, policies, service classes
- Fat models, thin controllers — business logic in models or dedicated service classes
- Return Inertia responses from controllers (`Inertia::render()`)

### Frontend
- JSX file extensions (not TSX)
- Inertia.js `useForm`, `router`, `usePage` for all data flow
- Shared layout via `AppLayout.jsx`
- Component directory: `resources/js/Components/`
- Page directory: `resources/js/Pages/`
- Use shadcn-style UI primitives in `Components/ui/`

### Database
- Migrations use descriptive names: `create_projects_table`, `create_materials_table`
- Foreign keys with explicit cascade rules per spec
- Indexes on columns used in queries/filters

### Testing
- Feature tests for all controller actions
- Use factories for test data
- Run tests: `./vendor/bin/sail artisan test` or `php artisan test`

### Dev Environment
- Local dev via Laravel Sail: `./vendor/bin/sail up`
- Dev server: `./vendor/bin/sail composer dev` (runs artisan serve + queue + pail + vite)
- Use `sail artisan` for all artisan commands

## File Reference
- Spec: `shop-manager-spec.md` — full project specification with schema, routes, and build phases
