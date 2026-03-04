<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceSchedule extends Model
{
    use HasFactory, HasUlids;

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
}
