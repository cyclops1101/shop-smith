# Task 01 Plan: Install Breeze with React + Inertia Stack

**Task ID:** 01
**Domain:** fullstack
**Parallel Group:** 1 (no dependencies — runs first)
**Complexity:** medium
**Status:** pending

---

## 1. Approach

This task installs Laravel Breeze with the React + Inertia variant into a fresh Laravel 12 install that currently has no React, no Inertia, and no auth pages. The install is performed using Breeze's Artisan scaffolding command, which handles everything from Composer packages to Vite configuration in a single pass. An additional Composer package (`intervention/image`) is installed for photo thumbnail generation needed in later phases.

The approach is purely command-driven — no manual file creation is required. Breeze's scaffolding generates all the expected files. Post-install, a Vite build confirms the full JS toolchain is wired correctly.

**Why Breeze instead of Laravel's new starter kits?**
Laravel 12 introduced new Fortify-based starter kits installable via `laravel new`. However, this project already exists as a fresh install. The `laravel/breeze` Composer package continues to be the correct mechanism for adding Breeze to an existing project. The `breeze:install react --ssr` Artisan command is the authoritative install path for this scenario.

---

## 2. Files to Create or Modify

| File | Action | Notes |
|------|--------|-------|
| `composer.json` | modified | adds `laravel/breeze` (dev), `intervention/image` |
| `composer.lock` | modified | updated lock file |
| `package.json` | modified | adds `react`, `react-dom`, `@inertiajs/react`, `@vitejs/plugin-react` |
| `package-lock.json` | modified | updated lock file |
| `vite.config.js` | modified | adds `@vitejs/plugin-react`, changes input from `app.js` to `app.jsx`, adds SSR config |
| `bootstrap/app.php` | modified | `HandleInertiaRequests` middleware registered in web middleware stack |
| `routes/web.php` | modified | auth routes added by Breeze |
| `routes/auth.php` | created | Breeze auth route definitions |
| `app/Http/Middleware/HandleInertiaRequests.php` | created | Inertia request middleware |
| `resources/views/app.blade.php` | created | Inertia root HTML template |
| `resources/js/app.jsx` | created | Inertia + React bootstrap entry point |
| `resources/js/ssr.jsx` | created | SSR entry point (from `--ssr` flag) |
| `resources/js/bootstrap.js` | created | Axios setup |
| `resources/js/Pages/Auth/Login.jsx` | created | Breeze login page |
| `resources/js/Pages/Auth/Register.jsx` | created | Breeze register page |
| `resources/js/Pages/Auth/ForgotPassword.jsx` | created | Breeze forgot password page |
| `resources/js/Pages/Auth/ResetPassword.jsx` | created | Breeze reset password page |
| `resources/js/Pages/Auth/ConfirmPassword.jsx` | created | Breeze confirm password page |
| `resources/js/Pages/Auth/VerifyEmail.jsx` | created | Breeze verify email page |
| `resources/js/Pages/Dashboard.jsx` | created | Breeze dashboard stub (replaced later by Task 10) |
| `resources/js/Pages/Profile/Edit.jsx` | created | Breeze profile page |
| `resources/js/Layouts/AuthenticatedLayout.jsx` | created | Breeze authenticated shell layout |
| `resources/js/Layouts/GuestLayout.jsx` | created | Breeze guest/auth shell layout |
| `resources/js/Components/` (multiple) | created | Breeze UI primitives: ApplicationLogo, Checkbox, DangerButton, Dropdown, InputError, InputLabel, Modal, NavLink, PrimaryButton, ResponsiveNavLink, SecondaryButton, TextInput |

---

## 3. Exact Commands to Run

Run these commands in order inside the project directory. All use `./vendor/bin/sail` as the command prefix since this is a Sail project.

### Step 1 — Start Sail (if not already running)

```bash
./vendor/bin/sail up -d
```

### Step 2 — Require laravel/breeze as a dev dependency

```bash
./vendor/bin/sail composer require laravel/breeze --dev
```

Adds `laravel/breeze` to `require-dev` in `composer.json`. Breeze is a scaffolding tool with no runtime presence after its scaffolding runs; `--dev` is the correct placement.

### Step 3 — Run the Breeze installer for React + Inertia with SSR

```bash
./vendor/bin/sail artisan breeze:install react --ssr
```

