<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CutListPiece extends Model
{
    use HasFactory, HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'label',
        'thickness',
        'width',
        'length',
        'quantity',
        'grain_direction',
    ];

    protected function casts(): array
    {
        return [
            'quantity'        => 'integer',
            'grain_direction' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
