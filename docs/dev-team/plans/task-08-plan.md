# Task 08 Plan: Persistent Timer Widget in AppLayout

**Task ID:** 08
**Domain:** frontend
**Parallel Group:** 4 (depends on Task 03)
**Complexity:** M
**Status:** pending

---

## 1. Approach

Replace the two static `00:00:00` placeholder elements in `AppLayout.jsx` with a live timer widget implemented as an extracted `TimerWidget` component (defined in the same file or as a separate file in `Components/`). The widget reads `activeTimer` from `usePage().props.activeTimer`, manages a `setInterval` via `useEffect`, and displays a ticking `HH:MM:SS` counter in amber when a timer is running.

No new npm packages are required. The implementation uses only React built-ins (`useState`, `useEffect`) and Inertia's `usePage` and `router`, which are already imported in `AppLayout.jsx`.

The plan extracts a `TimerWidget` component and renders it in both the desktop and mobile locations in `AppLayout.jsx`. Both render the same component so tick behavior is identical and state is shared (via the shared `activeTimer` prop from Inertia — not local state passed between instances; each renders its own `TimerWidget` instance since they are in different layout positions).

---

## 2. Files to Modify

| Action | Path |
|--------|------|
| Modify | `resources/js/Layouts/AppLayout.jsx` |

No other files change. Starting/stopping the timer is done from the project detail page (Task 07); this task is display-only.

---

## 3. `activeTimer` Prop Shape

Task 03 adds `activeTimer` to `HandleInertiaRequests::share()`. When a timer is running, the shape is:

```js
{
  id:            "01hx...",          // ULID of the TimeEntry
  project_id:    "01hx...",          // ULID of the Project
  project_slug:  "kitchen-island",   // slug for URL navigation
  project_title: "Kitchen Island",   // human-readable project name
  started_at:    "2026-03-03T14:22:00.000000Z"  // ISO 8601 UTC string
}
```

When no timer is running (user not authenticated, or no open `TimeEntry`): `activeTimer` is `null`.

---

## 4. Component Design: `TimerWidget`

Extract a `TimerWidget` function component defined at the top of the file (above `AppLayout`) or in `resources/js/Components/TimerWidget.jsx`. Given this is small (under 60 lines) and only used by `AppLayout`, defining it in the same file is preferred — it avoids a new file and keeps related code together.

### Props

`TimerWidget` receives no props. It reads `activeTimer` directly from `usePage().props.activeTimer`. This avoids prop-drilling and ensures both the desktop and mobile renders stay synchronized with Inertia's shared state.

### State

```js
const [elapsed, setElapsed] = useState(0); // milliseconds
```

`elapsed` represents how many milliseconds have passed since `activeTimer.started_at`. It is computed as `Date.now() - new Date(activeTimer.started_at).getTime()` on each tick.

### Effect

```js
useEffect(() => {
    if (!activeTimer) {
        setElapsed(0);
        return;
    }

    // Compute initial elapsed immediately (avoids 1-second lag on mount)
    const startMs = new Date(activeTimer.started_at).getTime();
    setElapsed(Date.now() - startMs);

    const id = setInterval(() => {
        setElapsed(Date.now() - startMs);
    }, 1000);

    return () => clearInterval(id);
}, [activeTimer]);
```

Key decisions:
- `activeTimer` is the dependency: the effect restarts whenever the active timer changes (e.g., user stops one timer and starts another — Inertia pushes a new `activeTimer` prop and the effect re-runs with the new `started_at`).
- The initial `setElapsed` call before `setInterval` prevents a 1-second blank/zero display on mount.
- Cleanup via `clearInterval(id)` ensures no memory leak on unmount or when `activeTimer` becomes null.
- `startMs` is computed once per effect run (not on every tick) for efficiency.

### Format Function

```js
function formatElapsed(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s]
        .map((v) => String(v).padStart(2, '0'))
        .join(':');
}
```

This produces `HH:MM:SS` using pure vanilla JS — no date libraries needed.

- When `elapsed = 0`: outputs `00:00:00`
- When `elapsed = 3723000` (1h 2m 3s): outputs `01:02:03`
- When `elapsed = 36000000` (10h): outputs `10:00:00`

### Click Handler

When `activeTimer` is set, the widget is clickable. Clicking navigates to the project's show page:

```js
const handleClick = () => {
    if (activeTimer) {
        router.visit('/projects/' + activeTimer.project_slug);
    }
};
```

### Render Logic

```jsx
function TimerWidget() {
    const { activeTimer } = usePage().props;
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!activeTimer) {
            setElapsed(0);
            return;
        }
        const startMs = new Date(activeTimer.started_at).getTime();
        setElapsed(Date.now() - startMs);
        const id = setInterval(() => {
            setElapsed(Date.now() - startMs);
        }, 1000);
        return () => clearInterval(id);
    }, [activeTimer]);

    const isRunning = Boolean(activeTimer);
    const display = formatElapsed(elapsed);

    if (isRunning) {
        return (
            <button
                type="button"
                onClick={() => router.visit('/projects/' + activeTimer.project_slug)}
                className="flex items-center space-x-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 transition-colors hover:bg-amber-100"
                title={`Timer running: ${activeTimer.project_title}`}
            >
                <svg
                    className="h-4 w-4 text-amber-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="font-mono text-sm font-medium text-amber-700">
                    {display}
                </span>
            </button>
        );
    }

    return (
        <div className="flex items-center space-x-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5">
            <svg
                className="h-4 w-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-mono text-sm font-medium text-gray-700">
                00:00:00
            </span>
        </div>
    );
}
```

