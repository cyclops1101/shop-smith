<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectMaterial extends Pivot
{
    use HasFactory, HasUlids;

    const UPDATED_AT = null;

    protected $table = 'project_materials';

    public $incrementing = false;

    protected $fillable = [
        'project_id',
        'material_id',
        'quantity_used',
        'cost_at_time',
        'notes',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
