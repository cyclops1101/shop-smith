<?php

namespace App\Http\Requests;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::enum(ProjectStatus::class)],
            'priority' => ['sometimes', Rule::enum(ProjectPriority::class)],
            'estimated_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'estimated_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'sell_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'deadline' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_commission' => ['sometimes', 'boolean'],
            'client_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'client_contact' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
