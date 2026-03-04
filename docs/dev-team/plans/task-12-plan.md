# Task 12 Implementation Plan: Laravel Scout Configuration

## 1. Approach

Configure Laravel Scout with the database driver for full-text search across `Project`, `Material`, and `Tool` models. The work has three parts:

1. **Install `laravel/scout`** via Composer (it is not currently in `composer.json`).
2. **Publish the Scout config file** and set `SCOUT_DRIVER=database` in `.env`.
3. **Add `toSearchableArray()`** to `Project`, `Material`, and `Tool` — each model already uses the `Laravel\Scout\Searchable` trait (added by Task 04), so only the method definition is missing.

The database Scout driver uses SQL `LIKE` queries against the searchable columns. It does not require any external service (no Meilisearch, Algolia, or Elasticsearch). This is appropriate for the single-user/small-team workshop management tool described in the spec.

The `Searchable` trait must already be applied to these models. Task 04 is responsible for adding it. This task only adds the `toSearchableArray()` method to each model and configures the Scout package.

## 2. Files to Create/Modify

| Action | Path |
|--------|------|
| Modify | `composer.json` — add `laravel/scout` to `require` |
| Create | `config/scout.php` — published via `php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"` |
| Modify | `.env` — add `SCOUT_DRIVER=database` |
| Modify | `app/Models/Project.php` — add `toSearchableArray()` |
| Modify | `app/Models/Material.php` — add `toSearchableArray()` |
| Modify | `app/Models/Tool.php` — add `toSearchableArray()` |

## 3. Key Decisions

### Decision 1: Database driver, not Meilisearch or Algolia

The CLAUDE.md and task manifest both specify `SCOUT_DRIVER=database`. The database driver ships with Scout and requires no external service. It is appropriate for a single-user application with a small dataset. If the application grows to need better search performance, switching to Meilisearch requires only changing the driver in config — no model code changes needed.

### Decision 2: `toSearchableArray()` returns only text-searchable columns

Scout's database driver performs `LIKE '%query%'` against the fields returned by `toSearchableArray()`. Returning only meaningful text columns (not dates, booleans, or numeric IDs) keeps queries fast and results relevant.

Per the task spec:
- **Project:** `id`, `title`, `description`, `client_name`, `notes`
- **Material:** `id`, `name`, `description`, `sku`, `location`
- **Tool:** `id`, `name`, `brand`, `model_number`, `serial_number`, `notes`

The `id` field (ULID) is included to allow searching by exact ULID, which is useful for debugging and admin lookups.

### Decision 3: Use `$this->toArray()` as the base, then filter

The simplest correct implementation uses `array_filter` on the model's array representation:

```php
public function toSearchableArray(): array
{
    return [
        'id'          => $this->id,
        'title'       => $this->title,
        'description' => $this->description,
        'client_name' => $this->client_name,
        'notes'       => $this->notes,
    ];
}
```

Explicitly listing each key (rather than calling `$this->toArray()` and unset-ing unwanted fields) is clearer, safer, and prevents accidental inclusion of sensitive or irrelevant fields when new columns are added to the model.

### Decision 4: No queue for indexing

The task spec does not call for queued indexing. By default, Scout indexes synchronously on model save when not using a queue. Setting `QUEUE_CONNECTION=database` in `.env` (already the project standard) does not automatically queue Scout operations unless `scout.queue` is set to `true` in the config. Leave `scout.queue = false` (the Scout default) so that search index updates happen immediately and the worker queue is not required for search to function.

### Decision 5: `laravel/scout` must be added to `composer.json` require

The current `composer.json` (confirmed by reading the file) does not include `laravel/scout`. It must be added to the `require` section:

```json
"laravel/scout": "^10.0"
```

The implementer must run `composer require laravel/scout` (via Sail: `./vendor/bin/sail composer require laravel/scout`) to download the package and update `composer.lock`.

The Task 04 description says models use `Laravel\Scout\Searchable` — this presupposes Scout is installed. If Task 04 was implemented before Scout was installed, the autoload will reference a class that does not exist. Task 12 resolves this by installing Scout.

### Decision 6: Publish config, do not hardcode

`php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"` creates `config/scout.php` with all Scout options documented. Publishing the config is the correct approach — it allows future developers to modify search behavior without editing vendor code. Do not skip this step and rely on the package defaults alone.

## 4. Verified Dependencies

- **Task 04 (Eloquent Models):** Required. `Project`, `Material`, and `Tool` must exist and must use the `Laravel\Scout\Searchable` trait. Task 12 modifies these model files to add `toSearchableArray()`. If Task 04 has not added the `Searchable` trait, the `toSearchableArray()` method will exist but Scout will not use it.
- **Task 01 (Breeze install):** Indirectly required. The `.env` file must exist (created during `php artisan key:generate` in Task 01 setup). Task 12 appends a line to `.env`.
- **Laravel 12.53.0** (confirmed): `laravel/scout ^10.0` is compatible with Laravel 12. Scout 10+ supports the database driver natively.
- **MySQL 8 via Sail** (confirmed): The database driver uses standard SQL `LIKE` queries. MySQL 8 supports these without special configuration.
- **`laravel/scout` package:** Not currently installed. Must be installed as part of this task via `composer require`.

