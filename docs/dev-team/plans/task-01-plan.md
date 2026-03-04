# Task 01 Plan: Project CRUD Backend

**Task ID:** 01
**Domain:** backend
**Complexity:** medium
**Status:** pending

---

## 1. Approach

All seven CRUD methods on `ProjectController` are currently stubs. The implementation strategy is:

1. Read the validated data from the two existing Form Requests without touching them.
2. Implement each controller method in one focused edit to `ProjectController.php`.
3. Expand the existing `ProjectControllerTest.php` with full coverage tests using PHPUnit 11 `#[Test]` attributes.

The controller stays thin. Filtering and search logic live in the query chain in `index()` using Eloquent scopes and Scout — no service class is needed at this scope. Flash messages use Laravel's `with()` on the redirect. No new files are created beyond the plan document.

---

## 2. Files to Modify

| File | Action | Reason |
|------|--------|--------|
| `app/Http/Controllers/ProjectController.php` | Modify | Replace all 7 stub methods with real implementations |
| `tests/Feature/ProjectControllerTest.php` | Modify | Add complete test coverage for all 7 methods |

No new files are created. `StoreProjectRequest`, `UpdateProjectRequest`, `Project`, `ProjectStatus`, and `ProjectPriority` are all read-only dependencies that are already correct.

---

## 3. Implementation Detail

### 3.1 Imports to Add to ProjectController

The current import block covers `Project`, `TimeEntry`, `Request`, `Inertia`, `Response`, and `RedirectResponse`. The implementation needs two additional imports:

```php
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
```

`Request` can be removed from the imports once all stub signatures that typed it are replaced — `store()` and `update()` will use the typed Form Request classes instead.

### 3.2 index()

```php
public function index(Request $request): Response
{
    $filters = $request->only(['search', 'status', 'priority']);

    $projects = Project::query()
        ->when($filters['search'] ?? null, fn ($q, $search) =>
            $q->whereIn('id', Project::search($search)->keys())
        )
        ->when($filters['status'] ?? null, fn ($q, $status) =>
            $q->where('status', $status)
        )
        ->when($filters['priority'] ?? null, fn ($q, $priority) =>
            $q->where('priority', $priority)
        )
        ->latest()
        ->paginate(15)
        ->withQueryString();

    return Inertia::render('Projects/Index', [
        'projects' => $projects,
        'filters'  => $filters,
    ]);
}
```

**Search approach:** The project uses Laravel Scout with the database driver (`toSearchableArray()` already defined on the model). Scout's `search()->keys()` returns matching ULIDs, which feeds a `whereIn` on the Eloquent query. This combines Scout's full-text search with Eloquent's filter chain cleanly. The database Scout driver works synchronously — no queue needed for search.

**Pagination:** `paginate(15)` with `withQueryString()` preserves filter params across pagination links. Inertia serialises the `LengthAwarePaginator` automatically; the frontend receives `data`, `links`, `meta`, and `current_page`.

**Filter passing:** The `$filters` array is passed as-is to Inertia so the frontend can initialise form fields from it.

### 3.3 create()

```php
public function create(): Response
{
    return Inertia::render('Projects/Create', [
        'statuses'   => collect(ProjectStatus::cases())->map(fn ($s) => [
            'value' => $s->value,
            'label' => $s->label(),
        ]),
        'priorities' => collect(ProjectPriority::cases())->map(fn ($p) => [
            'value' => $p->value,
            'label' => $p->label(),
        ]),
    ]);
}
```

Each enum is mapped to a plain `{ value, label }` array. This is the pattern Inertia components expect for `<select>` population. The `value` is the backed string value (e.g., `'in_progress'`); the `label` is the human-readable string (e.g., `'In Progress'`). JSON serialisation of the raw enum cases would expose only the `value` property — the explicit map ensures `label()` is called on the PHP side.

### 3.4 store()

```php
public function store(StoreProjectRequest $request): RedirectResponse
{
    $project = Project::create($request->validated());

    return redirect()
        ->route('projects.show', $project)
        ->with('success', 'Project created successfully.');
}
```

