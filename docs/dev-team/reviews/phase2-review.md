# Phase 2: Project Tracker -- Dev Supervisor Review

**Reviewer:** Dev Supervisor
**Date:** 2026-03-03
**Plans reviewed:** task-01 through task-10

---

## Summary

**Overall assessment: NEEDS_REVISION** -- 3 critical issues must be resolved before implementation begins.

The plans are generally well-researched and demonstrate strong awareness of the existing codebase. Most claims about existing code, APIs, and file structures have been verified against source. However, there are three critical cross-task inconsistencies around pagination count and filter shape, several validation assertion strategy issues in the test plans, and a CLAUDE.md version mismatch that recurs across frontend tasks.

| Task | Verdict | Critical | Warning | Info |
|------|---------|----------|---------|------|
| 01 - Project CRUD Backend | NEEDS_REVISION | 1 | 1 | 1 |
| 02 - Photo Upload Backend | APPROVED | 0 | 1 | 1 |
| 03 - Time Entry Backend | APPROVED | 0 | 1 | 0 |
| 04 - Notes & Material Attachment | APPROVED | 0 | 0 | 1 |
| 05 - Project List Page | NEEDS_REVISION | 2 | 2 | 1 |
| 06 - Project Create/Edit Forms | APPROVED | 0 | 2 | 1 |
| 07 - Project Detail Page | NEEDS_REVISION | 1 | 2 | 1 |
| 08 - Timer Widget | APPROVED | 0 | 1 | 0 |
| 09 - CRUD Feature Tests | NEEDS_REVISION | 3 | 1 | 0 |
| 10 - Sub-resource Tests | NEEDS_REVISION | 1 | 1 | 0 |

---

## Cross-task Interface Findings

### Finding CT-1: Pagination count disagreement (CRITICAL)

Task 01 specifies `paginate(15)` with `15/page`. Task 09 specifies `paginate(20)` with `20/page`. Task 05 documents the paginator as having `per_page: 20`. These three tasks must agree on a single value.

**Affected tasks:** 01, 05, 09
**Resolution:** Pick one value and update all three plans. The acceptance criterion in the task description says "paginates (15/page)", so `paginate(15)` from Task 01 appears to be the intended value. Task 09 and Task 05 must be updated to match.

### Finding CT-2: `filters` prop shape disagreement (CRITICAL)

Task 01's `index()` passes `$request->only(['search', 'status', 'priority'])` -- a 3-key array including `priority`. Task 09's `index()` implementation passes `$request->only(['search', 'status'])` -- only 2 keys, missing `priority`. Task 05's frontend expects `filters` to have `search`, `status`, and `priority` (and uses `filters.priority` in the Select value). Task 09's controller also does not filter by `priority` at all (the `when($priority, ...)` clause is absent), while Task 01's controller does.

**Affected tasks:** 01, 05, 09
**Resolution:** Task 09's controller implementation must include `priority` in the filters array and add the `when($priority, ...)` query clause, matching Task 01's plan. The test file should also test priority filtering.

### Finding CT-3: `statuses` prop in `index()` -- presence disagreement (WARNING)

Task 01 does NOT pass a `statuses` prop to the `index` action. Task 09 DOES pass a `statuses` prop to the `index` action. Task 05 does NOT receive a `statuses` prop from the backend -- it hardcodes status/priority options in the frontend component.

Since Task 05 hardcodes the options, the `statuses` prop from Task 09's controller is unnecessary but harmless. However, Task 09's tests assert `has('statuses')` on the index page, which will fail unless the controller passes it. The plans should be consistent.

**Affected tasks:** 01, 05, 09
**Resolution:** Either Task 01's index also passes `statuses` (for the filter UI), or Task 09 drops the `statuses` assertion on index. Since Task 05 hardcodes them (acceptable for a filter dropdown), the simplest fix is for Task 09 to not assert `statuses` on the index page and not pass it from the controller.

### Finding CT-4: Task 03 activeTimer and Task 08 agree (OK)

Task 03 defines `activeTimer` shape as `{ id, project_id, project_slug, project_title, started_at }`. Task 08 consumes exactly this shape, reading `activeTimer.started_at` and `activeTimer.project_slug`. The shapes match. No issue.

### Finding CT-5: Task 01 show() and Task 07 show() agree (OK)

