# Phase 2 Project Tracker — Final Report

**Date:** 2026-03-03
**Status:** COMPLETE
**Tests:** 72 passed (281 assertions), 0 failures
**Build:** npm run build succeeds

---

## What Was Built

### Task 01: Project CRUD Backend
- `ProjectController` fully implemented: index (with search/filter/pagination), create, store, show, edit, update, destroy
- Search uses Laravel Scout database driver with `search()->keys()` feeding `whereIn`
- Filters: `?search=`, `?status=`, `?priority=` query params, paginate(15)
- Enum options passed as `{value, label}` arrays to create/edit
- Flash messages on all mutations

### Task 02: Photo Upload Backend
- `PhotoUploadService` created in `app/Services/`
- Intervention Image v3: `ImageManager::gd()`, `->read()`, `->scale(width: 400)`, `->toJpeg()`
- Originals at `projects/{id}/photos/{ulid}.{ext}`, thumbnails at `projects/{id}/thumbnails/{ulid}.jpg`
- Auto-incrementing `sort_order` per project

### Task 03: Time Entry Backend + Active Timer
- `logTime()`: creates TimeEntry, auto-stops any running timer first, computes duration when ended_at provided
- `stopTimer()`: sets ended_at=now(), computes duration_minutes
- `TimeEntry::scopeRunning()` query scope added
- `HandleInertiaRequests` shares `activeTimer` prop: `{ id, project_id, project_slug, project_title, started_at }`

### Task 04: Notes & Material Attachment
- `addNote()`: creates ProjectNote via relationship
- `attachMaterial()`: attach or updateExistingPivot, computes `cost_at_time = unit_cost * quantity_used`

### Task 05: Project List Page + Kanban Board
- Toggle between List view (Table) and Board view (Kanban)
- Search input debounced 300ms, status/priority Select filters
- All filters via `router.get` with `preserveState: true`
- Board groups projects by status, all 7 columns always shown
- Status/priority badges with hex colors
- Pagination (prev/next)

### Task 06: Create & Edit Forms
- Both use `useForm` with all 13 project fields
- Status/priority as Select with backend-provided options
- Conditional commission fields (client_name, client_contact)
- Inline validation errors, loading state on submit
- Edit form handles deadline ISO to YYYY-MM-DD conversion

### Task 07: Project Detail Page (fullstack)
- Controller show() eager-loads: photos, notes, timeEntries, materials, expenses, revenues
- Also passes all materials for the attach form
- 7 sections: Overview, Photos, Notes, Time Log, Materials, Expenses, Revenues
- 4 inline forms: Upload Photo (forceFormData), Add Note, Log Time, Attach Material
- Start Timer shortcut, Stop Timer per-entry button
- Flash messages via Alert component
- Photo URLs correctly prefixed with `/storage/`

### Task 08: Persistent Timer Widget
- `TimerWidget` component in AppLayout.jsx
- Reads `activeTimer` from shared Inertia props
- Live ticking HH:MM:SS via useEffect/setInterval
- Amber styling + pulsing dot when running, gray when idle
- Click navigates to active project
- Works in both desktop and mobile nav

### Task 09: CRUD Feature Tests (12 tests)
- Auth guard, index with props, search filter, status filter
- Create page with statuses/priorities, store + validation
- Show with project prop, edit with options
- Update + validation, soft-delete

### Task 10: Sub-resource Feature Tests (10 tests)
- Photo upload + rejection, Storage::fake
- Time entry (completed + running + validation + stop)
- Note creation + validation
- Material attachment + nonexistent material validation

---

## Supervisor Findings Resolved

All 7 critical findings from the review were addressed during implementation:

1. **Pagination standardized** on `paginate(15)` across all tasks
2. **Filters prop** includes search, status, and priority consistently
3. **Flash messages** added to all mutation redirects
4. **Validation assertions** use `assertSessionHasErrors` (not assertStatus 422)
5. **Photo URLs** prefixed with `/storage/` in Show.jsx
6. **Deadline format** uses `substring(0, 10)` guard in Edit.jsx
7. **Badge colors** consistent between Index and Show pages

---

## File Changes Summary

### New Files (3)
- `app/Services/PhotoUploadService.php`
- `tests/Feature/ProjectSubResourceTest.php`
- `docs/dev-team/reviews/phase2-review.md`

### Modified Files (10)
- `app/Http/Controllers/ProjectController.php` — all 11 methods implemented
- `app/Http/Middleware/HandleInertiaRequests.php` — activeTimer shared prop
- `app/Models/TimeEntry.php` — scopeRunning() added
- `resources/js/Pages/Projects/Index.jsx` — list + kanban board
- `resources/js/Pages/Projects/Create.jsx` — full form
- `resources/js/Pages/Projects/Edit.jsx` — full form
- `resources/js/Pages/Projects/Show.jsx` — detail page (751 lines)
- `resources/js/Layouts/AppLayout.jsx` — live timer widget
- `tests/Feature/ProjectControllerTest.php` — expanded to 12 tests
- `docs/dev-team/task-manifest.md` + plans/

---

## Ready for Phase 3: Inventory & Materials

The Project Tracker is complete. Phase 3 can now build on this foundation:
- Materials CRUD with category filtering
- Stock adjustment with history
- Supplier management
- Link materials to projects with quantity tracking
- Low stock query and alert notification
- Cost tracking per project based on materials used
