# Phase 3 Plan Review

## Overall Verdict: NEEDS_REVISION

---

## Cross-Task Findings

### CROSS-01: Filter parameter naming inconsistency between TASK-01 plan and TASK-04 / task manifest [CRITICAL]

The task manifest (lines 62-73) specifies filter keys as `category` and `supplier`:

```php
$filters = $request->only(['search', 'category', 'supplier']);
$query->when($filters['category'] ?? null, fn($q, $v) => $q->where('category_id', $v));
$query->when($filters['supplier'] ?? null, fn($q, $v) => $q->where('supplier_id', $v));
```

However, TASK-01's plan (Section 6.1) changes these to `category_id` and `supplier_id`:

```php
$filters = $request->only(['search', 'category_id', 'supplier_id']);
```

Meanwhile, TASK-04's plan (Section 4.3 FilterBar) uses `category` and `supplier` as the filter keys in the frontend, matching the task manifest:

```jsx
value={filters.category ?? ''}
value={filters.supplier ?? ''}
```

And TASK-08's tests (Tests 3-4) use both conventions inconsistently -- Test 3 filters with `?category=` and Test 4 with `?supplier=`, matching the manifest, but they will fail against TASK-01's implementation which reads `category_id` and `supplier_id`.

**Resolution required:** All plans must agree on whether the filter query parameter names are `category`/`supplier` (as in the manifest) or `category_id`/`supplier_id` (as in TASK-01 plan). The manifest convention (`category`/`supplier`) is preferable because filter params should be user-facing URL params, not database column names. TASK-01 plan must be corrected.

### CROSS-02: Categories/suppliers prop shape inconsistency between backend and frontend [CRITICAL]

The TASK-01 controller passes categories and suppliers as raw Eloquent collections:

```php
'categories' => MaterialCategory::orderBy('sort_order')->get(['id', 'name']),
'suppliers'  => Supplier::orderBy('name')->get(['id', 'name']),
```

This produces `[{ id, name }]` shaped arrays. But TASK-05's plan (Section 3, Data Contract) states the frontend expects:

```js
categories: [ { value: '<ulid>', label: 'Hardwoods' }, ... ],
suppliers:  [ { value: '<ulid>', label: 'Acme Lumber' }, ... ],
```

This is incorrect -- the data contract in TASK-05 does NOT match what the controller actually sends. The controller sends `{ id, name }` (confirmed in the task manifest), and the frontend must map these to `{ value, label }` internally. TASK-04 correctly handles this in FilterBar by mapping `categories` to `{ value: item.id, label: item.name }`. However, TASK-05's data contract documentation is misleading because it implies the backend pre-maps these to `{ value, label }`, when in fact only the `units` prop is pre-mapped by the controller.

**Resolution required:** TASK-05 plan should clarify that `categories` and `suppliers` arrive as `[{ id, name }]` and the component must map them internally. This is acknowledged in the task manifest but contradicted by TASK-05's data contract section.

### CROSS-03: `quantity_on_hand` step value inconsistency between TASK-05 and TASK-06 [WARNING]

TASK-05 (Section 4, Stock) specifies `quantity_on_hand` with `step="1"` for the create/edit forms. The task manifest (Section TASK-05) specifies `step=0.01`. TASK-06 specifies the stock adjustment quantity input with `step="0.01"`.

The backend `StoreMaterialRequest` validates `quantity_on_hand` as `['required', 'numeric', 'min:0']` with no precision constraints, so any numeric value is valid. However, using `step="1"` in the create/edit forms means browsers will warn users trying to enter fractional quantities like `10.5` board feet, which is a common real-world scenario for a woodworker.

**Resolution required:** TASK-05 plan should use `step="0.01"` as specified in the task manifest, not `step="1"`.

### CROSS-04: TASK-09 scope creep -- includes TASK-03 implementation [CRITICAL]

TASK-09 is defined as a test-only task (Group 3, depends on TASK-03). However, the TASK-09 plan (Sections 3-6) includes the full implementation of `SupplierController`, `StoreSupplierRequest`, `UpdateSupplierRequest`, and the route registration -- all of which are exclusively owned by TASK-03 per the file ownership map.

The rationale given in TASK-09's plan is that the tests need the controller to exist. While this is true at runtime, the task manifest explicitly separates these concerns: TASK-03 creates the backend, TASK-09 creates the tests. If TASK-09 also creates the backend files, it either (a) conflicts with TASK-03 which also creates those exact files, or (b) makes TASK-03 redundant.

**Resolution required:** TASK-09 plan must remove the controller, form request, and route implementations from its scope. These belong to TASK-03. TASK-09 should only create `tests/Feature/SupplierControllerTest.php` and document that TASK-03 must be completed first.