Task 01's `show()` is intentionally minimal (`'project' => $project`), explicitly deferring eager loading to Task 07. Task 07 adds the eager loads and adds the `materials` prop. This is consistent and well-coordinated.

### Finding CT-6: Task 02 storage paths and Task 07 photo display (OK, with caveat)

Task 02 stores photos at `projects/{project_id}/photos/{ulid}.{ext}` and thumbnails at `projects/{project_id}/thumbnails/{ulid}.jpg`. Task 07 renders `<img src={photo.thumbnail_path ?? photo.file_path}>`. However, the stored paths are relative paths on the `public` disk (e.g., `projects/01HX.../photos/01HY.../abc.jpg`). The `<img src>` needs a full URL, not a relative storage path. Task 07 does not prepend `/storage/` to the path.

**Severity: WARNING** (Task 07, see task-specific finding below)

---

## Task-by-task Review

---

### Task 01: Project CRUD Backend

**Verdict: NEEDS_REVISION**

#### Finding 01-1: `index()` has `priority` filter but Task 09 does not (CRITICAL)

See CT-2 above. Task 01's implementation correctly includes all three filters. Task 09 must be updated to match. This is not an issue with Task 01 itself, but the cross-task inconsistency means the implementer needs to know which plan to follow. Task 01's version is correct.

**Action for Task 01:** No change needed. Document this as the source of truth for `index()`.

#### Finding 01-2: `store()` does not add flash message per CLAUDE.md convention (WARNING)

Task 01's `store()` uses `->with('success', 'Project created successfully.')`, which is correct. But Task 09's `store()` does NOT include `->with('success', ...)`. The acceptance criterion says "redirects to projects.show with flash". Task 09's implementation omits the flash. This is a Task 09 issue, not Task 01.

**Action:** Task 09's controller code must add `->with('success', ...)` on `store`, `update`, and `destroy` to match Task 01.

#### Finding 01-3: Enum case count verified (INFO)

Plan claims 7 ProjectStatus cases and 4 ProjectPriority cases. Verified: ProjectStatus has 7 cases (Planned, Designing, InProgress, Finishing, OnHold, Completed, Archived). ProjectPriority has 4 cases (Low, Medium, High, Urgent). Correct.

---

### Task 02: Photo Upload Backend

**Verdict: APPROVED**

#### Finding 02-1: Intervention Image v3 API usage verified (INFO)

Plan correctly uses `ImageManager::gd()`, `->read()`, `->scale(width: 400)`, `->toJpeg()`. The `scale()` vs `resize()` rationale is correct for proportional scaling. All API calls verified against the critical facts.

#### Finding 02-2: `sort_order` int cast (WARNING)

The test asserts `$this->assertSame(1, $photo->sort_order)`. The `ProjectPhoto` model casts `sort_order` to `integer`, so this will work. However, the service computes `$nextSort = (int) $project->photos()->max('sort_order') + 1`. The `(int)` cast on `null` gives `0`, so `0 + 1 = 1`. This is correct. The `assertSame` with strict type comparison will pass because the model cast returns an integer.

No action needed -- this is correct but worth noting for implementers.

---

### Task 03: Time Entry Backend and Active Timer Shared Data

**Verdict: APPROVED**

#### Finding 03-1: `useEffect` dependency on activeTimer object reference (WARNING)

Task 08 uses `[activeTimer]` as the `useEffect` dependency. Since `activeTimer` is a plain object from Inertia shared props, every Inertia navigation creates a new object reference even if the data hasn't changed. This means the `useEffect` will re-run (and clear/restart the interval) on every page navigation, even if the same timer is still running. This is functionally correct (the interval restarts from the correct `started_at`), but causes a brief visual reset (elapsed recalculates immediately). The behavior is acceptable for a 1-second tick interval.

**Action:** No change required. The immediate `setElapsed(Date.now() - startMs)` before `setInterval` in Task 08 prevents any visible flicker.

---

### Task 04: Notes and Material Attachment Backend

**Verdict: APPROVED**

#### Finding 04-1: `updateExistingPivot` and `UPDATED_AT = null` (INFO)

The plan correctly identifies that `updateExistingPivot()` respects the pivot model's `UPDATED_AT` constant. Verified: `ProjectMaterial` declares `const UPDATED_AT = null`, and the `project_materials` table has no `updated_at` column. The `BelongsToMany` relationship on `Project` does NOT use `->withTimestamps()` (confirmed by reading the model). The plan is correct.

---

