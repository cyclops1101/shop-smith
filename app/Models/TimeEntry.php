<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    use HasFactory, HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'started_at',
        'ended_at',
        'duration_minutes',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'started_at'       => 'datetime',
            'ended_at'         => 'datetime',
            'duration_minutes' => 'integer',
        ];
    }

    public function scopeRunning(Builder $query): void
    {
        $query->whereNull('ended_at');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