The idle state renders a plain `<div>` (non-interactive), preserving the existing desktop widget appearance (same Tailwind classes already in the file). The running state swaps to a `<button>` with amber colors and a `title` attribute showing the project name for accessibility.

---

## 5. Changes to AppLayout.jsx

### Imports

Add `useEffect` and `useState` to the existing React import (they are not currently imported):

```js
import { useState, useEffect } from 'react';
```

`usePage` and `router` are already imported from `@inertiajs/react` on line 1.

### Add `formatElapsed` and `TimerWidget` above `AppLayout`

Insert the `formatElapsed` function and `TimerWidget` component definition after the existing imports and before the `navLinks` array (or after it — before `AppLayout`).

### Replace Desktop Timer Placeholder

Current (lines 74-92):
```jsx
{/* Timer Widget Placeholder */}
<div className="flex items-center space-x-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5">
    <svg
        className="h-4 w-4 text-gray-500"
        ...
    >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
    <span className="font-mono text-sm font-medium text-gray-700">
        00:00:00
    </span>
</div>
```

Replacement:
```jsx
{/* Timer Widget */}
<TimerWidget />
```

### Replace Mobile Timer Placeholder

Current (lines 146-149):
```jsx
{/* Timer Widget (mobile) */}
<span className="font-mono text-sm font-medium text-gray-700">
    00:00:00
</span>
```

Replacement:
```jsx
{/* Timer Widget (mobile) */}
<TimerWidget />
```

Both mobile and desktop render the same `<TimerWidget />` component. Each instance maintains its own `elapsed` state and its own `setInterval`, but since both compute from the same `activeTimer.started_at` value provided by Inertia, they tick in sync. The maximum drift between instances is sub-millisecond (both read `Date.now()` independently on each tick, but both fire within the same 1000ms window).

---

## 6. Complete Resulting File

After modifications, `AppLayout.jsx` will be structured as:

```
import { Link, Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const navLinks = [ ... ];         // unchanged

function isActive(...) { ... }   // unchanged

function formatElapsed(ms) { ... }  // NEW

function TimerWidget() { ... }      // NEW

export default function AppLayout({ children, title }) {
    // ... unchanged body ...
    // Desktop: <TimerWidget />  (replaces static div)
    // Mobile:  <TimerWidget />  (replaces static span)
}
```

---

## 7. Key Decisions

### Decision 1: `TimerWidget` in the same file, not a separate component file

The component is small (~60 lines), used only by `AppLayout`, and has no independent reusability. Keeping it in `AppLayout.jsx` avoids a new file and keeps all layout-nav concerns in one place. The governance rule is to use `resources/js/Components/` for shared components — `TimerWidget` is not shared across pages, so it does not belong there.

If future tasks need to render this widget elsewhere, it can be extracted to `resources/js/Components/TimerWidget.jsx` without breaking changes (just update the import in `AppLayout.jsx`).

### Decision 2: `usePage()` called inside `TimerWidget`, not passed as a prop

`TimerWidget` calls `usePage()` directly. This is idiomatic Inertia.js — shared props are designed to be read via `usePage()` anywhere in the tree. The alternative (passing `activeTimer` as a prop from `AppLayout`) would require `AppLayout` to read it and pass it down, adding prop-drilling for no benefit. Direct `usePage()` access also ensures both instances see the same prop value simultaneously when Inertia re-renders after navigation.

### Decision 3: `activeTimer` as the single `useEffect` dependency

The effect depends only on `activeTimer` (the object reference from Inertia). When Inertia does a full-page visit, all components re-mount and the effect re-runs naturally. When Inertia does a partial Inertia visit that updates `activeTimer` (e.g., stopping a timer from the project page), Inertia updates the shared props and React re-renders `TimerWidget`. The effect sees that `activeTimer` changed (new object reference or changed from non-null to null), clears the old interval, and starts a new one (or bails out if null).

### Decision 4: Elapsed time computed from `Date.now()` minus `started_at` on every tick

The alternative (incrementing a counter by 1000ms per tick) drifts over time because `setInterval` is not precise — it fires approximately every 1000ms but can be delayed by CPU load, browser throttling, etc. Computing `Date.now() - startMs` on every tick anchors to wall-clock time and self-corrects, ensuring the displayed time is always accurate to within one second.

### Decision 5: `started_at` is an ISO 8601 UTC string from the server

`new Date(activeTimer.started_at)` parses ISO 8601 strings correctly in all modern browsers. The spec states `started_at` comes from a MySQL `timestamp` column, which Inertia serializes as an ISO 8601 string in UTC (e.g., `"2026-03-03T14:22:00.000000Z"`). No timezone conversion is needed — `Date.now()` is also UTC. The difference is always correct regardless of the user's local timezone.

