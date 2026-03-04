<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectPhoto extends Model
{
    use HasFactory, HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'file_path',
        'thumbnail_path',
        'caption',
        'taken_at',
        'is_portfolio',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'taken_at'     => 'datetime',
            'is_portfolio' => 'boolean',
            'sort_order'   => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
