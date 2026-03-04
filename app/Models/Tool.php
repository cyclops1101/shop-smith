<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Tool extends Model
{
    use HasFactory, HasUlids, SoftDeletes, Searchable;

    protected $fillable = [
        'name',
        'brand',
        'model_number',
        'serial_number',
        'category_id',
        'purchase_date',
        'purchase_price',
        'warranty_expires',
        'location',
        'notes',
        'manual_url',
        'total_usage_hours',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date'    => 'date',
            'warranty_expires' => 'date',
        ];
    }

    public function toSearchableArray(): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'brand'        => $this->brand,
            'model_number' => $this->model_number,
            'serial_number' => $this->serial_number,
            'notes'        => $this->notes,
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ToolCategory::class, 'category_id');
    }

    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