### Decision 6: Idle widget renders a `<div>`, running widget renders a `<button>`

Using a `<button>` for the interactive state follows semantic HTML and accessibility best practices — buttons are keyboard-navigable and trigger `onClick` on Enter. Using a `<div>` with `onClick` for the idle state would be wrong; the idle widget is non-interactive by spec, so `<div>` is correct and needs no `role` or `tabIndex`.

### Decision 7: Both desktop and mobile use `<TimerWidget />` with the same amber styling

The spec says both locations show the widget. The desktop location is a styled box (border, background). The mobile location is currently a plain `<span>`. After this change, both will render the full `<TimerWidget />` including the SVG clock icon and proper idle/running styles. The mobile location is inside `flex items-center space-x-3`, so the widget box will render inline correctly. This is a minor improvement over the current mobile implementation (which lacked the icon and box styling).

---

## 8. Verified Dependencies

| Requirement | Status |
|-------------|--------|
| `usePage` imported from `@inertiajs/react` | Already in `AppLayout.jsx` line 1 |
| `router` imported from `@inertiajs/react` | Already in `AppLayout.jsx` line 1 |
| `useState` from React | Not yet imported — must add to import |
| `useEffect` from React | Not yet imported — must add to import |
| `activeTimer` shared prop from `HandleInertiaRequests` | Added in Task 03 (dependency) |
| `activeTimer.started_at` is an ISO 8601 UTC string | Confirmed from Task 03 spec: MySQL `timestamp` column |
| `activeTimer.project_slug` exists on the shared prop | Confirmed from Task 03 AC: `{ id, project_id, project_slug, project_title, started_at }` |
| No new npm packages | Confirmed — only React and Inertia built-ins used |

---

## 9. Risks

### Risk 1: Task 03 not yet complete — `activeTimer` not yet in shared props

**Risk:** If Task 03 has not been implemented, `usePage().props.activeTimer` will be `undefined`, not `null`. The check `if (!activeTimer)` handles both `null` and `undefined`, so the widget will safely render idle. No crash will occur.

**Mitigation:** The `if (!activeTimer)` guard in the `useEffect` and the `Boolean(activeTimer)` check in the render handle `undefined` gracefully. When Task 03 is complete, no changes are needed to Task 08's code.

### Risk 2: Clock SVG icon renders at wrong size on mobile

**Risk:** The current mobile timer placeholder is a plain `<span>` with no icon. After this change, the mobile location renders the full `<TimerWidget />` including the SVG clock. Inside `flex items-center space-x-3 sm:hidden`, the box may be slightly taller than before, potentially shifting the hamburger button.

**Mitigation:** The `TimerWidget` uses `py-1.5` padding (same as desktop). The mobile container already uses `flex items-center` which centers vertically. Visual regression is minimal. If needed, a reviewer can apply `sm:hidden` responsive variants or reduce padding for mobile in a follow-up.

### Risk 3: `setInterval` firing after component unmount

**Risk:** If `TimerWidget` unmounts (e.g., full page navigation away from an Inertia-rendered page) while the interval is running, a memory leak or state update on an unmounted component warning could occur.

**Mitigation:** The `useEffect` cleanup function `return () => clearInterval(id)` runs on unmount, clearing the interval. React 19 enforces this strictly, so the cleanup is sufficient.

### Risk 4: `started_at` value from server is in the future (clock skew)

**Risk:** If the server clock is ahead of the client clock, `Date.now() - startMs` will be negative. `formatElapsed` would compute a negative `totalSeconds`, producing a negative display like `-00:00:01`.

**Mitigation:** Add `Math.max(0, ms)` inside `formatElapsed`:

```js
function formatElapsed(ms) {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    ...
}
```

This clamps negative elapsed time to zero, showing `00:00:00` until the clocks align.

---

## 10. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| Read `activeTimer` from `usePage().props.activeTimer` | `TimerWidget` calls `const { activeTimer } = usePage().props` |
| When null: display 00:00:00 in gray, non-interactive | `isRunning = false` branch renders a `<div>` with gray text |
| When set: tick up every second using setInterval/useEffect | `useEffect` with `setInterval(1000)` computing `Date.now() - startMs` |
| Compute from `activeTimer.started_at` | `const startMs = new Date(activeTimer.started_at).getTime()` |
| Format HH:MM:SS | `formatElapsed(ms)` with `padStart(2, '0')` and join with `:` |
| Amber color when running | `text-amber-700`, `border-amber-300`, `bg-amber-50` on running button |
| Clicking while running navigates to project | `router.visit('/projects/' + activeTimer.project_slug)` in `onClick` |
| setInterval cleared on null/unmount | `useEffect` returns `() => clearInterval(id)` |
| Works in both desktop and mobile locations | Both locations replaced with `<TimerWidget />` |
| No extra npm packages | Only `useState`, `useEffect` (React), `usePage`, `router` (Inertia) |
