# Phase 1 Scaffold -- Dev Supervisor Review

**Reviewer:** Dev Supervisor
**Date:** 2026-03-03
**Scope:** All 12 task plans (task-01-plan.md through task-12-plan.md)
**Project State:** Fresh Laravel 12.53.0 skeleton with Sail, MySQL 8, PHPUnit 11 (no Pest), no Breeze, no React, no Inertia

---

## Executive Summary

The 12 plans are generally well-written, thorough, and demonstrate strong understanding of the Laravel ecosystem. However, several CRITICAL issues must be resolved before implementation can proceed safely. The most significant cross-cutting finding is that **Tasks 07, 08, and 09 write test files using Pest PHP syntax, but the project currently uses PHPUnit class-based tests** -- Pest is not installed. Additionally, **Task 04 has an internal contradiction in timestamp handling** (the risk section identifies the bug, but the model code still contains it), and **the `->withTimestamps()` call on `project_materials` BelongsToMany will cause SQL errors** because that pivot table has no `updated_at` column. Finally, **Scout installation ordering creates a class-not-found hazard** between Tasks 04 and 12.

**Verdict Summary:**
| Task | Verdict |
|------|---------|
| 01 | APPROVED |
| 02 | APPROVED |
| 03 | APPROVED |
| 04 | NEEDS_REVISION |
| 05 | APPROVED (with warnings) |
| 06 | NEEDS_REVISION |
| 07 | NEEDS_REVISION |
| 08 | NEEDS_REVISION |
| 09 | NEEDS_REVISION |
| 10 | APPROVED |
| 11 | APPROVED |
| 12 | NEEDS_REVISION |

**Blocking issues:** 6 CRITICAL findings across 7 tasks.

---

## Task-by-Task Review

---

### Task 01: Install Breeze with React + Inertia Stack

**Verdict: APPROVED**

**Findings:**

1. **[INFO] Tailwind 4 conflict awareness is excellent.** The plan correctly identifies that Breeze may scaffold a `tailwind.config.js` (Tailwind 3 convention) and provides a clear mitigation: delete it if generated. The project already has Tailwind 4 via `@tailwindcss/vite`. This is accurate.

2. **[INFO] `intervention/image` v3 API notes are correct.** The plan correctly identifies that v3 uses `ImageManager::gd()` / `Image::read()`, not the v2 `Image::make()` pattern, and documents this for later tasks.

3. **[INFO] Vite watch config preservation is a good catch.** The existing `vite.config.js` has a `server.watch.ignored` block for `storage/framework/views/`. The plan correctly notes Breeze will overwrite this file and documents the need to restore the setting.

4. **[WARNING] SSR flag assumption.** The plan uses `breeze:install react --ssr`. While it correctly documents a fallback (drop `--ssr` if it fails), this adds complexity. SSR with Vite 7 and the latest `@vitejs/plugin-react` should work, but the fallback path is well-documented.

5. **[INFO] GD extension availability confirmed.** The default Sail PHP image includes `php8.3-gd`.

6. **[INFO] Breeze vs Starter Kits distinction is accurate.** `laravel/breeze` as a Composer package is the correct approach for adding auth to an existing project. The new starter kits are for `laravel new` only.

7. **[INFO] Post-install verification checklist is comprehensive.** 10-point checklist covers all acceptance criteria.

**Required Changes:** None.

---

### Task 02: PHP Enum Classes

**Verdict: APPROVED**

**Findings:**

1. **[INFO] All 5 enums match the spec exactly.** Cross-referenced all case values against `shop-manager-spec.md` schema section. All cases, backing values, and counts are correct. `MaterialUnit` has 14 cases, `ProjectStatus` has 7, `ProjectPriority` has 4, `ExpenseCategory` has 6, `MaintenanceType` has 8.

2. **[INFO] Test uses PHPUnit 11 `#[Test]` attribute.** The project has PHPUnit 11.5 in `composer.json`. Using the attribute annotation style is correct and modern.

3. **[INFO] `label()` method with `match` expression is well-reasoned.** Explicit labels avoid potential `ucwords` issues with multi-word snake_case values.

4. **[INFO] No PHP reserved word conflicts.** All 39 enum case names have been verified as non-reserved.

**Required Changes:** None.

---

### Task 03: Database Migrations -- All 17 App Tables

**Verdict: APPROVED**

**Findings:**

1. **[INFO] MySQL correctly targeted throughout.** No PostgreSQL-specific syntax (sequences, `serial`, `jsonb`, etc.) detected. All Blueprint methods are MySQL-compatible.

