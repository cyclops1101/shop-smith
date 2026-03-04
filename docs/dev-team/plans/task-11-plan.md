# Task 11 Implementation Plan: HandleInertiaRequests Shared Data

## 1. Approach

Update the `HandleInertiaRequests` middleware (scaffolded by Breeze in Task 01) so that every Inertia response automatically includes three global data keys:

- `auth.user` — the authenticated user's safe fields (`id`, `name`, `email`) or `null` for guests
- `flash` — session flash messages for the four standard keys (`success`, `error`, `warning`, `info`)
- `appName` — the application name from `config('app.name')`

This middleware runs on every Inertia request, so the shared data is available on every page via `usePage().props` without controllers needing to pass it explicitly. This is the standard Inertia pattern for global page data.

The change is confined to a single file: `app/Http/Middleware/HandleInertiaRequests.php`. The `share()` method is merged with the data array it returns. Breeze's scaffolded version already has a `share()` method; this task adds to it rather than replacing it.

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Modify | `app/Http/Middleware/HandleInertiaRequests.php` |

No new files are created. No routes, controllers, or frontend files are changed.

## 3. Key Decisions

### Decision 1: Use `only()` to whitelist safe user fields

The `auth()->user()` object includes `password`, `remember_token`, and potentially other sensitive fields. The shared data must never expose these. Use the Eloquent model's `only()` method to whitelist exactly the fields that pages need:

```php
'auth' => [
    'user' => $request->user()?->only(['id', 'name', 'email']),
],
```

`?->only()` uses PHP's nullsafe operator — if the user is a guest, `$request->user()` returns `null`, and `only()` is never called. The result is `auth.user = null` for unauthenticated Inertia requests.

This is safer than `toArray()` (which would expose all model attributes) and more explicit than manually constructing the array.

### Decision 2: Flash keys must always be present even if null

Frontend pages will reference `usePage().props.flash.success` in conditional rendering. If the key does not exist in the props, optional chaining (`?.`) is required in every page that reads flash data. To simplify page code, all four flash keys are always present — they are `null` when no message has been set:

```php
'flash' => [
    'success' => $request->session()->get('success'),
    'error'   => $request->session()->get('error'),
    'warning' => $request->session()->get('warning'),
    'info'    => $request->session()->get('info'),
],
```

Calling `session()->get('key')` returns `null` when the key does not exist, so no ternary or null-coalescing is needed.

### Decision 3: `appName` at the top level, not nested

`appName` is a single scalar value shared for display (e.g., in the page `<title>` or nav bar). Keeping it at the top level (`props.appName`) rather than nested (`props.app.name`) is simpler for consumers.

### Decision 4: Merge with `array_merge`, not replace

Breeze scaffolds a `share()` method that may already return `auth.user` in some versions. The implementation must use `array_merge(parent::share($request), [...])` to preserve any existing Breeze shared data and extend it with the new keys. This prevents accidentally removing data that Breeze auth pages depend on.

### Decision 5: Session flash is read-once

Laravel's session flash data is automatically removed from the session after it is read once. `session()->get('key')` does not remove the flash — it returns the value while leaving the removal to Laravel's standard flash lifecycle (cleared on the next request). This is the correct behavior: the flash message appears once after a redirect, then disappears.

## 4. Verified Dependencies

- **Task 01 (Breeze install):** Required. `HandleInertiaRequests.php` is created by Breeze. This task modifies that file and will fail if Task 01 has not been completed.
- **Task 04 (Eloquent Models):** Not strictly required for this task, since `auth()->user()` returns a `User` model which exists before Task 04 (Breeze creates `app/Models/User.php`). Task 04 creates the application domain models; `User` is a Breeze model and already present.
- **Task 06 (Routes + Controller Stubs):** Not required. `HandleInertiaRequests` middleware runs on any Inertia request, regardless of which routes exist.
- **Laravel 12.53.0** (confirmed from application-info): `$request->user()` and `session()->get()` are available.
- **`inertiajs/inertia-laravel`:** Installed by Task 01 via Breeze. `HandleInertiaRequests` extends `\Inertia\Middleware`, which requires this package.

## 5. Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Task 01 not complete when Task 11 runs | Low | Task 11 is in Group 4; Task 01 is in Group 1. The manifest enforces this ordering. Verify Task 01 is complete before starting. |
| Breeze already shares `auth.user` in a different format | Medium | Inspect the existing `share()` method in `HandleInertiaRequests.php` after Breeze installation. If Breeze already shares `auth.user`, the new implementation must either replace the Breeze version or merge carefully to avoid nested `auth.user.user` structures. |
| Sensitive user fields exposed via `toArray()` | Low | Use `only(['id', 'name', 'email'])` — never `toArray()` or `$request->user()` raw. |
| Flash data not available on the session (session driver not configured) | Very low | The project uses `database` session driver via Sail. Session is always available on authenticated requests. Guest requests may not have a session, but `session()->get()` handles this gracefully (returns null). |
| `parent::share($request)` raises exception if parent does not define `share()` | Very low | `\Inertia\Middleware` defines `share()` returning an empty array by default. `array_merge` with an empty array is safe. |
| `auth.user` being `null` causes JS errors on authenticated-only pages | Low | Pages that require auth are protected by the `auth` middleware in routes (Task 06). If a guest reaches an auth-protected Inertia page, Laravel redirects them before Inertia renders. `auth.user = null` is only seen on the Portfolio (public) page, which should not read `auth.user`. |

## 6. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| `HandleInertiaRequests::share()` includes `auth.user`, `flash`, and `appName` | `share()` returns an array with all three top-level keys |
| `auth.user` only exposes `id`, `name`, `email` — not `password` or other sensitive fields | `$request->user()?->only(['id', 'name', 'email'])` — explicit whitelist |
| Flash keys `success`, `error`, `warning`, `info` are all present (even if null) | All four keys are explicitly set via `session()->get()` which returns null when absent |
| An unauthenticated Inertia request has `auth.user = null` | PHP nullsafe operator `?->only()` returns `null` when `$request->user()` is `null` |
| `php artisan test` still passes after the change | No logic is added — only data sharing in middleware. Existing tests are not affected. |

---

## Appendix: Implementation

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user()?->only(['id', 'name', 'email']),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info'    => $request->session()->get('info'),
            ],
            'appName' => config('app.name'),
        ]);
    }
}
```

### Frontend usage pattern (reference for page implementers)

```js
import { usePage } from '@inertiajs/react'

// In any page component:
const { auth, flash, appName } = usePage().props

// auth.user is { id, name, email } or null
// flash.success is a string or null
// appName is the APP_NAME config value (e.g., "Workshop Manager")
```