`$request->validated()` returns only the fields that passed the Form Request rules. The `Project::create()` call hits the `booted()` observer which auto-generates the slug from `title`. Route model binding on `projects.show` resolves the project by its `slug` (via `getRouteKeyName()`), so passing `$project` to `route()` works correctly.

### 3.5 show()

```php
public function show(Project $project): Response
{
    return Inertia::render('Projects/Show', [
        'project' => $project,
    ]);
}
```

Minimal as specified — Task 07 handles eager loading of relations. Route model binding resolves by slug.

### 3.6 edit()

```php
public function edit(Project $project): Response
{
    return Inertia::render('Projects/Edit', [
        'project'    => $project,
        'statuses'   => collect(ProjectStatus::cases())->map(fn ($s) => [
            'value' => $s->value,
            'label' => $s->label(),
        ]),
        'priorities' => collect(ProjectPriority::cases())->map(fn ($p) => [
            'value' => $p->value,
            'label' => $p->label(),
        ]),
    ]);
}
```

Identical enum mapping as `create()`. The `project` prop lets the frontend pre-populate form fields.

### 3.7 update()

```php
public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
{
    $project->update($request->validated());

    return redirect()
        ->route('projects.show', $project)
        ->with('success', 'Project updated successfully.');
}
```

`UpdateProjectRequest` uses `sometimes` on all fields, so PATCH requests with partial payloads work correctly. The slug is not in the `fillable` array's update path — it was set at creation and is never changed by update.

### 3.8 destroy()

```php
public function destroy(Project $project): RedirectResponse
{
    $project->delete();

    return redirect()
        ->route('projects.index')
        ->with('success', 'Project deleted.');
}
```