2. **[INFO] ULID primary keys correctly implemented.** Every application table uses `$table->ulid('id')->primary()`. The `taggables` pivot correctly omits its own `id` and uses a composite PK.

3. **[INFO] Soft deletes correctly limited.** Only `projects`, `materials`, and `tools` have `$table->softDeletes()`. Verified against CLAUDE.md governance rule.

4. **[INFO] All money fields use `decimal(10,2)`.** Verified: `estimated_cost`, `actual_cost`, `sell_price`, `unit_cost`, `quantity_on_hand`, `low_stock_threshold`, `cost_at_time`, `amount`, `purchase_price`, `cost`, `usage_hours_at`, `total_usage_hours` all use appropriate decimal precision. `estimated_hours` correctly uses `decimal(8,2)`.

5. **[INFO] Cascade rules fully verified.** Cross-referenced every FK cascade behavior against the spec:
   - CASCADE DELETE: project_photos, project_notes, time_entries, project_materials (both FKs), cut_list_pieces, maintenance_schedules, maintenance_logs (tool_id), taggables
   - SET NULL: materials.category_id, materials.supplier_id, tools.category_id, expenses.project_id, expenses.supplier_id, revenues.project_id, cut_list_boards.project_id, cut_list_boards.material_id, maintenance_logs.schedule_id
   All correct.

6. **[INFO] `foreignUlid()` usage is correct.** Available since Laravel 9, creates `char(26)` columns with proper constraint chaining.

7. **[INFO] Timestamp-only tables handled correctly.** Tables with `created_at` only use `$table->timestamp('created_at')->nullable()`. Tables with no timestamps omit both columns.

8. **[INFO] Dependency ordering is valid.** Tables are ordered so every FK reference points to an already-created table. Level 0 through Level 3 + pivot is correct.

9. **[INFO] `char(26)` vs `varchar(26)` note is accurate.** MySQL's `$table->ulid()` creates `char(26)`. The verification queries correctly expect this.

**Required Changes:** None.

---

### Task 04: Eloquent Models with Relationships, Casts, and Traits

**Verdict: NEEDS_REVISION**

**Findings:**

1. **[CRITICAL] `$timestamps = false` contradicts `const UPDATED_AT = null` on 6 models.** The model code for `ProjectPhoto`, `TimeEntry`, `ProjectMaterial`, `MaintenanceLog`, `CutListBoard`, and `CutListPiece` shows both `public $timestamps = false;` AND `const UPDATED_AT = null;`. Setting `$timestamps = false` disables ALL automatic timestamp management -- Eloquent will NOT auto-set `created_at`. The plan's own Risk 4 section identifies this exact problem and states the correct fix: "Use `const UPDATED_AT = null;` instead of `$timestamps = false`." However, the actual model code shown in Section 4 still has `$timestamps = false`. The risk section contradicts the implementation.

   **Fix required:** Remove `public $timestamps = false;` from all six affected models. Keep only `const UPDATED_AT = null;`. This tells Eloquent to auto-manage `created_at` but skip `updated_at`.

2. **[CRITICAL] `->withTimestamps()` on `Project::materials()` and `Material::projects()` will cause SQL errors.** The `project_materials` table (Task 03 migration) has only `created_at` -- no `updated_at` column. Calling `->withTimestamps()` on the BelongsToMany relationship makes Eloquent attempt to set both `created_at` AND `updated_at` on attach/sync operations. This will produce a MySQL `Column not found: 1054 Unknown column 'updated_at'` error. The plan's own Risk 6 section identifies this exact issue but the model code still includes `->withTimestamps()`.

   **Fix required:** Remove `->withTimestamps()` from the `materials()` BelongsToMany in `Project.php` AND the `projects()` BelongsToMany in `Material.php`. Handle `created_at` via the `ProjectMaterial` pivot model's timestamp behavior (with `const UPDATED_AT = null`).

3. **[CRITICAL] `laravel/scout` not installed when Task 04 runs.** Task 04 is in Parallel Group 3 (depends on Tasks 02 and 03). Task 12 (Scout configuration) is in Group 4. Scout is NOT currently in `composer.json`. The `Project`, `Material`, and `Tool` models include `use Laravel\Scout\Searchable;`. When PHP autoloads any of these models, it will throw `Class 'Laravel\Scout\Searchable' not found`. The plan acknowledges this in Risk 1 and says "install if needed," but this is buried in a risk section rather than being an explicit prerequisite step.

   **Fix required:** Add an explicit first step: "Run `./vendor/bin/sail composer require laravel/scout` before creating any model files." Alternatively, move Scout installation to Task 01 (where `intervention/image` is also installed as a forward dependency). This is the cleanest approach -- Task 01 already has a pattern for "install now, configure later."

