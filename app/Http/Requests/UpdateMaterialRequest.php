<?php

namespace App\Http\Requests;

use App\Enums\MaterialUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category_id' => ['sometimes', 'nullable', 'ulid', Rule::exists('material_categories', 'id')],
            'sku' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'unit' => ['sometimes', 'required', Rule::enum(MaterialUnit::class)],
            'quantity_on_hand' => ['sometimes', 'required', 'numeric', 'min:0'],
            'low_stock_threshold' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'supplier_id' => ['sometimes', 'nullable', 'ulid', Rule::exists('suppliers', 'id')],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