### Task 05: Project List Page

**Verdict: NEEDS_REVISION**

#### Finding 05-1: Pagination count mismatch with backend (CRITICAL)

See CT-1 above. Task 05 documents `per_page: 20` in the paginator shape. Task 01 uses `paginate(15)`. The frontend plan must use the correct value from the backend.

**Action:** Update the `per_page` reference in Task 05 from 20 to 15 to match Task 01.

#### Finding 05-2: CLAUDE.md version claims (CRITICAL)

The plan references "Tailwind CSS 4" in section 8 (line-clamp-2 note). The critical facts state this project uses **Tailwind CSS 3** (not 4). The `line-clamp-2` utility is still available (merged into Tailwind core in v3.3), so the code works, but the version reference is wrong and could mislead implementers about available features.

Similarly, CLAUDE.md says "React 19" but the critical facts state **React 18** is actually installed. Task 05 does not use any React 19-specific features, so this does not cause code issues, but the plan should not propagate incorrect version information.

**Action:** Update version references in the plan to match the actual installed versions: Tailwind CSS 3, React 18. The code itself does not need to change.

#### Finding 05-3: `filters.priority` sent to server but Task 01 controller may not return it (WARNING)

Task 05's filter handlers send `priority` as a filter parameter. Task 01's `index()` uses `$request->only(['search', 'status', 'priority'])` which correctly includes priority. However, Task 09's controller implementation (which is the version that may actually be implemented first) does NOT include priority. The implementer must ensure the actually-deployed controller matches Task 01, not Task 09.

**Action:** Coordinate with Task 09 resolution (see CT-2).

#### Finding 05-4: Board view shows only current page of projects (WARNING)

This is a known limitation, acknowledged in Decision 5. The Kanban board groups `projects.data` by status, so it only shows projects from the current page. For a solo woodworker this is likely acceptable, but it means the board may show incomplete data. No action required now, but should be documented as a known limitation.

#### Finding 05-5: Status/priority hardcoded vs prop-driven (INFO)

Task 05 hardcodes the status and priority options in the frontend rather than receiving them from the backend `index()` action. Task 06 receives them from `create()` and `edit()`. This inconsistency is harmless (the enum values are stable), but if a new status is added, Task 05's frontend would need updating separately.

---

### Task 06: Project Create/Edit Forms

**Verdict: APPROVED**

#### Finding 06-1: `deadline` date format (WARNING)

Task 06 Risk 3 correctly identifies that the backend may return `deadline` as a full ISO datetime string. The Project model casts `deadline` as `'date'` (not `'date:Y-m-d'`). The `date` cast returns a `Carbon` instance, which Inertia serializes to an ISO 8601 datetime string like `"2025-12-31T00:00:00.000000Z"`. The `<input type="date">` requires `YYYY-MM-DD` format. The plan's suggestion of `project.deadline ? project.deadline.substring(0, 10) : ''` is the correct defensive measure.

**Action:** The implementer MUST apply the `substring(0, 10)` guard for the deadline field in Edit.jsx. The plan mentions this as a risk but does not include it in the actual implementation code. Add it to the `useForm` initialization in Edit.jsx.

#### Finding 06-2: Edit.jsx cancel link destination (WARNING)

Edit.jsx's cancel link goes to `route('projects.show', project.slug)`. The `route()` helper with Ziggy expects the route parameter to match the route's parameter name. Since `projects.show` binds `{project}` and the model uses slug as the route key, passing `project.slug` is correct. However, `route('projects.show', project)` (the full project object) would also work since Ziggy extracts the route key. Both are valid.

No action needed -- the plan is correct.

#### Finding 06-3: `statuses` and `priorities` prop shape match verified (INFO)

Task 01's `create()` and `edit()` map enums to `{ value, label }` arrays. Task 06's `Select` component expects `options` as `{ value, label }[]` (verified in Select.jsx source). The shapes match correctly.

---

### Task 07: Project Detail Page

**Verdict: NEEDS_REVISION**

#### Finding 07-1: Photo `<img src>` missing `/storage/` prefix (CRITICAL)

Task 07's photo section renders: `<img src={photo.thumbnail_path ?? photo.file_path}>`. But `thumbnail_path` and `file_path` store relative paths on the `public` disk (e.g., `projects/{id}/thumbnails/{ulid}.jpg`). To serve these via the web, the URL must be prefixed with `/storage/` (assuming `storage:link` has been run). Without the prefix, the images will 404.

