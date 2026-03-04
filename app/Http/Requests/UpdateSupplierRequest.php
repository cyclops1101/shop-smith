<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email'        => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone'        => ['sometimes', 'nullable', 'string', 'max:50'],
            'website'      => ['sometimes', 'nullable', 'url', 'max:500'],
            'address'      => ['sometimes', 'nullable', 'string'],
            'notes'        => ['sometimes', 'nullable', 'string'],
        ];
    }
}
