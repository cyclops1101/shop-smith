<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LogMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maintenance_type' => ['required', Rule::enum(MaintenanceType::class)],
            'description' => ['required', 'string'],
            'performed_at' => ['required', 'date'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'schedule_id' => ['nullable', 'ulid', Rule::exists('maintenance_schedules', 'id')],
            'usage_hours_at' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