**Action:** Change the `src` to `` `/storage/${photo.thumbnail_path ?? photo.file_path}` `` or use a helper. Alternatively, the backend could store the full URL in the model or add an accessor. The simplest fix is in the frontend template.

#### Finding 07-2: `Material::all(['id', 'name', 'unit'])` -- `unit` is an enum (WARNING)

Task 07 passes `Material::all(['id', 'name', 'unit'])` as a prop. The `Material` model casts `unit` to `MaterialUnit::class` (a PHP enum). When serialized to JSON by Inertia, backed enum values become their string backing value. The frontend renders `m.name (${m.unit})`. Since the enum serializes to its string value (e.g., `"board_feet"`, `"linear_feet"`), the display will show raw enum values, not human-readable labels.

**Action:** Either call `->label()` on the enum server-side (by mapping the collection), or accept the raw enum value in the frontend. This is a UX concern, not a crash. For a solo user, the raw value may be acceptable. Document the decision.

#### Finding 07-3: Status/priority label mapping different from Task 05 (WARNING)

Task 07 defines its own status-to-badge-variant mapping using Badge `variant` prop (e.g., `in_progress` maps to `default`, `on_hold` maps to `outline`). Task 05 uses the Badge `color` prop with hex values. These produce visually different badges on the same project status. Ideally, status badge rendering should be consistent across pages.

**Action:** Consider extracting a shared `StatusBadge` component used by both pages, or at minimum ensure the color strategy is consistent. This is a visual consistency issue, not a functional one.

#### Finding 07-4: `expenses` and `revenues` relationships verified (INFO)

The `Project` model has `expenses()` (HasMany to `Expense`) and `revenues()` (HasMany to `Revenue`) relationships. Task 07 eager-loads both. The relationships exist in the source code. Verified.

---

### Task 08: Timer Widget

**Verdict: APPROVED**

#### Finding 08-1: React import needs `useEffect` added (WARNING)

Task 08 notes that `useState` and `useEffect` are not currently imported in `AppLayout.jsx`. Checking the source: line 2 is `import { useState } from 'react';`. So `useState` IS already imported but `useEffect` is NOT. The plan correctly identifies that `useEffect` must be added.

**Action:** The plan correctly handles this. The implementer must update the import to `import { useState, useEffect } from 'react';`. No plan revision needed.

---

### Task 09: CRUD Feature Tests

**Verdict: NEEDS_REVISION**

#### Finding 09-1: Controller uses `paginate(20)` instead of `paginate(15)` (CRITICAL)

See CT-1. Task 09's controller implementation uses `paginate(20)`, contradicting Task 01's `paginate(15)`. Since this task includes the full controller implementation, it must match the agreed-upon pagination value.

**Action:** Change `paginate(20)` to `paginate(15)` in the controller code.

#### Finding 09-2: Controller `index()` omits `priority` filter and prop (CRITICAL)

See CT-2. Task 09's controller implementation:
- Uses `$request->only(['search', 'status'])` (missing `priority`)
- Does not include a `when($priority, ...)` clause
- Passes `statuses` prop to index (which Task 01 does not)

**Action:** Update the controller implementation to match Task 01:
- Add `'priority'` to the `only()` call
- Add `when($priority, ...)` clause
- Either include or exclude `statuses` prop consistently with Task 01

#### Finding 09-3: Controller `store()`, `update()`, `destroy()` omit flash messages (CRITICAL)

Task 01 explicitly includes `->with('success', '...')` on all redirect responses. Task 09's controller code omits flash messages on `store()`, `update()`, and `destroy()`. The CLAUDE.md and critical facts confirm the convention is `->with('success', '...')` on redirects.

**Action:** Add `->with('success', '...')` to `store()`, `update()`, and `destroy()` in Task 09's controller code.

#### Finding 09-4: `assertStatus(422)` vs `assertSessionHasErrors` inconsistency in explanation (WARNING)

Task 09 initially suggests `assertStatus(422)` for validation failure tests, then corrects to `assertSessionHasErrors(['title'])` with a detailed explanation of why. The final test file correctly uses `assertSessionHasErrors`. However, the plan text is confusing because it presents both options with extensive discussion. The implementer should use `assertSessionHasErrors` as shown in the final test file.

No plan revision needed -- the final code is correct. The discussion is verbose but not harmful.

---