### CROSS-05: TASK-09 controller implementation differs from TASK-03's [WARNING]

Compounding CROSS-04, the controller implementation in TASK-09's plan (Section 4) differs from TASK-03's plan in the `index()` search logic:

**TASK-03 plan (correct per manifest):**
```php
$query->where(function ($q) use ($search) {
    $q->where('name', 'like', "%{$search}%")
      ->orWhere('contact_name', 'like', "%{$search}%")
      ->orWhere('email', 'like', "%{$search}%");
});
```

**TASK-09 plan (simplified):**
```php
$query->where('name', 'like', '%' . $search . '%');
```

TASK-09 searches only by `name`, while the task manifest requires search across `name`, `contact_name`, and `email`. This would cause the search test to produce unexpected results if TASK-09's controller were used instead of TASK-03's.

**Resolution required:** Remove the controller from TASK-09 entirely (see CROSS-04). If kept for reference, it must match TASK-03.

### CROSS-06: TASK-09 `UpdateSupplierRequest` missing `sometimes` on non-name fields [WARNING]

TASK-03's plan correctly adds `'sometimes'` to all fields in `UpdateSupplierRequest`. TASK-09's plan (Section 5) only adds `'sometimes'` to the `name` field. The other fields (`contact_name`, `phone`, `email`, `website`, `address`, `notes`) lack the `'sometimes'` prefix. Since these are nullable anyway, this is not a functional bug for most cases, but it diverges from the established convention and from TASK-03's plan.

**Resolution required:** Remove from TASK-09 per CROSS-04, or correct to match TASK-03.

### CROSS-07: TASK-09 `show()` controller missing `loadCount('materials')` [WARNING]

TASK-09's controller show method does not call `$supplier->loadCount('materials')`, which TASK-03's plan correctly includes. TASK-07's frontend plan depends on `supplier.materials_count` being present. If TASK-09's controller version were deployed, the supplier show page would display "undefined materials" in the callout.

**Resolution required:** Remove from TASK-09 per CROSS-04, or add `loadCount`.

### CROSS-08: `destroy` flash message text inconsistency [INFO]

TASK-01 plan's destroy method uses `'Material deleted successfully.'` while the task manifest uses `'Material deleted.'`. TASK-03 plan uses `'Supplier deleted successfully.'` matching its manifest spec of `'Supplier deleted.'` is also slightly different. Minor, but implementors should follow the manifest exactly.

---

## Per-Task Review

### TASK-01: NEEDS_REVISION

- [CRITICAL] **Filter parameter keys diverge from manifest.** The plan uses `category_id` / `supplier_id` as filter parameter names (Section 6.1: `$request->only(['search', 'category_id', 'supplier_id'])`), but the task manifest specifies `category` / `supplier`. This breaks the frontend data contract in TASK-04, which sends `?category=XXX` and `?supplier=XXX`. See CROSS-01 for details.

- [WARNING] **Private helper methods are an undocumented addition.** The plan introduces three private methods (`unitOptions()`, `categoryOptions()`, `supplierOptions()`) not mentioned in the task manifest. While these are a reasonable DRY improvement and don't change behavior, the implementor should be aware they are a plan-level addition, not a manifest requirement. No objection to keeping them, but the implementor should not treat them as mandatory.

- [INFO] **Destroy flash message differs from manifest.** Plan: `'Material deleted successfully.'`. Manifest: `'Material deleted.'`. Minor text difference.

- [INFO] **AdjustStockRequest import is unnecessary for TASK-01.** The plan adds `use App\Http\Requests\AdjustStockRequest` to the import block. While not harmful (TASK-02 will need it), TASK-01's scope does not include the `adjustStock` method. The current stub uses plain `Request`. The import is forward-compatible but outside this task's scope.

### TASK-02: APPROVED

- [INFO] **Plan is well-structured and matches manifest exactly.** The `scopeLowStock`, `isLowStock`, and `adjustQuantity` methods match the manifest spec character for character. The `adjustStock` controller method implementation matches. The `AdjustStockRequest` type-hint swap is correctly identified.

- [INFO] **Risk analysis is thorough.** The floating-point precision and race condition risks are correctly identified and appropriately dismissed for a single-user tool.

- [INFO] **Note about TASK-01 import interaction.** The plan notes that TASK-01 may or may not have already added the `AdjustStockRequest` import. If both tasks run independently, TASK-02 should check whether the import already exists before adding it. The plan handles this correctly by noting both tasks touch the import block.

### TASK-03: APPROVED

- [INFO] **Clean implementation matching manifest spec.** All 7 controller methods, both form requests, and route registration match the task manifest exactly.