This single command performs:
1. Publishes `app/Http/Middleware/HandleInertiaRequests.php`
2. Registers `HandleInertiaRequests` in `bootstrap/app.php` web middleware stack
3. Creates `resources/views/app.blade.php` (Inertia root HTML template with `@inertia` directive)
4. Creates `resources/js/app.jsx` with `createInertiaApp` using React renderer
5. Creates `resources/js/ssr.jsx` as the server-side rendering entry point
6. Creates all Breeze auth pages under `resources/js/Pages/Auth/`
7. Creates `resources/js/Pages/Dashboard.jsx` as a minimal stub
8. Creates `resources/js/Layouts/AuthenticatedLayout.jsx` and `GuestLayout.jsx`
9. Creates `resources/js/Components/` with Breeze UI primitives
10. Updates `vite.config.js` to add `@vitejs/plugin-react` and the `app.jsx` + `ssr.jsx` inputs
11. Updates `package.json` to add React, react-dom, @inertiajs/react, @vitejs/plugin-react
12. Creates `routes/auth.php` and includes it in `routes/web.php`

### Step 4 — Require intervention/image

```bash
./vendor/bin/sail composer require intervention/image
```

Installs `intervention/image` v3.x (the PHP 8.x compatible major version). This package is used in later phases for photo thumbnail generation. Installing it now satisfies the Task 01 acceptance criterion and avoids a separate Composer install step later. The Sail container includes the GD extension by default, which is the required image driver for `intervention/image` v3.

### Step 5 — Install npm dependencies

```bash
./vendor/bin/sail npm install
```

Installs the new packages added to `package.json` by `breeze:install`: `react`, `react-dom`, `@inertiajs/react`, `@vitejs/plugin-react`.

### Step 6 — Run migrations

```bash
./vendor/bin/sail artisan migrate
```

Applies the baseline Laravel migrations (users, password_reset_tokens, sessions, cache, jobs tables). Breeze does not add new migrations of its own, but this confirms the database connection is working and the schema baseline is in place.

### Step 7 — Verify build succeeds

```bash
./vendor/bin/sail npm run build
```

Confirms Vite can compile the full React + Inertia + Tailwind stack without errors. This is the primary smoke test for the install.

---

## 4. Key Decisions

### Decision 1: Use `--ssr` flag

The task manifest specifies `--ssr`. SSR provides server-rendered first paint for the public Portfolio page, which is a goal from the spec. The SSR entry point (`ssr.jsx`) and SSR build config are scaffolded automatically. The SSR build does not run by default in `npm run dev`; it requires a separate `npm run build:ssr` command, so it adds no friction to daily development.

If `--ssr` causes issues on the specific Breeze version installed, fall back to `breeze:install react` (without SSR) and note the deviation. The non-SSR path is fully functional for all app features; SSR on the portfolio page would then require a later dedicated implementation.

### Decision 2: intervention/image installed now, not later

The Task 01 acceptance criterion explicitly requires `intervention/image` in `composer.json`. Installing it here keeps later tasks focused on implementation. The package has no side effects until its Facade is called.

### Decision 3: Breeze-generated components are not the shadcn primitives

Breeze scaffolds its own component files into `resources/js/Components/` (e.g., `PrimaryButton.jsx`, `TextInput.jsx`, `Modal.jsx`). Task 05 creates shadcn-style UI primitives in `resources/js/Components/ui/`. These are separate directories and do not conflict. The Breeze components are used by Breeze's auth pages only; app feature pages use the `ui/` primitives from Task 05.

### Decision 4: `vite.config.js` will be overwritten — restore watch config after

The existing `vite.config.js` has a `server.watch.ignored` block for `storage/framework/views/`. Breeze's install overwrites `vite.config.js` with a new config. After `breeze:install` runs, manually verify the output `vite.config.js` and add back the `server.watch.ignored` setting if it is missing:

```js
server: {
    watch: {
        ignored: ['**/storage/framework/views/**'],
    },
},
```

### Decision 5: `resources/js/app.js` is replaced by `app.jsx`

The existing project has `resources/js/app.js` and `vite.config.js` references it. After `breeze:install`, `app.jsx` is created and `vite.config.js` is updated to reference it. The old `app.js` file may or may not be removed by Breeze. Confirm `resources/js/app.jsx` exists and `vite.config.js` input references it. If the old `app.js` still exists, it can be deleted.

---

## 5. Verified Dependencies

| Package | Version | Registry | Verification |
|---------|---------|----------|-------------|
| `laravel/breeze` | ^2.x | Composer | Supports Laravel 12; `breeze:install react --ssr` command exists in v2 |
| `intervention/image` | ^3.x | Composer | PHP 8.x support; GD driver available in Sail container (php8.3-gd) |
| `@inertiajs/react` | Installed by Breeze | npm | Inertia 2.x; compatible with React 19 |
| `react` + `react-dom` | ^19 | npm | Installed by Breeze; compatible with Inertia 2.x |
| `@vitejs/plugin-react` | Installed by Breeze | npm | Vite 7 compatible |
| `tailwindcss` | ^4.0.0 | npm | Already in project; no conflict with Breeze install |
| `@tailwindcss/vite` | ^4.0.0 | npm | Already in project; no conflict with Breeze install |