4. **[WARNING] `ProjectMaterial` model is missing `HasFactory` trait.** The model extends `Pivot` and includes `HasUlids`, but does not include `use HasFactory;`. Task 08 (factories) depends on `ProjectMaterial::factory()` being callable, which requires `HasFactory`. Laravel's `Pivot` class does not include `HasFactory` by default.

   **Fix required:** Add `use Illuminate\Database\Eloquent\Factories\HasFactory;` and `use HasFactory;` to the `ProjectMaterial` model.

5. **[INFO] `getRouteKeyName()` correctly returns `'slug'` only on `Project`.** Matches CLAUDE.md: "Route model binding with slug for projects, ULID for other models." All other models use the default `id` key.

6. **[INFO] Slug auto-generation with `withTrashed()` uniqueness check is well-designed.** Using `static::withTrashed()->where('slug', $slug)->exists()` prevents recycling slugs from soft-deleted projects.

7. **[INFO] Enum casts are correctly implemented.** All enum columns map to their PHP enum class via the `$casts` property.

8. **[INFO] Tag `morphedByMany` / `morphToMany` pattern is correct.** The morph name `'taggable'` matches the `taggables` pivot table columns.

9. **[INFO] Decision to NOT cast decimal columns is reasonable.** MySQL returns decimals as strings via PDO, and leaving them uncast avoids float precision issues. Formatting at the presentation layer is the correct approach.

**Required Changes:**
- Remove `$timestamps = false` from `ProjectPhoto`, `TimeEntry`, `ProjectMaterial`, `MaintenanceLog`, `CutListBoard`, `CutListPiece`. Keep `const UPDATED_AT = null` only.
- Remove `->withTimestamps()` from `Project::materials()` and `Material::projects()`.
- Add `use HasFactory;` trait to `ProjectMaterial`.
- Add explicit step to install `laravel/scout` before creating models (or move to Task 01).

---

### Task 05: Frontend Base Layout and UI Primitives

**Verdict: APPROVED (with warnings)**

**Findings:**

1. **[INFO] Component architecture is sound.** shadcn-style primitives with className pass-through, variant props, and no external UI library dependency. This matches CLAUDE.md's "shadcn-style UI primitives in `Components/ui/`."

2. **[INFO] Tailwind CSS 4 compatibility is correctly addressed.** The plan explicitly notes that `ring-offset-*` utilities changed in v4 and avoids using them. All utility classes used are standard Tailwind v4 classes.

3. **[WARNING] `Modal.jsx` uses `createPortal` but SSR guard is not in code.** Task 01 uses `--ssr` flag, and `createPortal(content, document.body)` throws in SSR context. The plan documents the mitigation (`if (typeof document === 'undefined') return null;`) but does NOT include it in the actual Modal component code. The implementer must add this guard.

4. **[WARNING] `Alert.jsx` uses Unicode characters for icons.** The icon indicators (info, warning, error, success) are Unicode text characters. These may render inconsistently across platforms. Acceptable for stubs but should be replaced with inline SVGs later.

5. **[INFO] Active nav detection logic is correct.** `startsWith` for nested routes with `exact: true` for Dashboard prevents false matches.

6. **[INFO] No icon library dependency is pragmatic.** Inline SVGs with `currentColor` are zero-dependency and replaceable later.

7. **[INFO] Card and Table use named exports for compound components.** This matches the task manifest specification and enables tree-shaking.

8. **[INFO] Badge `color` prop with inline style is the correct approach for arbitrary hex colors.** Tailwind's JIT does not know hex values at build time, so inline styles are necessary.

**Required Changes:** None (warnings are non-blocking, but the SSR guard should be added during implementation).

---

### Task 06: Routes and Controller Stubs

**Verdict: NEEDS_REVISION**

**Findings:**

1. **[CRITICAL] Controller stubs use `Illuminate\Http\Request` instead of Form Requests.** The plan explicitly states this is intentional ("Task 07 implementor will swap these"). However, this means Task 09's validation failure tests (e.g., "fails to store project without title") will NOT pass at the stub stage because the stub controllers perform no validation. `assertSessionHasErrors('title')` will fail because no validation errors are flashed. This creates known-failing tests in the suite, which is a poor testing practice.

   **Fix required:** Coordinate with Tasks 07 and 09. Either:
   (a) Wire Form Requests into controller stubs at implementation time (since Task 07 is in the same parallel group as Task 06), or
   (b) Mark validation failure tests in Task 09 with `$this->markTestSkipped('Validation not wired until Form Requests are connected')`, or
   (c) Remove validation failure tests from the Task 09 stub phase entirely.