- [INFO] **Correctly identifies hard-delete requirement.** The plan explicitly notes no `SoftDeletes` trait, no `deleted_at` column, and uses `$supplier->delete()` for a permanent delete. This aligns with CLAUDE.md governance.

- [INFO] **Search implementation correctly uses nested `where()` closure.** The `orWhere` calls are properly wrapped to prevent SQL logic leaks.

- [INFO] **`loadCount('materials')` correctly used in `show()`.** This provides the `materials_count` attribute the frontend (TASK-07) depends on.

### TASK-04: NEEDS_REVISION

- [CRITICAL] **Filter keys must match backend.** Plan uses `filters.category` and `filters.supplier` (matching the manifest). However, if TASK-01 implements with `category_id`/`supplier_id` (as its plan states), the frontend filters will never activate. The filters send `?category=XXX` but the controller reads `category_id`. One side must change. See CROSS-01.

- [WARNING] **Low Stock column interpretation ambiguity.** The plan merges the "Low Stock" badge into the "In Stock" column and repurposes column 6 as "Low Stock At" (showing the threshold value). The task manifest defines 8 columns with "Low Stock" as a separate column showing a red Badge or nothing. The plan acknowledges this discrepancy in Risk section but chooses a different layout. The manifest should be followed: column 6 is "Low Stock" (red Badge when applicable, empty otherwise), not "Low Stock At" (threshold value).

- [WARNING] **`formatCost` uses string concatenation instead of `Intl.NumberFormat`.** The task manifest specifies `Intl.NumberFormat` for unit cost display. The plan uses `'$' + Number(value).toFixed(2)` which does not handle locale-specific formatting or thousands separators. While acceptable for a small-scale tool, it contradicts the manifest specification.

- [INFO] **Name link styling uses amber-700 instead of manifest's "amber text".** The manifest says "Link to `/materials/{id}` in amber text." Projects/Index uses `text-amber-700 hover:text-amber-900`. The plan should match this existing pattern, which it does implicitly but doesn't state explicitly.

### TASK-05: NEEDS_REVISION

- [CRITICAL] **Data contract misrepresents categories/suppliers shape.** Section 3 states categories and suppliers arrive as `[{ value, label }]`. In reality, the controller (TASK-01) sends `[{ id, name }]`. The component must map these internally. See CROSS-02.

- [WARNING] **`quantity_on_hand` step value is `1` instead of manifest's `0.01`.** Section 4 specifies `step="1"` for `quantity_on_hand`. The task manifest specifies `step=0.01`. A woodworker measuring board feet needs fractional quantities. See CROSS-03.

- [WARNING] **`unit` field defaults to `'piece'` in Create form.** The plan sets `unit: 'piece'` as the default. The task manifest sets `unit: ''` (empty string). Using `'piece'` as default is a UX improvement but deviates from the manifest and means the user could accidentally submit with the wrong unit if they forget to change it. The manifest's approach of requiring explicit selection is safer.

- [WARNING] **`sku` placeholder differs.** Plan: `"e.g. WO-4x4"`. Manifest: `"e.g. SKU-0001-AB"`. Minor but the manifest should be followed.

- [INFO] **`low_stock_threshold` helper text differs slightly.** Plan: `"Alert when stock falls below this level."` Manifest: `"Alert when stock falls at or below this amount"`. The "at or below" wording is semantically important because the scope uses `<=`, not `<`.

### TASK-06: APPROVED

- [INFO] **Solid implementation plan that matches manifest.** The three-section card layout, stock adjustment form, project usage table with footer total, and flash message handling all align with the task manifest.

- [INFO] **Correctly uses `color="#dc2626"` for the Badge.** The Badge component supports both `variant` and `color` props. TASK-04 plans to use `variant="destructive"` (which maps to the same red styling via CSS classes), while TASK-06 uses `color="#dc2626"` (inline style). Both work. The task manifest says "red Badge" without specifying which approach. Either is acceptable -- the existing codebase (Projects/Show) uses the `color` prop approach for dynamic Badge colors.

- [INFO] **Correctly handles `parseFloat` for decimal comparison.** Risk 3 identifies that `quantity_on_hand` may arrive as a string from MySQL decimal serialization, and proposes `parseFloat()` for the low-stock comparison. This is a good defensive practice.

- [INFO] **Project links correctly use `project.slug` (not `project.id`).** Projects use slug-based route binding per CLAUDE.md. The plan correctly uses `/projects/${project.slug}` for links in the project usage table.

### TASK-07: APPROVED

- [INFO] **Comprehensive plan for all four pages.** The plan covers Index (with search + pagination), Create/Edit (with form fields and validation error display), and Show (with flash messages, detail card, and materials count callout).