The project already has `tailwindcss ^4.0.0` and `@tailwindcss/vite ^4.0.0`. Breeze may attempt to scaffold a `tailwind.config.js` (Tailwind 3 convention). Since this project uses Tailwind 4's CSS-first configuration (no `tailwind.config.js`), do not commit any generated `tailwind.config.js` file if one appears.

---

## 6. Risks and Mitigations

### Risk 1: Breeze installs Tailwind 3 config alongside Tailwind 4

**Risk:** `breeze:install` may publish a `tailwind.config.js` file because Breeze's templates were built against Tailwind 3. Tailwind 4 uses CSS-based config, not `tailwind.config.js`. The two can coexist, but Tailwind 4 will ignore the `.js` config file, which may cause confusion.

**Mitigation:** After install, check for a generated `tailwind.config.js`. If found, delete it. The project's existing `@tailwindcss/vite` plugin in `vite.config.js` is the correct Tailwind 4 setup. Breeze's auth pages use standard utility classes (not `@apply`) and are compatible with Tailwind 4 as long as the plugin is running.

### Risk 2: Laravel 12 Breeze compatibility

**Risk:** Laravel 12 documentation focuses on the new Fortify-based starter kits. The `laravel/breeze` package may have minor incompatibilities with Laravel 12.53.0.

**Mitigation:** `laravel/breeze ^2.x` explicitly supports Laravel 10, 11, and 12. If `breeze:install` fails, check the Breeze GitHub repository for the minimum Laravel version requirement of the installed version. The fallback is to manually scaffold the required files (HandleInertiaRequests, app.blade.php, app.jsx) following the Breeze source.

### Risk 3: SSR build failures

**Risk:** If `@vitejs/plugin-react` installed by Breeze is incompatible with Vite 7, the SSR build may fail.

**Mitigation:** `npm run build` (not `build:ssr`) is the acceptance criterion. If SSR build fails but the client build succeeds, the task criteria are still met. Document the SSR issue as a separate concern for later resolution. The app runs without SSR for all phases.

### Risk 4: `intervention/image` v3 vs v2 API

**Risk:** Code written for `intervention/image` v2 (which uses `Image::make()`) is incompatible with v3 (which uses `Image::read()`). If the system has v2 cached or if future code references v2 APIs, it will fail at runtime.

**Mitigation:** `sail composer require intervention/image` installs the latest stable version, which is v3.x for PHP 8. All code written in later tasks (Task 07, photo upload) must use the v3 API (`Intervention\Image\Laravel\Facades\Image` with `read()` method). This is a documentation/convention note for the implementing agent of Task 07.

---

## 7. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| `composer.json` includes `laravel/breeze` | Step 2: `sail composer require laravel/breeze --dev` |
| `composer.json` includes `intervention/image` | Step 4: `sail composer require intervention/image` |
| `package.json` includes `@inertiajs/react`, `react`, `react-dom`, `@vitejs/plugin-react` | Step 3: `breeze:install react --ssr` updates `package.json` automatically |
| `resources/js/app.jsx` exists and bootstraps Inertia with React | Step 3: created by `breeze:install` with `createInertiaApp` and React renderer |
| `resources/js/Pages/Auth/Login.jsx` and other Breeze auth pages exist | Step 3: created by `breeze:install` |
| `resources/js/Layouts/AuthenticatedLayout.jsx` and `GuestLayout.jsx` exist | Step 3: created by `breeze:install` |
| `app/Http/Middleware/HandleInertiaRequests.php` exists and is registered | Step 3: published and registered by `breeze:install` in `bootstrap/app.php` |
| `resources/views/app.blade.php` exists as the Inertia root template | Step 3: created by `breeze:install` with `@inertia` directive |
| `vite.config.js` includes `@vitejs/plugin-react` | Step 3: `vite.config.js` updated by `breeze:install` |
| `npm run build` succeeds without errors | Step 7: verified by running build and checking exit code |
| `php artisan migrate` runs Breeze default migrations without errors | Step 6: runs all pending migrations; confirms DB connection and schema |

---

## 8. Post-Install Verification Checklist

After all steps complete, verify each item:

1. `composer show laravel/breeze` — confirms Breeze is installed
2. `composer show intervention/image` — confirms image package is installed
3. `cat package.json | grep '"@inertiajs/react"'` — shows Inertia listed
4. `ls resources/js/` — shows `app.jsx` (not just `app.js`)
5. `ls resources/js/Pages/Auth/` — shows `Login.jsx`, `Register.jsx`, etc.
6. `ls app/Http/Middleware/` — shows `HandleInertiaRequests.php`
7. `grep -n 'HandleInertiaRequests' bootstrap/app.php` — confirms middleware is registered
8. `cat resources/views/app.blade.php | grep '@inertia'` — confirms Inertia root template
9. `cat vite.config.js | grep 'plugin-react'` — confirms React plugin in Vite config
10. `./vendor/bin/sail npm run build` — exits 0 with no errors