2. **[INFO] Route map matches the spec exactly.** All 26 routes from the spec API routes section are present. Route names match the task manifest. The authenticated group correctly wraps all routes except `portfolio.index`.

3. **[INFO] `Route::resource()` usage is correct.** Materials and Tools correctly use `only:` to exclude `destroy` (spec does not list DELETE routes for these).

4. **[INFO] Route model binding parameter names are correct.** `{project}` binds by slug (via `getRouteKeyName()`), `{material}`, `{tool}`, `{entry}` bind by ULID.

5. **[INFO] Inertia component strings match Task 10 page file paths.** All component strings (`'Projects/Index'`, `'Materials/Show'`, etc.) correspond to the file structure in Task 10.

6. **[WARNING] `Inertia\Response` import may conflict with `Symfony\Component\HttpFoundation\Response`.** The plan notes this risk and suggests aliasing if needed. Acceptable.

**Required Changes:**
- Coordinate with Tasks 07 and 09 on validation failure test strategy.

---

### Task 07: Form Request Stubs with Validation Rules

**Verdict: NEEDS_REVISION**

**Findings:**

1. **[CRITICAL] `FormRequestTest.php` uses Pest PHP syntax, but Pest is not installed.** The test file uses `it('StoreProjectRequest has rules', function () {...})`. The project uses PHPUnit 11.5 with class-based tests. `pestphp/pest` is NOT in `composer.json`'s `require-dev`. The `it()` function will be undefined, and the test file will fail to parse.

   **Evidence:** `composer.json` `require-dev` section contains `phpunit/phpunit: ^11.5.3` but no `pestphp/pest`. Existing test files use `class ExampleTest extends TestCase` with `public function test_...()` methods.

   **Fix required:** Rewrite `FormRequestTest.php` using PHPUnit class syntax:
   ```php
   class FormRequestTest extends TestCase
   {
       public function test_store_project_request_has_rules(): void
       {
           $request = new StoreProjectRequest();
           $this->assertIsArray($request->rules());
           $this->assertNotEmpty($request->rules());
       }
       // ... for all 15 request classes
   }
   ```

2. **[INFO] `Rule::enum()` usage is correct.** Available since Laravel 9, confirmed in Laravel 12.

3. **[INFO] `'ulid'` validation rule is valid.** Built-in since Laravel 10. Correctly placed before `Rule::exists()` to prevent DB lookups on malformed input.

4. **[INFO] `Rule::exists()` FK checks reference correct tables and columns.** All FK fields check `Rule::exists('table_name', 'id')`.

5. **[INFO] Separate Store/Update requests with `sometimes` on Update is correct.** Allows partial updates.

6. **[INFO] `CutListRequest` nested array validation is correct.** `'boards.*.length'` and `'pieces.*.grain_direction'` use the proper wildcard syntax.

7. **[WARNING] `StoreExpenseRequest.receipt_path` is validated as a string, not a file upload.** The spec says this is a "photo of receipt." If this is intended as a file upload (like project photos), it should use `'file', 'image'` rules. If it stores a pre-uploaded path, string is correct. The plan should clarify intent.

**Required Changes:**
- Rewrite `FormRequestTest.php` to use PHPUnit class syntax.

---

### Task 08: Model Factories for All Models

**Verdict: NEEDS_REVISION**

**Findings:**

1. **[CRITICAL] `FactoryTest.php` uses Pest PHP syntax.** Same issue as Task 07. Uses `it('all factories produce valid data with make()', function () {...})` and `expect(...)` assertion chain. Pest is not installed. Must use PHPUnit syntax.

   **Fix required:** Rewrite `FactoryTest.php` using PHPUnit class syntax.