- [INFO] **Correctly identifies ULID route binding for suppliers.** All `route()` calls use `supplier.id` (the ULID), not a slug. This matches the Supplier model's `HasUlids` trait.

- [INFO] **Hard delete correctly identified.** The Show page's delete handler uses `router.delete` and the plan explicitly notes this is a hard delete per CLAUDE.md.

- [INFO] **Email and website rendering in Show page follows spec.** Email as `mailto:` link, website as `href` with `target="_blank"`. Index page correctly shows these as plain text.

- [INFO] **Materials count fallback.** The plan includes `supplier.materials_count ?? 0` as a defensive guard.

### TASK-08: APPROVED

- [WARNING] **Filter tests use `?category=` and `?supplier=` (matching manifest) but TASK-01 plan reads `category_id`/`supplier_id`.** Tests 3 and 4 will fail if TASK-01 is implemented as its plan states (with `category_id`/`supplier_id` keys). If TASK-01 is corrected per CROSS-01, the tests are correct. See CROSS-01.

- [INFO] **20-test suite covers all controller actions comprehensively.** Auth, index (with filters and search), create, store (with validation), show, edit, update (with validation), destroy (soft delete), adjust stock (increment, decrement, floor at zero, validation), and low stock scope are all covered.

- [INFO] **Test patterns match `ProjectControllerTest` conventions.** `#[Test]` attributes, `RefreshDatabase`, `setUp()` with shared `$this->user`, `assertInertia`, `assertSessionHasErrors`, `assertSoftDeleted` -- all correct.

- [INFO] **Low stock scope test correctly exercises model directly without HTTP.** Three materials cover all three cases: below threshold, above threshold, null threshold.

- [INFO] **Adjust stock tests use explicit `unit => 'piece'` factory override.** This prevents random unit selection from causing flaky tests.

### TASK-09: NEEDS_REVISION

- [CRITICAL] **Scope creep: includes TASK-03 implementation.** The plan creates `SupplierController`, `StoreSupplierRequest`, `UpdateSupplierRequest`, and modifies `routes/web.php` -- all exclusively owned by TASK-03. This violates the file ownership map and creates merge conflicts. See CROSS-04.

- [WARNING] **Controller search logic differs from TASK-03.** Searches only `name`, not `name + contact_name + email`. See CROSS-05.

- [WARNING] **`UpdateSupplierRequest` missing `sometimes` on non-name fields.** See CROSS-06.

- [WARNING] **`show()` controller missing `loadCount('materials')`.** See CROSS-07.

- [INFO] **Test suite itself is well-structured.** The 14 tests cover all resource actions, validation, hard delete with `assertDatabaseMissing`, and the FK cascade nullification test. The test code quality is good.

- [INFO] **FK cascade nullification test (Test 14) is excellent.** Tests a database-level concern that is easy to miss: verifying that deleting a supplier sets `supplier_id = null` on related materials via `nullOnDelete()`.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 (across 4 tasks + cross-task) |
| WARNING  | 10 |
| INFO     | 22 |

### Critical Issues Requiring Resolution

1. **Filter parameter naming (CROSS-01):** TASK-01 plan must use `category`/`supplier` (not `category_id`/`supplier_id`) to match the manifest and frontend. Affects TASK-01, TASK-04, TASK-08.

2. **TASK-05 data contract misrepresentation (CROSS-02):** Categories and suppliers arrive as `[{ id, name }]`, not `[{ value, label }]`. The plan must clarify this.

3. **TASK-09 scope creep (CROSS-04):** TASK-09 must not implement the controller, form requests, or routes. These belong exclusively to TASK-03.

### Tasks Ready to Execute (After Fixes)

- **TASK-02:** Approved as-is. No changes needed.
- **TASK-03:** Approved as-is. No changes needed.
- **TASK-06:** Approved as-is. Minor stylistic variance from TASK-04 on Badge approach but both are valid.
- **TASK-07:** Approved as-is. Depends on TASK-03 backend.

### Tasks Needing Revision Before Execution

- **TASK-01:** Fix filter parameter names from `category_id`/`supplier_id` to `category`/`supplier`.
- **TASK-04:** Fix Low Stock column to be a separate column per manifest; use `Intl.NumberFormat` for cost. Verify filter key alignment after TASK-01 is fixed.
- **TASK-05:** Fix data contract documentation; change `step` to `0.01` for `quantity_on_hand`; reconsider `unit` default; fix `sku` placeholder and `low_stock_threshold` helper text.
- **TASK-08:** No code changes needed IF TASK-01 is fixed. Tests are correct against the manifest spec.
- **TASK-09:** Remove all backend implementation (controller, form requests, routes). Keep only the test file creation. Document dependency on TASK-03 completion.
