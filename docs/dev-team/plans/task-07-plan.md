# Task 07 Plan: Form Request Stubs with Validation Rules

## 1. Approach

Create 15 Form Request classes under `app/Http/Requests/` and one smoke-test file under `tests/Unit/`. Every Form Request extends `Illuminate\Foundation\Http\FormRequest`, implements `authorize(): bool` returning `true` (single-user app, policy enforcement is not needed at this scaffold stage), and implements `rules(): array` with full, schema-accurate validation rules.

Rules use Laravel's `Rule` facade for enum validation (`Rule::enum()`) and foreign-key existence checks (`Rule::exists()`). The goal is a complete rules layer so that future feature implementations can wire these requests directly into controllers with no validation rework.

Also create `tests/Unit/FormRequestTest.php` — a smoke test that instantiates each Form Request class and verifies the `rules()` method returns a non-empty array, confirming the classes are syntactically valid PHP.

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `app/Http/Requests/StoreProjectRequest.php` |
| Create | `app/Http/Requests/UpdateProjectRequest.php` |
| Create | `app/Http/Requests/StoreProjectPhotoRequest.php` |
| Create | `app/Http/Requests/LogTimeRequest.php` |
| Create | `app/Http/Requests/AttachMaterialRequest.php` |
| Create | `app/Http/Requests/AddNoteRequest.php` |
| Create | `app/Http/Requests/StoreMaterialRequest.php` |
| Create | `app/Http/Requests/UpdateMaterialRequest.php` |
| Create | `app/Http/Requests/AdjustStockRequest.php` |
| Create | `app/Http/Requests/StoreToolRequest.php` |
| Create | `app/Http/Requests/UpdateToolRequest.php` |
| Create | `app/Http/Requests/LogMaintenanceRequest.php` |
| Create | `app/Http/Requests/StoreExpenseRequest.php` |
| Create | `app/Http/Requests/StoreRevenueRequest.php` |
| Create | `app/Http/Requests/CutListRequest.php` |
| Create | `tests/Unit/FormRequestTest.php` |

No controller files are modified by this task. The controllers created in Task 06 use `Illuminate\Http\Request` as stubs; swapping to typed Form Requests is done by the feature implementation tasks (Phase 2+).

## 3. Validation Rules per Request

### StoreProjectRequest

```php
use App\Enums\ProjectStatus;
use App\Enums\ProjectPriority;
use Illuminate\Validation\Rule;

public function rules(): array
{
    return [
        'title'           => ['required', 'string', 'max:255'],
        'description'     => ['nullable', 'string'],
        'status'          => ['sometimes', Rule::enum(ProjectStatus::class)],
        'priority'        => ['sometimes', Rule::enum(ProjectPriority::class)],
        'estimated_hours' => ['nullable', 'numeric', 'min:0'],
        'estimated_cost'  => ['nullable', 'numeric', 'min:0'],
        'sell_price'      => ['nullable', 'numeric', 'min:0'],
        'started_at'      => ['nullable', 'date'],
        'completed_at'    => ['nullable', 'date'],
        'deadline'        => ['nullable', 'date'],
        'notes'           => ['nullable', 'string'],
        'is_commission'   => ['boolean'],
        'client_name'     => ['nullable', 'string', 'max:255'],
        'client_contact'  => ['nullable', 'string', 'max:255'],
    ];
}
```

`status` and `priority` use `sometimes` because new projects default to `planned` / `medium` if not supplied. `is_commission` is a boolean and defaults to false.

### UpdateProjectRequest

Same rules as `StoreProjectRequest` but all fields wrapped with `sometimes` to allow partial updates:

```php
public function rules(): array
{
    return [
        'title'           => ['sometimes', 'required', 'string', 'max:255'],
        'description'     => ['sometimes', 'nullable', 'string'],
        'status'          => ['sometimes', Rule::enum(ProjectStatus::class)],
        'priority'        => ['sometimes', Rule::enum(ProjectPriority::class)],
        'estimated_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'estimated_cost'  => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'sell_price'      => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'started_at'      => ['sometimes', 'nullable', 'date'],
        'completed_at'    => ['sometimes', 'nullable', 'date'],
        'deadline'        => ['sometimes', 'nullable', 'date'],
        'notes'           => ['sometimes', 'nullable', 'string'],
        'is_commission'   => ['sometimes', 'boolean'],
        'client_name'     => ['sometimes', 'nullable', 'string', 'max:255'],
        'client_contact'  => ['sometimes', 'nullable', 'string', 'max:255'],
    ];
}
```

### StoreProjectPhotoRequest

```php
public function rules(): array
{
    return [
        'photo'      => ['required', 'file', 'image', 'mimes:jpeg,png,webp', 'max:10240'],
        'caption'    => ['nullable', 'string', 'max:255'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'is_portfolio' => ['boolean'],
    ];
}
```

`max:10240` is 10MB in kilobytes (Laravel's `max` file rule uses KB). `image` rule validates MIME type is an image type; `mimes:jpeg,png,webp` further restricts to specific formats.

### LogTimeRequest

```php
public function rules(): array
{
    return [
        'started_at'       => ['required', 'date'],
        'ended_at'         => ['nullable', 'date', 'after_or_equal:started_at'],
        'description'      => ['nullable', 'string', 'max:255'],
        'duration_minutes' => ['nullable', 'integer', 'min:1'],
    ];
}
```

`duration_minutes` is nullable because when both `started_at` and `ended_at` are provided, the model computes it in the `saving` observer (Task 04). The field is accepted here for cases where a user logs a completed entry with an explicit duration override.

### AttachMaterialRequest

```php
public function rules(): array
{
    return [
        'material_id'   => ['required', 'ulid', Rule::exists('materials', 'id')],
        'quantity_used' => ['required', 'numeric', 'min:0.01'],
        'notes'         => ['nullable', 'string', 'max:255'],
    ];
}
```

`Rule::exists('materials', 'id')` checks the `materials` table's `id` column. Since `id` is a ULID, the `'ulid'` format rule ensures the value is a valid 26-character ULID before the DB query runs, avoiding malformed queries.

### AddNoteRequest

```php
public function rules(): array
{
    return [
        'content' => ['required', 'string'],
    ];
}
```

No max length — project notes support full markdown text.

### StoreMaterialRequest

```php
use App\Enums\MaterialUnit;

public function rules(): array
{
    return [
        'name'                => ['required', 'string', 'max:255'],
        'sku'                 => ['nullable', 'string', 'max:100'],
        'description'         => ['nullable', 'string'],
        'unit'                => ['required', Rule::enum(MaterialUnit::class)],
        'quantity_on_hand'    => ['required', 'numeric', 'min:0'],
        'low_stock_threshold' => ['nullable', 'numeric', 'min:0'],
        'unit_cost'           => ['nullable', 'numeric', 'min:0'],
        'location'            => ['nullable', 'string', 'max:255'],
        'notes'               => ['nullable', 'string'],
        'category_id'         => ['nullable', 'ulid', Rule::exists('material_categories', 'id')],
        'supplier_id'         => ['nullable', 'ulid', Rule::exists('suppliers', 'id')],
    ];
}
```

### UpdateMaterialRequest

Same as `StoreMaterialRequest` with `sometimes` on all fields:

```php
public function rules(): array
{
    return [
        'name'                => ['sometimes', 'required', 'string', 'max:255'],
        'sku'                 => ['sometimes', 'nullable', 'string', 'max:100'],
        'description'         => ['sometimes', 'nullable', 'string'],
        'unit'                => ['sometimes', 'required', Rule::enum(MaterialUnit::class)],
        'quantity_on_hand'    => ['sometimes', 'required', 'numeric', 'min:0'],
        'low_stock_threshold' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'unit_cost'           => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'location'            => ['sometimes', 'nullable', 'string', 'max:255'],
        'notes'               => ['sometimes', 'nullable', 'string'],
        'category_id'         => ['sometimes', 'nullable', 'ulid', Rule::exists('material_categories', 'id')],
        'supplier_id'         => ['sometimes', 'nullable', 'ulid', Rule::exists('suppliers', 'id')],
    ];
}
```

### AdjustStockRequest

```php
public function rules(): array
{
    return [
        'quantity' => ['required', 'numeric'],
        'notes'    => ['nullable', 'string'],
    ];
}
```

`quantity` is `numeric` with no `min` constraint — negative values represent stock removals (usage). The controller must guard against resulting stock going below zero if that is a business rule, but the form request does not enforce it (the controller can check after validation).

### StoreToolRequest

```php
public function rules(): array
{
    return [
        'name'             => ['required', 'string', 'max:255'],
        'brand'            => ['nullable', 'string', 'max:100'],
        'model_number'     => ['nullable', 'string', 'max:100'],
        'serial_number'    => ['nullable', 'string', 'max:100'],
        'purchase_date'    => ['nullable', 'date'],
        'purchase_price'   => ['nullable', 'numeric', 'min:0'],
        'warranty_expires' => ['nullable', 'date'],
        'location'         => ['nullable', 'string', 'max:255'],
        'manual_url'       => ['nullable', 'url', 'max:500'],
        'notes'            => ['nullable', 'string'],
        'category_id'      => ['nullable', 'ulid', Rule::exists('tool_categories', 'id')],
    ];
}
```

`manual_url` uses the `url` rule since the spec column is a link to a PDF manual.

### UpdateToolRequest

Same as `StoreToolRequest` with `sometimes`:

```php
public function rules(): array
{
    return [
        'name'             => ['sometimes', 'required', 'string', 'max:255'],
        'brand'            => ['sometimes', 'nullable', 'string', 'max:100'],
        'model_number'     => ['sometimes', 'nullable', 'string', 'max:100'],
        'serial_number'    => ['sometimes', 'nullable', 'string', 'max:100'],
        'purchase_date'    => ['sometimes', 'nullable', 'date'],
        'purchase_price'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'warranty_expires' => ['sometimes', 'nullable', 'date'],
        'location'         => ['sometimes', 'nullable', 'string', 'max:255'],
        'manual_url'       => ['sometimes', 'nullable', 'url', 'max:500'],
        'notes'            => ['sometimes', 'nullable', 'string'],
        'category_id'      => ['sometimes', 'nullable', 'ulid', Rule::exists('tool_categories', 'id')],
    ];
}
```

### LogMaintenanceRequest

```php
use App\Enums\MaintenanceType;

public function rules(): array
{
    return [
        'maintenance_type' => ['required', Rule::enum(MaintenanceType::class)],
        'description'      => ['required', 'string'],
        'performed_at'     => ['required', 'date'],
        'cost'             => ['nullable', 'numeric', 'min:0'],
        'usage_hours_at'   => ['nullable', 'numeric', 'min:0'],
        'schedule_id'      => ['nullable', 'ulid', Rule::exists('maintenance_schedules', 'id')],
    ];
}
```

`schedule_id` is nullable — maintenance logs can be ad-hoc (not tied to a schedule). `usage_hours_at` records tool hours at the time of maintenance for tracking.

### StoreExpenseRequest

```php
use App\Enums\ExpenseCategory;

public function rules(): array
{
    return [
        'category'     => ['required', Rule::enum(ExpenseCategory::class)],
        'description'  => ['required', 'string', 'max:255'],
        'amount'       => ['required', 'numeric', 'min:0.01'],
        'expense_date' => ['required', 'date'],
        'supplier_id'  => ['nullable', 'ulid', Rule::exists('suppliers', 'id')],
        'project_id'   => ['nullable', 'ulid', Rule::exists('projects', 'id')],
        'receipt_path' => ['nullable', 'string', 'max:500'],
    ];
}
```

`receipt_path` is a string field (file upload path stored externally) — actual file upload validation is separate if implemented.

### StoreRevenueRequest

```php
public function rules(): array
{
    return [
        'description'    => ['required', 'string', 'max:255'],
        'amount'         => ['required', 'numeric', 'min:0.01'],
        'received_date'  => ['required', 'date'],
        'project_id'     => ['nullable', 'ulid', Rule::exists('projects', 'id')],
        'payment_method' => ['nullable', 'string', 'max:50'],
        'client_name'    => ['nullable', 'string', 'max:255'],
    ];
}
```

### CutListRequest

```php
public function rules(): array
{
    return [
        'boards'                   => ['required', 'array', 'min:1'],
        'boards.*.label'           => ['required', 'string', 'max:100'],
        'boards.*.length'          => ['required', 'numeric', 'min:0.1'],
        'boards.*.width'           => ['required', 'numeric', 'min:0.1'],
        'boards.*.thickness'       => ['required', 'numeric', 'min:0.1'],
        'boards.*.quantity'        => ['required', 'integer', 'min:1'],
        'pieces'                   => ['required', 'array', 'min:1'],
        'pieces.*.label'           => ['required', 'string', 'max:100'],
        'pieces.*.length'          => ['required', 'numeric', 'min:0.1'],
        'pieces.*.width'           => ['required', 'numeric', 'min:0.1'],
        'pieces.*.thickness'       => ['required', 'numeric', 'min:0.1'],
        'pieces.*.quantity'        => ['required', 'integer', 'min:1'],
        'pieces.*.grain_direction' => ['boolean'],
    ];
}
```

This request is used by `CutListController@optimize`. Both `boards` and `pieces` are required arrays with nested validation using the `*` wildcard notation. `grain_direction` is a boolean flag indicating whether the piece must be cut with the grain running in a specific direction (affects optimizer rotation logic).

## 4. Key Decisions

### Decision 1: `authorize()` returns `true` for all requests

The spec states this is a single-user tool. Laravel policies (if added in a future phase) can be enforced by overriding `authorize()` in specific requests. For this scaffold phase, `authorize()` universally returns `true`. This is documented in each class.

### Decision 2: `Rule::enum()` over `in:` for enum fields

`Rule::enum(ProjectStatus::class)` is the idiomatic Laravel 10+ approach. It reads the backed values from the PHP Enum class directly, so adding or removing enum cases in the future only requires updating the Enum class — not both the enum and the validation rule. The `in:` rule would require manually listing all values.

### Decision 3: `'ulid'` format rule before `Rule::exists()`

For all FK fields that expect a ULID, the rule array is `['nullable', 'ulid', Rule::exists('table', 'id')]`. The `'ulid'` built-in validation rule (Laravel 10+) validates the format before the database query fires. This prevents expensive DB lookups for clearly invalid input and produces cleaner error messages.

### Decision 4: No `UpdateProjectRequest` uses `unique` slug validation

The `slug` field is auto-generated from `title` in the model's `booted()` hook (Task 04) and is not accepted as a user-submitted field. Therefore, no slug uniqueness rule is needed in either `StoreProjectRequest` or `UpdateProjectRequest`. Controllers must not mass-assign `slug` from request data.

### Decision 5: `CutListRequest` validates the inline payload, not persisted models

The cut list optimizer works on a payload submitted from the frontend (boards + pieces dimensions). It does not require `project_id` for the optimize endpoint itself — the project association is optional and handled by the controller if the user wants to save the result. The request validates only the geometric data needed to run the algorithm.

### Decision 6: Separate Store/Update requests per resource

The task manifest specifies separate `Store*` and `Update*` requests for Project, Material, and Tool. This follows the "thin controllers, explicit validation" principle. The Update requests use `sometimes` on all non-identity fields so partial PATCH-style updates work even when sent via PUT (Laravel does not enforce full-payload requirement on PUT — that is a convention, not an HTTP requirement).

### Decision 7: `FormRequestTest.php` is a Unit test, not Feature test

The smoke test instantiates each Form Request class and calls `rules()` to verify the class is syntactically valid and returns an array. It does not send HTTP requests. Placing it in `tests/Unit/` avoids needing a running database for the test.

```php
// tests/Unit/FormRequestTest.php
it('StoreProjectRequest has rules', function () {
    $request = new \App\Http\Requests\StoreProjectRequest();
    expect($request->rules())->toBeArray()->not->toBeEmpty();
});
// ... repeated for all 15 request classes
```

## 5. Verified Dependencies

| Dependency | Source | Notes |
|------------|--------|-------|
| `App\Enums\ProjectStatus` | Task 02 | Required for `Rule::enum(ProjectStatus::class)` |
| `App\Enums\ProjectPriority` | Task 02 | Required for `Rule::enum()` |
| `App\Enums\MaterialUnit` | Task 02 | Required for `Rule::enum()` |
| `App\Enums\ExpenseCategory` | Task 02 | Required for `Rule::enum()` |
| `App\Enums\MaintenanceType` | Task 02 | Required for `Rule::enum()` |
| `materials` table with `id` column | Task 03 | Required for `Rule::exists('materials', 'id')` |
| `material_categories` table | Task 03 | Required for `Rule::exists('material_categories', 'id')` |
| `tool_categories` table | Task 03 | Required for `Rule::exists('tool_categories', 'id')` |
| `suppliers` table | Task 03 | Required for `Rule::exists('suppliers', 'id')` |
| `projects` table | Task 03 | Required for `Rule::exists('projects', 'id')` |
| `maintenance_schedules` table | Task 03 | Required for `Rule::exists('maintenance_schedules', 'id')` |
| `Illuminate\Validation\Rule` | Laravel framework | Included in `laravel/framework` — no extra package |
| `'ulid'` validation rule | Laravel 10+ | Built-in rule, no extra package |

Note: The `Rule::exists()` calls query the database at validation time. For `FormRequestTest.php` smoke tests that only call `rules()` (not `validated()`), no database connection is needed. If the smoke test also tested `validate()`, it would need `RefreshDatabase`.

## 6. Risks

### Risk 1: `Rule::enum()` not available in the installed Laravel version

`Rule::enum()` was added in Laravel 9. This project uses Laravel 12, so it is available.

**Mitigation:** None needed — confirm the framework version is 12 as stated.

### Risk 2: `'ulid'` built-in validation rule not recognized

`'ulid'` was added as a built-in validation rule in Laravel 10. Laravel 12 includes it.

**Mitigation:** None needed — verify once with a quick tinker call if there is doubt.

### Risk 3: `Rule::exists()` runs against the real database during tests

Feature tests that submit requests through the HTTP layer will trigger `Rule::exists()` queries. Tests must use `RefreshDatabase` so the required parent records exist.

**Mitigation:** Task 09 (feature tests) must create the prerequisite records via factories before testing FK fields. Document this requirement in Task 09.

### Risk 4: `AdjustStockRequest` allows negative quantity to drive stock below zero

The `quantity` field has no `min:0` constraint by design — negative values are intentional (representing usage). However, a controller must guard against resulting stock going below zero if that is a business rule.

**Mitigation:** Document this in the `AdjustStockRequest` class via a docblock or inline comment. The stock guard is a business logic concern for the controller/service layer, not a form request concern.

### Risk 5: `CutListRequest` boards/pieces arrays could be empty

`'boards' => ['required', 'array', 'min:1']` and `'pieces' => ['required', 'array', 'min:1']` prevent empty arrays. If the frontend sends `boards: []`, validation fails with a clear error.

**Mitigation:** Already addressed by `min:1` on both array rules.

## 7. Acceptance Criteria Coverage

| Criterion | How Met |
|-----------|---------|
| All 15 form request files exist under `app/Http/Requests/` | 15 files enumerated in Files to Create |
| Every request has `authorize(): bool` returning `true` | Implemented in each class |
| Every request has `rules(): array` with appropriate rules | Full rules defined per-class above |
| Enum fields use `Rule::enum()` | `ProjectStatus`, `ProjectPriority`, `MaterialUnit`, `ExpenseCategory`, `MaintenanceType` all use `Rule::enum()` |
| FK fields use `Rule::exists()` pointing to the correct table | All FK fields use `Rule::exists('table_name', 'id')` with the `'ulid'` format check preceding |
| `php artisan test --filter FormRequestTest` passes | `tests/Unit/FormRequestTest.php` instantiates each class and calls `rules()` |