2. **[CRITICAL] `ProjectMaterial::factory()` depends on `HasFactory` trait, which is missing from the model.** Task 04's `ProjectMaterial` model code does not include `HasFactory`. Calling `ProjectMaterial::factory()` will throw `BadMethodCallException`. This is a Task 04 dependency issue that must be resolved before Task 08 can succeed.

   **Fix required:** This is a Task 04 fix (see Task 04 finding #4). Task 08 should note this cross-task dependency explicitly.

3. **[WARNING] `ProjectMaterialFactory` needs `$model` property.** The plan mentions in Risk 2 that "the factory class must specify `protected $model = ProjectMaterial::class`" but this is not shown in the factory code in Section 3. The implementer must remember to add it. Without it, Laravel's factory resolution may fail for a Pivot model.

4. **[INFO] Enum values correctly use `->value`.** `fake()->randomElement(EnumClass::cases())->value` returns the string backing value. Correct for database storage.

5. **[INFO] `ProjectFactory` correctly omits `slug`.** The model's `booted()` observer auto-generates it. Not setting it in the factory avoids confusion.

6. **[INFO] `TagFactory` color uses `sprintf('#%06x', ...)`.** Deterministic, always produces valid 7-char hex. Better than `fake()->hexColor()`.

7. **[INFO] Domain-specific Faker data adds realism.** Woodworking brands, material categories, and part labels make test data recognizable.

8. **[INFO] Nullable FK defaults to `null` with factory states for relationships.** This is the correct pattern -- avoids cascading factory creation and speeds up tests.

**Required Changes:**
- Rewrite `FactoryTest.php` to use PHPUnit class syntax.
- Add explicit note about `HasFactory` dependency on Task 04.

---

### Task 09: Feature Test Stubs for All Controller Actions

**Verdict: NEEDS_REVISION**

**Findings:**

1. **[CRITICAL] All 7 test files use Pest PHP syntax.** Every file uses `it('...', function () {...})`, `uses(RefreshDatabase::class)`, and `expect(...)` chains. Pest is NOT installed. All 7 files will fail with `Call to undefined function it()`.

   **Fix required:** Rewrite all 7 test files using PHPUnit class syntax:
   ```php
   class ProjectControllerTest extends TestCase
   {
       use RefreshDatabase;

       public function test_it_redirects_guests_from_projects_index(): void
       {
           $this->get('/projects')->assertRedirect('/login');
       }
       // ... etc
   }
   ```

2. **[CRITICAL] Validation failure tests will fail at the stub stage.** Tests like "fails to store project without title" call `assertSessionHasErrors('title')`. But Task 06 controller stubs use plain `Illuminate\Http\Request` -- no validation is performed. The assertion fails because no errors are flashed to the session. The plan acknowledges this in Risk 4 and recommends "including them as failing stubs to make the test suite's aspirational state visible." This normalizes test failures and is bad practice.

   **Fix required:** Either:
   (a) Skip these tests with `$this->markTestSkipped('Requires Form Request wiring')` and a clear comment, or
   (b) Remove validation failure tests from this task entirely and create them when Form Requests are wired into controllers, or
   (c) Wire Form Requests into controller stubs before writing these tests (coordinate with Task 07).

3. **[INFO] `assertInertia()` with `AssertableInertia` is correct.** Import path `Inertia\Testing\AssertableInertia as Assert` is valid for `inertiajs/inertia-laravel` v2.x (installed by Breeze).

4. **[INFO] Storage::fake usage for photo upload test is correct.** Defensive pattern that works with both stubs and real implementations.

5. **[INFO] Portfolio test correctly omits `actingAs()`.** Verifies public access by making an unauthenticated request.

6. **[INFO] Factory usage for test data follows CLAUDE.md.** `Project::factory()->create()`, `Material::factory()->create()`, etc. No hardcoded IDs.

7. **[INFO] `TimeEntry::factory()->running()` state is well-used.** Tests the `stopTimer` endpoint with a timer that has `ended_at = null`.

**Required Changes:**
- Rewrite all 7 test files to use PHPUnit class syntax.
- Handle validation failure tests: skip, remove, or coordinate with Task 07.

---

### Task 10: Page Component Stubs

**Verdict: APPROVED**

**Findings:**

1. **[INFO] All 16 page stubs are minimal but valid.** Each accepts the correct prop shape and wraps content in `AppLayout` (except Portfolio).

2. **[INFO] `Portfolio/Index.jsx` correctly uses a bare `<main>` wrapper.** No `AppLayout`, no auth dependency. Matches the public-facing requirement.

3. **[INFO] Import paths are correct.** Root-level pages use `../Layouts/AppLayout`, nested pages use `../../Layouts/AppLayout`. Both patterns resolve correctly.

4. **[WARNING] Dashboard.jsx may overwrite Task 05's more complete version.** The plan acknowledges this ("If `Dashboard.jsx` exists from Task 05, update it"). The Task 05 Dashboard has a widget grid placeholder; Task 10's version is simpler. The implementer should check if Task 05's version exists and preserve its richer content.

5. **[INFO] Component names match Inertia render strings from Task 06.** `'Projects/Index'` maps to `resources/js/Pages/Projects/Index.jsx`. All verified.

6. **[INFO] Props are destructured in function signatures.** Makes the expected data shape explicit for future implementers.

**Required Changes:** None.

---

### Task 11: HandleInertiaRequests Shared Data

**Verdict: APPROVED**

**Findings:**

1. **[INFO] `auth.user` whitelist with `only(['id', 'name', 'email'])` is correct.** Prevents exposure of `password`, `remember_token`, and other sensitive fields.

2. **[INFO] PHP nullsafe operator `?->only()` handles guest users correctly.** Returns `null` when `$request->user()` is null. No error thrown.

3. **[INFO] All four flash keys always present (even if null) is good practice.** Frontend code can reference `flash.success` without optional chaining.

4. **[INFO] `array_merge(parent::share($request), [...])` preserves Breeze shared data.** Correct approach -- does not overwrite anything Breeze already shares.

5. **[INFO] `session()->get()` returns null when key is absent.** No null-coalescing needed. Clean implementation.

6. **[INFO] The full implementation code in the appendix is complete and correct.** Ready to use as-is after Breeze creates the base file.

**Required Changes:** None.

---

### Task 12: Laravel Scout Configuration

**Verdict: NEEDS_REVISION**

**Findings:**

1. **[CRITICAL] Scout installation timing conflict with Task 04.** Task 04 (Group 3) adds `use Laravel\Scout\Searchable;` to `Project`, `Material`, and `Tool`. Task 12 (Group 4) installs Scout via `composer require laravel/scout`. When Task 04 runs, `laravel/scout` is NOT in `composer.json` and the `Laravel\Scout\Searchable` class does not exist. Any attempt to autoload these models will fail with `Class 'Laravel\Scout\Searchable' not found`. The dependency graph declares Task 12 after Task 04, creating a guaranteed failure.

   **Fix required:** Choose one of:
   (a) **Move Scout installation to Task 01.** Task 01 already installs `intervention/image` as a forward dependency. Adding `laravel/scout` follows the same pattern: "install now, configure later." This is the cleanest solution.
   (b) **Move Scout installation to Task 04 as an explicit first step.** This keeps Scout with the models that use it.
   (c) **Move `Searchable` trait addition from Task 04 to Task 12.** Task 04 creates models without the trait; Task 12 adds it when Scout is installed.

   Recommendation: Option (a). Add `./vendor/bin/sail composer require laravel/scout` to Task 01, Step 4 (alongside `intervention/image`).

2. **[WARNING] `toSearchableArray()` described as "add" but Task 04 already creates stubs.** Task 04 creates stub `toSearchableArray()` methods returning `$this->toArray()`. Task 12 replaces them with specific field arrays. The plan should say "replace the stub `toSearchableArray()`" to avoid confusion. The implementer must use Edit (not Write/create) to modify the existing methods.

3. **[INFO] `SCOUT_DRIVER=database` is correct.** Matches CLAUDE.md specification.

4. **[INFO] Scout version `^10.0` is compatible with Laravel 12.** Confirmed.

5. **[INFO] `scout.queue = false` is correct for synchronous indexing.** Appropriate for a single-user tool.

6. **[INFO] `toSearchableArray()` field selections are well-reasoned.** Only text-searchable columns are included. `id` (ULID) is included for exact-match debugging lookups.

**Required Changes:**
- Resolve Scout installation ordering. Recommend moving `composer require laravel/scout` to Task 01.
- Update plan wording from "add `toSearchableArray()`" to "replace stub `toSearchableArray()`."

---

## Cross-Cutting Issues

### Issue 1: Pest vs PHPUnit (CRITICAL)

**Affected Tasks:** 07, 08, 09

The project currently uses **PHPUnit 11.5** with class-based test syntax. Evidence:
- `composer.json` has `phpunit/phpunit: ^11.5.3` in `require-dev`
- `pestphp/pest` is NOT in `require-dev`
- `tests/Feature/ExampleTest.php` uses `class ExampleTest extends TestCase` with `public function test_...()` methods
- `tests/Unit/ExampleTest.php` uses `class ExampleTest extends PHPUnit\Framework\TestCase`
- `phpunit.xml` exists with standard PHPUnit configuration

Tasks 07, 08, and 09 all write test files using Pest's function-based syntax (`it('...', function () {...})`, `uses()`, `expect()`). These will fail with `Call to undefined function it()`.

**Important nuance:** Breeze (Task 01) may install Pest when it scaffolds the project. Recent versions of `laravel/breeze` DO install Pest by default with the `breeze:install react` command. If this happens, the existing PHPUnit example tests would need to be migrated to Pest format. However, the plans should NOT silently assume this -- they should explicitly verify post-Task-01 whether Pest was installed.

**Resolution options:**
1. **After Task 01, verify Pest installation.** If Breeze installed Pest, the existing PHPUnit example tests should be removed or migrated. Tasks 07/08/09 can then use Pest syntax as planned.
2. **If Pest is not installed, rewrite all test files to use PHPUnit class syntax.**
3. **Add Pest as an explicit dependency.** Include `./vendor/bin/sail composer require pestphp/pest --dev` in Task 01.

**Recommendation:** Add a verification step to Task 01's post-install checklist: "Check whether Pest was installed by Breeze (`composer show pestphp/pest 2>/dev/null`). If installed, Tasks 07/08/09 can use Pest syntax. If not installed, test plans must use PHPUnit class syntax." This makes the assumption explicit rather than implicit.

### Issue 2: Scout Installation Timing (CRITICAL)

**Affected Tasks:** 04, 12

Task 04 uses `Laravel\Scout\Searchable` but Scout is installed in Task 12. The dependency graph has Task 04 in Group 3 and Task 12 in Group 4. This creates a guaranteed class-not-found error.

**Resolution:** Install Scout in Task 01 (cleanest) or Task 04 (localized).

### Issue 3: `project_materials` Timestamp Handling (CRITICAL)

**Affected Tasks:** 03, 04

The `project_materials` table has only `created_at` (no `updated_at`). The `Project::materials()` and `Material::projects()` BelongsToMany relationships use `->withTimestamps()`, which attempts to set both columns.

**Resolution:** Remove `->withTimestamps()` from both BelongsToMany relationship definitions.

### Issue 4: Spec Says PostgreSQL, Project Uses MySQL (INFO)

The spec file (`shop-manager-spec.md`) says "PostgreSQL 16" but CLAUDE.md says "MySQL 8 (via Sail)." All 12 plans correctly target MySQL. No PostgreSQL-specific syntax was found in any plan. CLAUDE.md overrides the spec. This is informational only.

### Issue 5: Test Database Configuration (WARNING)

The existing `phpunit.xml` sets `DB_DATABASE=testing` but does NOT set `DB_CONNECTION`. This means tests will attempt to connect to a MySQL database named "testing," which may not exist in the Sail MySQL container. Tests using `RefreshDatabase` will fail with a connection error.

**Resolution options:**
1. Create a `testing` database in the Sail MySQL container (add to `docker-compose.yml` or a setup script).
2. Use SQLite in-memory for tests by adding `<env name="DB_CONNECTION" value="sqlite"/>` and `<env name="DB_DATABASE" value=":memory:"/>` to `phpunit.xml`. However, SQLite has dialect differences with MySQL that may cause issues with ULIDs.
3. Use the default database with a testing-specific `.env.testing` file.

This should be addressed in Task 01 or Task 03 as part of environment setup.

---

## Consolidated Findings by Severity

### CRITICAL (Must Fix Before Implementation)

| # | Task(s) | Finding |
|---|---------|---------|
| C1 | 07, 08, 09 | Test files use Pest syntax but Pest may not be installed. Must verify after Task 01 and adapt. |
| C2 | 04 | `$timestamps = false` on 6 models prevents Eloquent from auto-setting `created_at`. Plan's risk section identifies the bug but the code does not fix it. |
| C3 | 04 | `->withTimestamps()` on `Project::materials()` and `Material::projects()` will cause SQL error -- `project_materials` has no `updated_at` column. |
| C4 | 04, 12 | Scout installation ordering -- Task 04 uses `Searchable` trait but Scout is not installed until Task 12 (Group 4, after Group 3). |
| C5 | 06, 09 | Validation failure tests in Task 09 will fail at stub stage because controllers use plain `Request`, not Form Requests. |
| C6 | 04, 08 | `ProjectMaterial` model missing `HasFactory` trait; required by Task 08 factories. |

### WARNING (Should Fix, Can Proceed With Justification)

| # | Task(s) | Finding |
|---|---------|---------|
| W1 | 05 | `Modal.jsx` SSR guard for `createPortal` documented in text but not in code. |
| W2 | 08 | `ProjectMaterialFactory` needs explicit `$model` property -- mentioned in risk but not in code. |
| W3 | 10 | `Dashboard.jsx` may overwrite Task 05's more complete version. |
| W4 | 12 | `toSearchableArray()` described as "add" but Task 04 already creates stubs. Should say "replace." |
| W5 | 07 | `StoreExpenseRequest.receipt_path` unclear whether it should be file upload or string. |
| W6 | All tests | `phpunit.xml` does not configure test database connection. Tests may fail to connect. |

### INFO (Suggestions, No Action Required)

| # | Task(s) | Finding |
|---|---------|---------|
| I1 | 03 | MySQL `$table->ulid()` creates `char(26)`, not `varchar(26)`. Verification SQL should check for `char(26)`. The plan already notes this. |
| I2 | All | Spec says PostgreSQL; project uses MySQL. All plans correctly target MySQL per CLAUDE.md. |
| I3 | 05 | `Alert.jsx` uses Unicode characters for icons. Consider SVGs for visual consistency. |
| I4 | 02 | `EnumTest` could extend `PHPUnit\Framework\TestCase` directly since enums need no app context. Acceptable either way. |
| I5 | 08 | Woodworking-specific Faker data is a nice touch for realism. |
| I6 | 04 | Decision to NOT cast decimal columns avoids float precision issues. Good call. |

---

## Recommended Fix Priority

1. **Determine Pest vs PHPUnit after Task 01** (Tasks 07, 08, 09) -- this blocks all test file creation. Add verification step to Task 01.
2. **Fix Task 04 timestamp handling** -- remove `$timestamps = false`, remove `->withTimestamps()`. This blocks model usage.
3. **Resolve Scout installation ordering** -- move `composer require laravel/scout` to Task 01. This blocks model autoloading.
4. **Add `HasFactory` to `ProjectMaterial`** in Task 04 -- this blocks factory tests.
5. **Handle validation failure tests in Task 09** -- skip, remove, or wire Form Requests first.
6. **Configure test database** -- ensure `phpunit.xml` or Sail setup supports test execution.

---

## Governance Compliance Summary

| Governance Rule | Status | Notes |
|----------------|--------|-------|
| ULIDs for all primary keys | PASS | All migrations use `$table->ulid('id')->primary()`. `foreignUlid()` for FKs. |
| Soft deletes only on projects, materials, tools | PASS | Only these 3 models/migrations include `softDeletes()`. |
| Money as `decimal(10,2)`, never float | PASS | All monetary fields use `decimal(10,2)`. No floats. |
| PHP Enums backed by strings | PASS | All 5 enums are `enum Foo: string`. DB columns are `string()` not `enum()`. |
| Form requests for all validation | PASS (planned) | 15 Form Request classes defined in Task 07. Controllers use plain `Request` as stubs. |
| Route model binding: slug for projects, ULID for others | PASS | `Project::getRouteKeyName()` returns `'slug'`. Others use default `'id'`. |
| Inertia responses from controllers | PASS | All controllers return `Inertia::render()` or `redirect()`. |
| JSX file extensions (not TSX) | PASS | All frontend files use `.jsx`. |
| `Components/ui/` for shadcn-style primitives | PASS | 10 primitives in `Components/ui/`. |
| `AppLayout.jsx` shared layout | PASS | Created in Task 05, used by all authenticated pages. |
| Fat models, thin controllers | PASS | Business logic (slug generation, etc.) in models. Controllers are thin stubs. |
| Feature tests for all controller actions | PASS (planned) | Task 09 defines test stubs for all 46 controller action test cases. |
| Factories for test data | PASS | Task 08 creates factories for all 17 models. |
| MySQL 8 via Sail | PASS | No PostgreSQL syntax anywhere. All plans target MySQL. |

---

## Hallucination Check

| Claim | Verified? | Notes |
|-------|-----------|-------|
| `$table->ulid()` creates `char(26)` | YES | Standard Laravel Blueprint behavior |
| `$table->foreignUlid()` exists | YES | Available since Laravel 9 |
| `HasUlids` trait path: `Illuminate\Database\Eloquent\Concerns\HasUlids` | YES | Correct namespace |
| `Rule::enum()` exists | YES | Added in Laravel 9 |
| `'ulid'` validation rule exists | YES | Added in Laravel 10 |
| `laravel/breeze ^2.x` supports Laravel 12 | YES | Packagist confirms |
| `laravel/scout ^10.0` compatible with Laravel 12 | YES | Scout 10.x supports Laravel 12 |
| `intervention/image ^3.x` uses `read()` not `make()` | YES | v3 API change confirmed |
| `#[Test]` attribute supported in PHPUnit 11 | YES | Available since PHPUnit 10 |
| `createPortal` from `react-dom` | YES | Standard React 18+ API |
| `Inertia\Testing\AssertableInertia` exists | YES | Provided by `inertiajs/inertia-laravel` |
| `morphToMany` / `morphedByMany` with `'taggable'` morph name | YES | Standard Laravel polymorphic pattern |
| `$request->user()?->only()` with nullsafe operator | YES | PHP 8.0+ feature, valid with Eloquent |

No hallucinated packages, APIs, or configuration options were detected.