## 5. Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `Laravel\Scout\Searchable` trait not applied to models (Task 04 incomplete) | Medium | Task 12 implementer must verify the trait is present in each model before adding `toSearchableArray()`. If missing, add the trait as part of this task's model edits. |
| `laravel/scout` version constraint incompatible with Laravel 12 | Low | Scout 10.x is the current stable release and supports Laravel 12. Use `^10.0` as the version constraint. |
| `.env` already has a `SCOUT_DRIVER` line set to a different value | Low | Check for an existing `SCOUT_DRIVER` line before appending. If it exists with a different value, update it rather than adding a duplicate. |
| `config/scout.php` already exists (e.g., from a prior vendor:publish run) | Very low | `vendor:publish` will prompt before overwriting. Run with `--force` only if needed. In practice, the file will not exist since Scout is not currently installed. |
| `toSearchableArray()` returns null values (e.g., `description` is nullable) | Low | Scout handles null values in the searchable array — they are coerced to empty strings or skipped. No special handling required. |
| Scout's database driver not available in the installed Scout version | Very low | The database driver was added in Scout 9.x. Scout 10.x (which we require) includes it. |
| Queued indexing conflicts with `database` queue driver | Low | Leave `scout.queue = false` (default). Even if `QUEUE_CONNECTION=database`, Scout will not queue its operations unless explicitly configured to do so. |
| `Project::search('test')` throws a `scout` driver error in tinker | Low | Ensure `.env` has `SCOUT_DRIVER=database` and `config:clear` has been run. The acceptance criterion requires testing this in tinker after config is cleared. |

## 6. Acceptance Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| `config/scout.php` exists (published via `vendor:publish`) | Published via `php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"` |
| `.env` has `SCOUT_DRIVER=database` | Line added to `.env` |
| `composer.json` includes `laravel/scout` | Added to `require` section; `composer require laravel/scout` run via Sail |
| `Project`, `Material`, `Tool` each implement `toSearchableArray()` returning the correct fields | Method added to each model returning the field arrays specified in the task manifest |
| `Project::search('test')` does not throw a class-not-found or driver error in tinker | Verified by running `php artisan tinker` after `php artisan config:clear` |
| `php artisan test` passes after this change | `toSearchableArray()` is a pure data method with no side effects; existing tests are not affected |

---

## Appendix: Implementation Details

### composer.json change

Add to the `require` object:
```json
"laravel/scout": "^10.0",
```

Run:
```bash
./vendor/bin/sail composer require laravel/scout
```

### Publish config

```bash
./vendor/bin/sail artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```

This creates `config/scout.php`.

### .env change

Append (or update if already present):
```
SCOUT_DRIVER=database
```

### Project.php — toSearchableArray()

```php
/**
 * Get the indexable data array for the model.
 *
 * @return array<string, mixed>
 */
public function toSearchableArray(): array
{
    return [
        'id'          => $this->id,
        'title'       => $this->title,
        'description' => $this->description,
        'client_name' => $this->client_name,
        'notes'       => $this->notes,
    ];
}
```

### Material.php — toSearchableArray()

```php
/**
 * Get the indexable data array for the model.
 *
 * @return array<string, mixed>
 */
public function toSearchableArray(): array
{
    return [
        'id'          => $this->id,
        'name'        => $this->name,
        'description' => $this->description,
        'sku'         => $this->sku,
        'location'    => $this->location,
    ];
}
```

### Tool.php — toSearchableArray()

```php
/**
 * Get the indexable data array for the model.
 *
 * @return array<string, mixed>
 */
public function toSearchableArray(): array
{
    return [
        'id'            => $this->id,
        'name'          => $this->name,
        'brand'         => $this->brand,
        'model_number'  => $this->model_number,
        'serial_number' => $this->serial_number,
        'notes'         => $this->notes,
    ];
}
```

### Verification in tinker

After completing all steps and running `php artisan config:clear`:

```bash
./vendor/bin/sail artisan tinker
```

```php
// Should return a Scout Builder instance, not throw an error:
Project::search('maple');

// Should return a Scout Builder instance:
Material::search('walnut');

// Should return a Scout Builder instance:
Tool::search('dewalt');
```

A Scout Builder instance being returned (without a driver error or class-not-found exception) confirms the configuration is correct. Actual database results depend on whether data exists in the tables, which is seeded by Task 08 (factories) or the DemoDataSeeder.
