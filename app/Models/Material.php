<?php

namespace App\Models;

use App\Enums\MaterialUnit;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Material extends Model
{
    use HasFactory, HasUlids, SoftDeletes, Searchable;

    protected $fillable = [
        'name',
        'description',
        'sku',
        'category_id',
        'supplier_id',
        'unit',
        'quantity_on_hand',
        'low_stock_threshold',
        'unit_cost',
        'location',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'unit' => MaterialUnit::class,
        ];
    }

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

    public function category(): BelongsTo
    {
        return $this->belongsTo(MaterialCategory::class, 'category_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_materials')
            ->using(ProjectMaterial::class)
            ->withPivot(['quantity_used', 'cost_at_time', 'notes']);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereNotNull('low_stock_threshold')
            ->whereColumn('quantity_on_hand', '<=', 'low_stock_threshold');
    }

    public function isLowStock(): bool
    {
        return $this->low_stock_threshold !== null
            && $this->quantity_on_hand <= $this->low_stock_threshold;
    }

    public function adjustQuantity(float $delta): void
    {
        $this->quantity_on_hand = max(0, $this->quantity_on_hand + $delta);
        $this->save();
    }
}