`SoftDeletes` is applied on the model, so `$project->delete()` sets `deleted_at` rather than removing the row. The redirect goes to the index (not back to the deleted project's show page).

---

## 4. Key Decisions

### Decision 1: Scout `search()->keys()` feeds a `whereIn` — not `Project::search()->get()`

`Project::search($term)->get()` returns a Scout Collection that bypasses Eloquent's `when()` filter chain and `paginate()`. Using `Project::search($term)->keys()` returns matching IDs and feeds them into the regular Eloquent query, keeping all filter conditions and pagination on one query path. This is the standard Laravel Scout + Eloquent composition pattern for combined filter+search.

**Caveat:** If the search term is empty, `keys()` is never called and the query runs as a standard Eloquent query, which is the correct behaviour — no performance penalty when `?search=` is absent.

### Decision 2: Filters passed back as the raw `only()` array

The `$filters` array contains whatever the user sent (`null` for absent keys). Passing it to Inertia as-is means the frontend always has the full filter shape, even when values are `null`. The alternative — only passing non-null filters — makes initialising controlled form inputs more fragile on the frontend.

### Decision 3: Flash messages use `with('success', ...)` string convention

Laravel's session flash with a `'success'` key is the standard Inertia flash pattern. The shared `HandleInertiaRequests` middleware already shares flash data via `$request->session()->get('success')` (or similar). The key name `success` is consistent across all controller redirects in this project.

### Decision 4: No slug regeneration on update

The `UpdateProjectRequest` does not include `slug`. The `fillable` array on `Project` includes `slug`, but the Form Request never validates or passes it, so `update($request->validated())` will never touch the slug. Route model binding continues to work after an update because the slug remains the same. This avoids broken bookmarks/links from slug changes.

### Decision 5: `paginate(15)` — not `simplePaginate`

`paginate(15)` returns a `LengthAwarePaginator` with total count and page links. `simplePaginate` omits the total count. The acceptance criterion says "paginates (15/page)" and the frontend will likely want to show "Page X of Y" — `paginate` is the safe choice.

---

## 5. Verified Dependencies

| Dependency | Location | Status |
|-----------|----------|--------|
| `ProjectStatus` enum with `label()` | `app/Enums/ProjectStatus.php` | Verified — 7 cases, all have `label()` |
| `ProjectPriority` enum with `label()` | `app/Enums/ProjectPriority.php` | Verified — 4 cases, all have `label()` |
| `StoreProjectRequest` with full rules | `app/Http/Requests/StoreProjectRequest.php` | Verified — 12 validated fields |
| `UpdateProjectRequest` with `sometimes` rules | `app/Http/Requests/UpdateProjectRequest.php` | Verified — same 12 fields, all `sometimes` |
| `Project::search()` (Scout Searchable) | `app/Models/Project.php` line 19 | Verified — `Searchable` trait used |
| `Project::toSearchableArray()` | `app/Models/Project.php` lines 74-83 | Verified — indexes title, description, client_name, notes |
| `Project` soft deletes | `app/Models/Project.php` line 19 | Verified — `SoftDeletes` trait used |
| `Project` slug route key | `app/Models/Project.php` lines 69-72 | Verified — `getRouteKeyName()` returns `'slug'` |
| `Project` slug auto-generation | `app/Models/Project.php` lines 52-67 | Verified — `booted()` generates unique slug on create |
| `Route::resource('projects', ...)` | `routes/web.php` line 32 | Verified — all 7 CRUD routes registered |
| `status` and `priority` DB indexes | `database/migrations/..._create_projects_table.php` | Verified — both indexed for filter queries |
| Scout database driver | Assumed from CLAUDE.md ("Laravel Scout with database driver") | Not inspected in config — confirm `SCOUT_DRIVER=database` in `.env` |
| `ProjectFactory` | `database/factories/ProjectFactory.php` | Verified — uses both enums, generates realistic data |
| `ProjectControllerTest` with `#[Test]` attributes | `tests/Feature/ProjectControllerTest.php` | Verified — PHPUnit 11 style, 5 existing tests |

---

## 6. Risks and Mitigations

### Risk 1: Scout database driver not configured

**Risk:** If `SCOUT_DRIVER` is not set to `database` in the test environment, `Project::search()->keys()` may hit a null or Algolia driver and throw or return empty results.

**Mitigation:** In the test for search, assert that a project with the search term in its title is returned (and one without is not). If the Scout driver is not `database`, the test fails with a clear error pointing to the config, not a silent wrong result. Add a `SCOUT_DRIVER=database` line to `.env.testing` if not present. The `index()` implementation uses `when($search, ...)` — when the search param is absent, Scout is never called and a configuration problem has no effect.

### Risk 2: `Project::search()->keys()` returns ULID strings, `whereIn` on string primary key

**Risk:** ULID primary keys are strings. If `whereIn('id', ...)` receives a Collection of strings, it works correctly with MySQL's string comparison. This is not a real risk — just worth noting that integer `id` assumptions don't apply here.

**Mitigation:** No action needed. The Scout `keys()` method returns the values of `toSearchableArray()['id']`, which are ULID strings. `whereIn('id', $ulids)` works correctly.

### Risk 3: Flash message key mismatch with HandleInertiaRequests

**Risk:** If `HandleInertiaRequests::share()` reads a different key (e.g., `flash.message` rather than `success`), the flash messages will not appear in the frontend. This does not affect controller correctness or tests.

**Mitigation:** The controller uses `with('success', ...)` consistently. The exact key is a frontend/middleware concern. Document that the frontend must read the `success` flash key from Inertia's shared props. If the project has a different convention, adjust the key in the controller — the test does not assert on flash message content, only on redirect target.

### Risk 4: Paginator serialisation in Inertia response

**Risk:** Inertia's resource handling serialises `LengthAwarePaginator` using its `toArray()` representation. If the frontend expects a different shape (e.g., wrapped under a `data` key with separate `meta`), there may be a mismatch.

**Mitigation:** This is a frontend concern addressed in the CRUD frontend tasks. The controller passes `$projects` (the paginator) directly — this is the standard Inertia pattern. The test asserts that the Inertia component receives a `projects` prop, not its exact shape.

### Risk 5: Existing test `test_authenticated_user_can_view_projects_index` passes on the stub

**Risk:** The stub `index()` already returns `Inertia::render('Projects/Index')` with no data. The existing test only asserts `assertOk()`, which the stub already passes. After implementation, more assertions are needed to confirm data is passed.

**Mitigation:** The expanded test suite adds `assertInertia` assertions (using the `inertia-laravel` test helpers) to confirm the `projects` and `filters` props are present on the response.

---

## 7. Test Plan

The existing `ProjectControllerTest.php` has 5 tests, all of which only assert HTTP 200. The following tests need to be added:

### New tests to add

```
test_index_passes_projects_and_filters_to_inertia
test_index_filters_by_status
test_index_filters_by_priority
test_index_searches_by_term
test_index_paginates_at_15_per_page
test_create_passes_statuses_and_priorities_to_inertia
test_store_creates_project_and_redirects_to_show
test_store_fails_validation_without_title
test_show_passes_project_to_inertia
test_edit_passes_project_statuses_and_priorities_to_inertia
test_update_updates_project_and_redirects_to_show
test_update_fails_validation_with_invalid_status
test_destroy_soft_deletes_project_and_redirects_to_index
test_destroyed_project_not_in_index_results
```

### Test conventions

- Use `#[Test]` attribute (PHPUnit 11 style, not `/** @test */` docblock)
- Use `RefreshDatabase` (already present on the class)
- Use `User::factory()->create()` and `actingAs($user)`
- Use `Project::factory()->create([...])` for seeded data
- For Inertia assertions: use `$response->assertInertia(fn ($page) => $page->component('Projects/Index')->has('projects')->has('filters'))`
- For store/update: assert database state with `$this->assertDatabaseHas('projects', [...])`
- For destroy: assert soft delete with `$this->assertSoftDeleted('projects', ['id' => $project->id])`
- Flash messages: assert redirect target only, not flash content (flash is a frontend concern)

### Example: store test

```php
#[Test]
public function test_store_creates_project_and_redirects_to_show(): void
{
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/projects', [
        'title' => 'My Cabinet Build',
    ]);

    $this->assertDatabaseHas('projects', ['title' => 'My Cabinet Build']);

    $project = Project::where('title', 'My Cabinet Build')->first();

    $response->assertRedirect(route('projects.show', $project));
}
```

### Example: destroy test

```php
#[Test]
public function test_destroy_soft_deletes_project_and_redirects_to_index(): void
{
    $user = User::factory()->create();
    $project = Project::factory()->create();

    $response = $this->actingAs($user)->delete('/projects/' . $project->slug);

    $response->assertRedirect(route('projects.index'));
    $this->assertSoftDeleted('projects', ['id' => $project->id]);
}
```

---

## 8. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| `index()` accepts `?search=`, `?status=`, `?priority=` | `$request->only(['search', 'status', 'priority'])` + `when()` chain in query |
| `index()` paginates at 15/page | `->paginate(15)->withQueryString()` |
| `index()` passes `{ projects, filters }` to Inertia | `Inertia::render('Projects/Index', ['projects' => ..., 'filters' => ...])` |
| `create()` passes `{ statuses, priorities }` with `label()` | Enum `cases()` mapped to `{ value, label }` arrays |
| `store()` uses `StoreProjectRequest` | Method signature: `store(StoreProjectRequest $request)` |
| `store()` creates project | `Project::create($request->validated())` |
| `store()` redirects to `projects.show` with flash | `redirect()->route('projects.show', $project)->with('success', ...)` |
| `show()` passes `{ project }` | `Inertia::render('Projects/Show', ['project' => $project])` |
| `edit()` passes `{ project, statuses, priorities }` | Same enum mapping + `$project` in props |
| `update()` uses `UpdateProjectRequest` | Method signature: `update(UpdateProjectRequest $request, Project $project)` |
| `update()` redirects with flash | `redirect()->route('projects.show', $project)->with('success', ...)` |
| `destroy()` soft-deletes | `$project->delete()` — `SoftDeletes` trait handles the rest |
| `destroy()` redirects to index with flash | `redirect()->route('projects.index')->with('success', ...)` |
| Route model binding by slug | `getRouteKeyName()` already returns `'slug'` on the model — no controller change needed |
| Form requests handle all validation | No `$request->validate()` calls in the controller — Form Request classes used exclusively |