### Task 10: Sub-resource Feature Tests

**Verdict: NEEDS_REVISION**

#### Finding 10-1: `assertStatus(422)` for validation failures may not work as expected (CRITICAL)

Task 10 uses `assertStatus(422)` for all validation failure tests (uploading_non_image, logging_time_without_started_at, adding_note_with_empty_content, attaching_material_with_non_existent_material_id). As correctly identified in Task 09's analysis, `$this->post()` in Laravel tests does NOT include the `X-Inertia: true` header. Without this header, validation failures follow the traditional Laravel pattern: a 302 redirect with errors flashed to the session, NOT a 422 response.

This means all four `assertStatus(422)` assertions will FAIL in practice. They will receive a 302 redirect instead.

**Action:** Replace `assertStatus(422)` with `assertSessionHasErrors([...])` in:
- `uploading_non_image_returns_422` -- use `assertSessionHasErrors(['photo'])`
- `logging_time_without_started_at_returns_422` -- use `assertSessionHasErrors(['started_at'])`
- `adding_note_with_empty_content_returns_422` -- use `assertSessionHasErrors(['content'])`
- `attaching_material_with_non_existent_material_id_returns_422` -- use `assertSessionHasErrors(['material_id'])`

Consider also renaming the test methods to remove `_422` from the names (e.g., `uploading_non_image_fails_validation`).

#### Finding 10-2: Tests assume controllers are implemented but plan says they are stubs (WARNING)

Task 10 section 8 (Risks) acknowledges that controller stubs do not apply Form Requests yet, meaning validation will not fire until controllers are updated. The tests for successful operations (e.g., `uploading_valid_image_creates_project_photo`) also depend on the controller being fully implemented. This creates a sequencing dependency: Tasks 02, 03, and 04 must be completed before Task 10's tests can pass.

The plan acknowledges this but does not explicitly require those tasks as dependencies in the task header.

**Action:** Add explicit dependency note: "This task's tests require Tasks 02, 03, and 04 to be completed first." Alternatively, state that these tests should run as part of the final integration verification, not independently.

---

## Additional Observations

### ProjectNote does not declare `const UPDATED_AT = null`

The `ProjectNote` model (verified in source) does NOT declare `const UPDATED_AT = null`, meaning it HAS both `created_at` and `updated_at` columns. Task 04's plan does not mention this -- it describes `ProjectNote` as having `HasFactory, HasUlids` but does not discuss timestamps. This is fine because `ProjectNote` is a standard model with both timestamps. No issue, but notable because other models (`TimeEntry`, `ProjectPhoto`, `ProjectMaterial`) explicitly suppress `updated_at`.

### `Project::deadline` cast as `'date'` (not `'date:Y-m-d'`)

The Project model casts `deadline` as `'date'` which produces a Carbon instance. When serialized to JSON, this becomes an ISO 8601 datetime string with a time portion (e.g., `"2025-12-31T00:00:00.000000Z"`). Tasks 06 and 07 should both handle this by slicing to `YYYY-MM-DD` where needed for `<input type="date">`. Task 06 mentions this in Risk 3 but does not include the fix in the implementation code. Task 07 uses `formatDate()` helper which handles display formatting. The `<input type="date">` in Task 07's time log form uses `datetime-local` (for `started_at`/`ended_at`), not a date input for deadline, so this is not an issue there.

### `HandleInertiaRequests` flash key structure verified

The middleware shares `flash.success`, `flash.error`, `flash.warning`, `flash.info` -- confirmed in source. All controllers use `->with('success', ...)`. Task 07 reads `usePage().props.flash.success`. This is consistent.

---

## Required Actions Before Implementation

1. **Resolve pagination count:** Standardize on `paginate(15)` across Tasks 01, 05, and 09.
2. **Resolve `filters` prop shape:** Task 09's controller must include `priority` in the filters and query, matching Task 01.
3. **Fix Task 09 flash messages:** Add `->with('success', ...)` to Task 09's `store()`, `update()`, `destroy()`.
4. **Fix Task 10 validation assertions:** Replace `assertStatus(422)` with `assertSessionHasErrors([...])` in all four validation failure tests.
5. **Fix Task 07 photo src:** Prepend `/storage/` to photo paths in the `<img src>` attribute.
6. **Fix Task 06 deadline format:** Add `substring(0, 10)` guard to `deadline` in Edit.jsx `useForm` initialization.
