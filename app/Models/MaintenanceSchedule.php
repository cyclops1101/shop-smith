<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceSchedule extends Model
{
    use HasFactory, HasUlids;

    public const int DUE_SOON_DAYS = 7;

    protected $fillable = [
        'tool_id',
        'maintenance_type',
        'task',
        'interval_days',
        'interval_hours',
        'last_performed_at',
        'next_due_at',
        'notes',
    ];

    protected $appends = ['is_overdue', 'is_due_soon'];

    protected function casts(): array
    {
        return [
            'maintenance_type'  => MaintenanceType::class,
            'last_performed_at' => 'datetime',
            'next_due_at'       => 'datetime',
        ];
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class, 'schedule_id');
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->whereNotNull('next_due_at')
            ->where('next_due_at', '<', now());
    }

    public function scopeDueSoon(Builder $query): Builder
    {
        return $query->whereNotNull('next_due_at')
            ->where('next_due_at', '>=', now())
            ->where('next_due_at', '<=', now()->addDays(self::DUE_SOON_DAYS));
    }

    public function isOverdue(): bool
    {
        return $this->next_due_at !== null && $this->next_due_at->isPast();
    }

    public function isDueSoon(): bool
    {
        return $this->next_due_at !== null
            && !$this->next_due_at->isPast()
            && $this->next_due_at->lte(now()->addDays(self::DUE_SOON_DAYS));
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->isOverdue();
    }

    public function getIsDueSoonAttribute(): bool
    {
        return $this->isDueSoon();
    }
}
