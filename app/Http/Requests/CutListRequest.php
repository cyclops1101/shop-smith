<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CutListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'boards' => ['required', 'array', 'min:1'],
            'boards.*.label' => ['required', 'string', 'max:100'],
            'boards.*.length' => ['required', 'numeric', 'min:0.1'],
            'boards.*.width' => ['required', 'numeric', 'min:0.1'],
            'boards.*.thickness' => ['required', 'numeric', 'min:0.1'],
            'boards.*.quantity' => ['required', 'integer', 'min:1'],
            'pieces' => ['required', 'array', 'min:1'],
            'pieces.*.label' => ['required', 'string', 'max:100'],
            'pieces.*.length' => ['required', 'numeric', 'min:0.1'],
            'pieces.*.width' => ['required', 'numeric', 'min:0.1'],
            'pieces.*.thickness' => ['required', 'numeric', 'min:0.1'],
            'pieces.*.quantity' => ['required', 'integer', 'min:1'],
            'pieces.*.grain_direction' => ['sometimes', 'boolean'],
        ];
    }
}
