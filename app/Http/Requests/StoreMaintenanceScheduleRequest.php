<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maintenance_type' => ['required', Rule::enum(MaintenanceType::class)],
            'task'             => ['required', 'string', 'max:255'],
            'interval_days'    => ['nullable', 'integer', 'min:1'],
            'interval_hours'   => ['nullable', 'integer', 'min:1'],
            'notes'            => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (empty($this->interval_days) && empty($this->interval_hours)) {
                $v->errors()->add('interval_days', 'At least one interval (days or hours) is required.');
            }
        });
    }
}
