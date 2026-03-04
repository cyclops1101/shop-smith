<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Supplier>
 */
class SupplierFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'         => fake()->company(),
            'contact_name' => null,
            'phone'        => null,
            'email'        => null,
            'website'      => null,
            'address'      => null,
            'notes'        => null,
        ];
    }
}
