<?php

namespace App\Models;

use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceLog extends Model
{
    use HasFactory, HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'tool_id',
        'schedule_id',
        'maintenance_type',
        'performed_at',
        'cost',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'maintenance_type' => MaintenanceType::class,
            'performed_at'     => 'datetime',
        ];
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class);
    }

    public function maintenanceSchedule(): BelongsTo
    {
        return $this->belongsTo(MaintenanceSchedule::class, 'schedule_id');
    }
}
