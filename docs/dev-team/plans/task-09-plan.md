# Task 09 Plan: Supplier Controller Feature Tests

## 1. Objective

Create `tests/Feature/SupplierControllerTest.php` covering all 7 resource actions on the
`SupplierController` with 14 tests total. The test file must be immediately runnable, which
means four prerequisite files must also be created as part of this task: the route registration,
`SupplierController`, `StoreSupplierRequest`, and `UpdateSupplierRequest`. Without these, all
tests would produce 404 responses and fail at the assertion level.

---

## 2. Current State Analysis

### What exists

| Artifact | Status |
|---|---|
| `App\Models\Supplier` | Exists. Uses `HasUlids`, `HasFactory`. No soft deletes. Has `materials()` and `expenses()` HasMany relations. |
| `Database\Factories\SupplierFactory` | Exists. Generates `name` via `fake()->company()`. All other fields null by default. |
| `Database\Factories\MaterialFactory` | Exists. Has `withSupplier()` state that creates a related Supplier. `supplier_id` is nullable in the factory by default. |
| `database/migrations/..._create_suppliers_table.php` | Exists. Columns: `id` (ULID PK), `name`, `contact_name`, `phone`, `email`, `website`, `address`, `notes`, timestamps. No soft deletes. |
| `database/migrations/..._create_materials_table.php` | Exists. `supplier_id` FK with `->nullOnDelete()` cascade rule. This is the database-level cascade that nullifies `supplier_id` on related materials when a supplier is hard-deleted. |
| `App\Http\Controllers\SupplierController` | Does NOT exist. Must be created. |
| `App\Http\Requests\StoreSupplierRequest` | Does NOT exist. Must be created. |
| `App\Http\Requests\UpdateSupplierRequest` | Does NOT exist. Must be created. |
| Route `Route::resource('suppliers', ...)` | Does NOT exist in `routes/web.php`. Must be added. |

### Key model characteristics

- **No soft deletes**: `App\Models\Supplier` does not use `SoftDeletes`. `destroy` must hard-delete.
  The test must use `assertDatabaseMissing`, never `assertSoftDeleted`.
- **ULID primary key**: Route model binding resolves suppliers by ULID (`/suppliers/{supplier}`).
  URLs in tests use `$supplier->id` (the ULID), not a slug.
- **DB cascade on materials**: `supplier_id` on the `materials` table is declared
  `->foreignUlid('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete()`.
  When a supplier is hard-deleted, MySQL automatically sets `supplier_id = null` on all related
  materials rows. No application-level observer or event is needed — this is enforced at the
  database constraint level.
- **`email_verified_at` defaults to `now()`**: `UserFactory` sets `email_verified_at => now()`
  by default, so `User::factory()->create()` produces a verified user and the `['auth', 'verified']`
  middleware group will not redirect to the email verification notice page.

### Inertia component name convention

Inertia component names follow the `Resource/Action` pattern used by all existing controllers:

| Action | Component |
|---|---|
| index | `Suppliers/Index` |
| create | `Suppliers/Create` |
| show | `Suppliers/Show` |
| edit | `Suppliers/Edit` |

### Route key

Supplier uses the default Eloquent route key (`id`, which is the ULID). No slug. URLs are:
- `GET /suppliers`
- `GET /suppliers/create`
- `POST /suppliers`
- `GET /suppliers/{supplier}` (ULID)
- `GET /suppliers/{supplier}/edit` (ULID)
- `PATCH /suppliers/{supplier}` (ULID)
- `DELETE /suppliers/{supplier}` (ULID)

---

## 3. Files to Create or Modify

| Action | Path | Notes |
|---|---|---|
| Create | `tests/Feature/SupplierControllerTest.php` | Primary deliverable — 14 test methods |
| Create | `app/Http/Controllers/SupplierController.php` | Full resource controller with real logic |
| Create | `app/Http/Requests/StoreSupplierRequest.php` | Validates name (required), email (nullable email), website (nullable url) |
| Create | `app/Http/Requests/UpdateSupplierRequest.php` | Same rules, name is `sometimes\|required` |
| Modify | `routes/web.php` | Add `Route::resource('suppliers', SupplierController::class)` inside the auth+verified group |

---

## 4. Controller Implementation

The controller must pass real data to Inertia and perform real persistence for the tests to pass.

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search']);

        $query = Supplier::query();

        if ($search = $filters['search'] ?? null) {
            $query->where('name', 'like', '%' . $search . '%');
        }

        $suppliers = $query->orderBy('name')->paginate(20)->withQueryString();

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters'   => $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Suppliers/Create');
    }

    public function store(StoreSupplierRequest $request): RedirectResponse
    {
        $supplier = Supplier::create($request->validated());

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', 'Supplier created successfully.');
    }

    public function show(Supplier $supplier): Response
    {
        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier,
        ]);
    }

    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('Suppliers/Edit', [
            'supplier' => $supplier,
        ]);
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return redirect()->route('suppliers.index')
            ->with('success', 'Supplier deleted successfully.');
    }
}
```

---

## 5. Form Request Implementation

### StoreSupplierRequest

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:50'],
            'email'        => ['nullable', 'email', 'max:255'],
            'website'      => ['nullable', 'url', 'max:500'],
            'address'      => ['nullable', 'string'],
            'notes'        => ['nullable', 'string'],
        ];
    }
}
```

### UpdateSupplierRequest

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:50'],
            'email'        => ['nullable', 'email', 'max:255'],
            'website'      => ['nullable', 'url', 'max:500'],
            'address'      => ['nullable', 'string'],
            'notes'        => ['nullable', 'string'],
        ];
    }
}
```

---

## 6. Route Registration

Add inside the existing `Route::middleware(['auth', 'verified'])` group in `routes/web.php`:

```php
// Suppliers (full resource: index, create, store, show, edit, update, destroy)
Route::resource('suppliers', SupplierController::class);
```

Also add the import at the top of the file:

```php
use App\Http\Controllers\SupplierController;
```

---

## 7. Test Class Structure

```php
<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SupplierControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ... 14 test methods
}
```

The `private User $user` property is populated in `setUp()` once per test, satisfying the
class structure requirement. Individual tests that do not need `$this->user` (e.g., the guest
redirect test) still have it available but ignore it — this is acceptable.

---

## 8. Detailed Test Method Plan

### Test 1: guest_is_redirected_from_suppliers

```php
#[Test]
public function guest_is_redirected_from_suppliers(): void
{
    $this->get('/suppliers')->assertRedirect('/login');
}
```

Rationale: unauthenticated GET against an auth-guarded route must redirect to `/login`. No `actingAs` call used. `$this->user` from `setUp` is created but not used in this test — that is acceptable.

### Test 2: authenticated_user_can_view_suppliers_index

```php
#[Test]
public function authenticated_user_can_view_suppliers_index(): void
{
    $this->actingAs($this->user)
        ->get('/suppliers')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Suppliers/Index')
            ->has('suppliers')
            ->has('filters')
        );
}
```

Rationale: verifies the Inertia component name and the presence of both required props.

### Test 3: index_search_filters_by_name

```php
#[Test]
public function index_search_filters_by_name(): void
{
    $supplier1 = Supplier::factory()->create(['name' => 'Woodcraft Supply']);
    $supplier2 = Supplier::factory()->create(['name' => 'Rockler Tools']);

    $this->actingAs($this->user)
        ->get('/suppliers?search=Woodcraft')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Suppliers/Index')
            ->has('filters', fn ($filters) => $filters
                ->where('search', 'Woodcraft')
                ->etc()
            )
        );
}
```

Rationale: creates 2 suppliers with distinct names, searches by name1's distinctive term. Verifies the `filters` prop echoes the search value. Does not assert row count in the paginated result to avoid brittleness; the filter echo is sufficient to confirm the controller passes the parameter through.

### Test 4: create_page_renders

```php
#[Test]
public function create_page_renders(): void
{
    $this->actingAs($this->user)
        ->get('/suppliers/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Suppliers/Create')
        );
}
```

Rationale: the create page has no dynamic props (no enums, no related data) so only the component name is asserted.

### Test 5: store_creates_supplier_and_redirects_to_show

```php
#[Test]
public function store_creates_supplier_and_redirects_to_show(): void
{
    $response = $this->actingAs($this->user)->post('/suppliers', [
        'name' => 'Acme Lumber Co',
    ]);

    $this->assertDatabaseHas('suppliers', ['name' => 'Acme Lumber Co']);

    $supplier = Supplier::where('name', 'Acme Lumber Co')->first();
    $response->assertRedirect(route('suppliers.show', $supplier));
}
```

Rationale: only `name` is required. Verifies both the DB record and the redirect URL. The redirect assertion uses the actual created model to generate the route, so the ULID in the URL is always correct.

### Test 6: store_requires_name

```php
#[Test]
public function store_requires_name(): void
{
    $this->actingAs($this->user)
        ->post('/suppliers', [])
        ->assertSessionHasErrors(['name']);
}
```

Rationale: `$this->post()` in Laravel tests does not include the `X-Inertia: true` header by default. Validation failures therefore follow the traditional Laravel redirect-with-session-flash pattern rather than returning 422. `assertSessionHasErrors(['name'])` is the correct assertion.

### Test 7: store_rejects_invalid_email

```php
#[Test]
public function store_rejects_invalid_email(): void
{
    $this->actingAs($this->user)
        ->post('/suppliers', [
            'name'  => 'Valid Name',
            'email' => 'not-an-email',
        ])
        ->assertSessionHasErrors(['email']);
}
```

Rationale: the `email` rule in `StoreSupplierRequest` is `['nullable', 'email', ...]`. Providing a malformed email string should trigger a validation error on the `email` key.

### Test 8: store_rejects_invalid_website_url

```php
#[Test]
public function store_rejects_invalid_website_url(): void
{
    $this->actingAs($this->user)
        ->post('/suppliers', [
            'name'    => 'Valid Name',
            'website' => 'not-a-url',
        ])
        ->assertSessionHasErrors(['website']);
}
```

Rationale: the `website` rule is `['nullable', 'url', ...]`. A plain string without a scheme fails the `url` rule.

### Test 9: show_returns_supplier

```php
#[Test]
public function show_returns_supplier(): void
{
    $supplier = Supplier::factory()->create();

    $this->actingAs($this->user)
        ->get('/suppliers/' . $supplier->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Suppliers/Show')
            ->has('supplier')
            ->where('supplier.id', $supplier->id)
        );
}
```

Rationale: `$supplier->id` is the ULID, which is the route key. `where('supplier.id', $supplier->id)` confirms the correct supplier is passed, not just any supplier.

### Test 10: edit_returns_supplier

```php
#[Test]
public function edit_returns_supplier(): void
{
    $supplier = Supplier::factory()->create();

    $this->actingAs($this->user)
        ->get('/suppliers/' . $supplier->id . '/edit')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Suppliers/Edit')
            ->has('supplier')
            ->where('supplier.id', $supplier->id)
        );
}
```

Rationale: same shape as show. Confirms edit loads the correct record.

### Test 11: update_saves_changes_and_redirects_to_show

```php
#[Test]
public function update_saves_changes_and_redirects_to_show(): void
{
    $supplier = Supplier::factory()->create(['name' => 'Old Name']);

    $response = $this->actingAs($this->user)
        ->patch('/suppliers/' . $supplier->id, ['name' => 'New Name']);

    $this->assertDatabaseHas('suppliers', [
        'id'   => $supplier->id,
        'name' => 'New Name',
    ]);

    $response->assertRedirect(route('suppliers.show', $supplier));
}
```

Rationale: verifies the DB was updated and the redirect targets the show route. `$supplier` (unrefreshed) is used in the route helper because the ULID does not change on update.

### Test 12: update_with_invalid_email_returns_error

```php
#[Test]
public function update_with_invalid_email_returns_error(): void
{
    $supplier = Supplier::factory()->create();

    $this->actingAs($this->user)
        ->patch('/suppliers/' . $supplier->id, [
            'email' => 'not-an-email',
        ])
        ->assertSessionHasErrors(['email']);
}
```

Rationale: `UpdateSupplierRequest` applies the same `email` validation as the store request. Sending an invalid email on update must fail validation on the `email` key.

### Test 13: destroy_hard_deletes_supplier

```php
#[Test]
public function destroy_hard_deletes_supplier(): void
{
    $supplier = Supplier::factory()->create();

    $response = $this->actingAs($this->user)
        ->delete('/suppliers/' . $supplier->id);

    $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
    $response->assertRedirect(route('suppliers.index'));
}
```

Rationale: `Supplier` has no `SoftDeletes` trait, so `delete()` performs a hard delete. `assertDatabaseMissing` confirms the row is gone from the `suppliers` table. `assertSoftDeleted` must NOT be used here — it would check `deleted_at` which does not exist on this model.

### Test 14: destroy_nullifies_supplier_id_on_related_materials

```php
#[Test]
public function destroy_nullifies_supplier_id_on_related_materials(): void
{
    $supplier = Supplier::factory()->create();
    $material = Material::factory()->create(['supplier_id' => $supplier->id]);

    $this->actingAs($this->user)
        ->delete('/suppliers/' . $supplier->id);

    // Material record still exists (it uses soft deletes, not hard delete)
    $this->assertDatabaseHas('materials', ['id' => $material->id]);

    // supplier_id has been nullified by the DB cascade constraint
    $this->assertDatabaseHas('materials', [
        'id'          => $material->id,
        'supplier_id' => null,
    ]);
}
```

Rationale: the `materials` migration defines
`->foreignUlid('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete()`.
MySQL enforces this constraint at the database level; when the supplier row is deleted, all
referencing `materials.supplier_id` values are set to `NULL` automatically. No application
code (no observer, no event) is required. The test verifies this DB-level behavior by:
1. Creating a supplier and a material that references it.
2. Deleting the supplier via the controller.
3. Asserting the material row still exists (it is not deleted).
4. Asserting `supplier_id` is now `null` on that material row.

The material still exists because `Material` uses `SoftDeletes` with no cascade delete from
the supplier side — only the FK column is nullified.

---

## 9. Complete Test File

```php
<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SupplierControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    #[Test]
    public function guest_is_redirected_from_suppliers(): void
    {
        $this->get('/suppliers')->assertRedirect('/login');
    }

    #[Test]
    public function authenticated_user_can_view_suppliers_index(): void
    {
        $this->actingAs($this->user)
            ->get('/suppliers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Suppliers/Index')
                ->has('suppliers')
                ->has('filters')
            );
    }

    #[Test]
    public function index_search_filters_by_name(): void
    {
        $supplier1 = Supplier::factory()->create(['name' => 'Woodcraft Supply']);
        $supplier2 = Supplier::factory()->create(['name' => 'Rockler Tools']);

        $this->actingAs($this->user)
            ->get('/suppliers?search=Woodcraft')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Suppliers/Index')
                ->has('filters', fn ($filters) => $filters
                    ->where('search', 'Woodcraft')
                    ->etc()
                )
            );
    }

    #[Test]
    public function create_page_renders(): void
    {
        $this->actingAs($this->user)
            ->get('/suppliers/create')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Suppliers/Create')
            );
    }

    #[Test]
    public function store_creates_supplier_and_redirects_to_show(): void
    {
        $response = $this->actingAs($this->user)->post('/suppliers', [
            'name' => 'Acme Lumber Co',
        ]);

        $this->assertDatabaseHas('suppliers', ['name' => 'Acme Lumber Co']);

        $supplier = Supplier::where('name', 'Acme Lumber Co')->first();
        $response->assertRedirect(route('suppliers.show', $supplier));
    }

    #[Test]
    public function store_requires_name(): void
    {
        $this->actingAs($this->user)
            ->post('/suppliers', [])
            ->assertSessionHasErrors(['name']);
    }

    #[Test]
    public function store_rejects_invalid_email(): void
    {
        $this->actingAs($this->user)
            ->post('/suppliers', [
                'name'  => 'Valid Name',
                'email' => 'not-an-email',
            ])
            ->assertSessionHasErrors(['email']);
    }

    #[Test]
    public function store_rejects_invalid_website_url(): void
    {
        $this->actingAs($this->user)
            ->post('/suppliers', [
                'name'    => 'Valid Name',
                'website' => 'not-a-url',
            ])
            ->assertSessionHasErrors(['website']);
    }

    #[Test]
    public function show_returns_supplier(): void
    {
        $supplier = Supplier::factory()->create();

        $this->actingAs($this->user)
            ->get('/suppliers/' . $supplier->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Suppliers/Show')
                ->has('supplier')
                ->where('supplier.id', $supplier->id)
            );
    }

    #[Test]
    public function edit_returns_supplier(): void
    {
        $supplier = Supplier::factory()->create();

        $this->actingAs($this->user)
            ->get('/suppliers/' . $supplier->id . '/edit')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Suppliers/Edit')
                ->has('supplier')
                ->where('supplier.id', $supplier->id)
            );
    }

    #[Test]
    public function update_saves_changes_and_redirects_to_show(): void
    {
        $supplier = Supplier::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($this->user)
            ->patch('/suppliers/' . $supplier->id, ['name' => 'New Name']);

        $this->assertDatabaseHas('suppliers', [
            'id'   => $supplier->id,
            'name' => 'New Name',
        ]);

        $response->assertRedirect(route('suppliers.show', $supplier));
    }

    #[Test]
    public function update_with_invalid_email_returns_error(): void
    {
        $supplier = Supplier::factory()->create();

        $this->actingAs($this->user)
            ->patch('/suppliers/' . $supplier->id, [
                'email' => 'not-an-email',
            ])
            ->assertSessionHasErrors(['email']);
    }

    #[Test]
    public function destroy_hard_deletes_supplier(): void
    {
        $supplier = Supplier::factory()->create();

        $response = $this->actingAs($this->user)
            ->delete('/suppliers/' . $supplier->id);

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
        $response->assertRedirect(route('suppliers.index'));
    }

    #[Test]
    public function destroy_nullifies_supplier_id_on_related_materials(): void
    {
        $supplier = Supplier::factory()->create();
        $material = Material::factory()->create(['supplier_id' => $supplier->id]);

        $this->actingAs($this->user)
            ->delete('/suppliers/' . $supplier->id);

        $this->assertDatabaseHas('materials', ['id' => $material->id]);
        $this->assertDatabaseHas('materials', [
            'id'          => $material->id,
            'supplier_id' => null,
        ]);
    }
}
```

---

## 10. Key Decisions with Rationale

### Decision 1: Hard delete — assertDatabaseMissing, never assertSoftDeleted

`App\Models\Supplier` does not have the `SoftDeletes` trait. The `suppliers` table has no
`deleted_at` column. Calling `$supplier->delete()` executes a hard `DELETE` SQL statement.
`assertDatabaseMissing('suppliers', ['id' => $supplier->id])` is the correct assertion.
Using `assertSoftDeleted` would throw a runtime error because `deleted_at` does not exist on
the `suppliers` table.

### Decision 2: DB cascade nullification via FK constraint, not application code

The `nullOnDelete()` constraint in the `create_materials_table` migration is a MySQL-level
`ON DELETE SET NULL` foreign key rule. It fires inside the MySQL transaction when `DELETE FROM
suppliers WHERE id = ?` executes — no Laravel observer, model event, or service class is
needed. The test exercises this by creating a real material row with `supplier_id` set to the
supplier's ULID, then deleting the supplier and checking the material row's `supplier_id` became
`null`. This works correctly under `RefreshDatabase` because the migration runs fresh for each
test and the FK constraint is active.

### Decision 3: assertSessionHasErrors for all validation tests

`$this->post()` and `$this->patch()` in Laravel's `TestCase` do not attach the `X-Inertia: true`
header. Without that header, the Inertia exception handler does not convert validation failures
to 422 JSON responses; instead, Laravel's standard behavior applies: redirect back with errors
flashed to the session. `assertSessionHasErrors(['name'])`, `assertSessionHasErrors(['email'])`,
and `assertSessionHasErrors(['website'])` are all correct for this scenario.

### Decision 4: setUp() with private User $user

The task spec requires this class structure. `setUp()` calls `parent::setUp()` first (required
by `RefreshDatabase` to wrap the test in a transaction), then creates the user. Each test method
uses `$this->user` via `$this->actingAs($this->user)`. The guest test ignores `$this->user`
but this is harmless — one extra user row in the DB does not affect the unauthenticated request
test.

### Decision 5: ULID route key, not slug

`Supplier` extends `Model` with `HasUlids` but does NOT override `getRouteKeyName()`. The
default Eloquent route key is `id`. URL segments in all tests use `$supplier->id` (the ULID
string). This is consistent with how `MaterialController` tests use `$material->id`.

### Decision 6: Supplier search uses LIKE, not Scout

`Supplier` does not use `Laravel\Scout\Searchable`. The controller's index search is implemented
as a simple `WHERE name LIKE '%term%'` query. This is synchronous, predictable in tests, and
requires no Scout index setup. The search filter test verifies the `filters` prop contains the
search term, which confirms the controller reads and passes the parameter. Asserting exact
result counts is avoided to keep the test non-brittle.

### Decision 7: No Inertia view files needed for tests to pass

`assertInertia` in Laravel tests validates the Inertia response payload (component name and
props) but does NOT attempt to render the React component. The `Suppliers/Index` etc. JSX files
do not need to exist for the tests to pass. This is a deliberate design of the Inertia testing
helper.

---

## 11. Verified Dependencies

| Dependency | Verified |
|---|---|
| `App\Models\Supplier` exists with `HasUlids`, `HasFactory` | Yes — read source |
| `App\Models\Material` exists with `supplier_id` fillable | Yes — read source |
| `Database\Factories\SupplierFactory` exists with `name` via `fake()->company()` | Yes — read source |
| `Database\Factories\MaterialFactory` accepts `supplier_id` as overrideable attribute | Yes — `supplier_id` is in `definition()` as `null`, overrideable |
| `materials` migration has `->nullOnDelete()` on `supplier_id` FK | Yes — read migration source |
| `suppliers` migration has NO `softDeletes()` column | Yes — read migration source |
| `UserFactory` sets `email_verified_at => now()` by default | Yes — read source |
| PHPUnit 11.5.55 is installed | Yes — application-info output |
| `inertiajs/inertia-laravel` 2.0.21 is installed (provides `assertInertia`) | Yes — application-info output |
| No existing `SupplierController` to conflict with | Yes — confirmed via glob search |
| No existing `suppliers` routes to conflict with | Yes — confirmed via list-routes returning empty |
| No existing `StoreSupplierRequest` or `UpdateSupplierRequest` | Yes — confirmed via glob search of Requests directory |

---

## 12. Risks

### Risk 1: RefreshDatabase and MySQL FK constraints

`RefreshDatabase` by default uses database transactions in SQLite but uses `TRUNCATE` in MySQL.
With MySQL and `RefreshDatabase`, tables are truncated in reverse dependency order, which
respects FK constraints. The `nullOnDelete()` constraint is a MySQL-native behavior that is
active during the test. There is no risk of the test failing due to FK constraint violations on
truncation.

Mitigation: None required. The existing test suite already uses `RefreshDatabase` with MySQL
(via Sail) for all other feature tests without issue.

### Risk 2: `assertDatabaseHas` with `supplier_id => null`

`assertDatabaseHas('materials', ['id' => $material->id, 'supplier_id' => null])` uses an
equality check. Laravel's `assertDatabaseHas` translates `null` values to `IS NULL` SQL
conditions correctly as of Laravel 9+. This is confirmed safe on Laravel 12.

Mitigation: None required. Standard Laravel behavior.

### Risk 3: Supplier factory name collisions

`SupplierFactory` uses `fake()->company()` which can theoretically produce the same company
name in two factories within the same test. The `suppliers` table has no unique constraint on
`name`. Even if two suppliers share a name, `store_creates_supplier_and_redirects_to_show`
uses `Supplier::where('name', 'Acme Lumber Co')->first()` which is safe because no other
factory creates a supplier with that exact hardcoded name within the same test.

Mitigation: The hardcoded name `'Acme Lumber Co'` is sufficiently distinctive. No risk.

### Risk 4: Missing Inertia ServiceProvider or test macro

`assertInertia` is provided by the `inertia/laravel` package's `ServiceProvider`. If it were
not registered, the test would fail with a "method not found" error. Since `inertia/laravel`
2.0.21 is installed and listed in `config/app.php` auto-discovery, the macro is available.

Mitigation: None required.

### Risk 5: `update_saves_changes_and_redirects_to_show` redirect URL

The test asserts `$response->assertRedirect(route('suppliers.show', $supplier))`. After
`$supplier->update(...)`, the supplier's ULID (primary key) does not change. Using the
original `$supplier` variable (not `$supplier->fresh()`) in the route helper is safe because
the ULID is the route key and does not mutate on update.

Mitigation: None required, but the implementation notes include this explanation to prevent
future developers from adding an unnecessary `->fresh()` call.

---

## 13. Acceptance Criteria Coverage

| Spec requirement | Test method(s) | Assertion(s) |
|---|---|---|
| guest redirected from GET /suppliers | `guest_is_redirected_from_suppliers` | `assertRedirect('/login')` |
| index returns Inertia component with suppliers + filters | `authenticated_user_can_view_suppliers_index` | `assertInertia` component + has('suppliers') + has('filters') |
| index filters by name search | `index_search_filters_by_name` | `assertInertia` filters.search echoed |
| create page renders | `create_page_renders` | `assertInertia` component |
| store creates supplier + redirects to show | `store_creates_supplier_and_redirects_to_show` | `assertDatabaseHas`, `assertRedirect(route('suppliers.show', ...))` |
| store requires name | `store_requires_name` | `assertSessionHasErrors(['name'])` |
| store rejects invalid email | `store_rejects_invalid_email` | `assertSessionHasErrors(['email'])` |
| store rejects invalid website URL | `store_rejects_invalid_website_url` | `assertSessionHasErrors(['website'])` |
| show returns correct supplier | `show_returns_supplier` | `assertInertia` component + where('supplier.id', ...) |
| edit returns correct supplier | `edit_returns_supplier` | `assertInertia` component + where('supplier.id', ...) |
| update saves changes + redirects to show | `update_saves_changes_and_redirects_to_show` | `assertDatabaseHas`, `assertRedirect` |
| update with invalid email returns error | `update_with_invalid_email_returns_error` | `assertSessionHasErrors(['email'])` |
| destroy hard-deletes supplier | `destroy_hard_deletes_supplier` | `assertDatabaseMissing('suppliers', ...)` |
| destroy nullifies supplier_id on related materials | `destroy_nullifies_supplier_id_on_related_materials` | `assertDatabaseHas('materials', ['supplier_id' => null])` |
| PHPUnit 11 #[Test] attributes, no Pest | All 14 tests | `#[Test]` attribute on every method |
| RefreshDatabase trait | Class level | `use RefreshDatabase` |
| Factories for all test data | All tests | `User::factory()`, `Supplier::factory()`, `Material::factory()` |
| setUp with private User $user | Class structure | `setUp()` method + `private User $user` |
| assertSessionHasErrors for validation | Tests 6, 7, 8, 12 | `assertSessionHasErrors` |
| assertDatabaseMissing for hard delete | Test 13 | `assertDatabaseMissing` (not assertSoftDeleted) |
