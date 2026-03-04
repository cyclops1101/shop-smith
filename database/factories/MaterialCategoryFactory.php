<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MaterialCategory>
 */
class MaterialCategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Hardwood', 'Softwood', 'Plywood', 'Hardware', 'Finish', 'Adhesive']),
        ];
    }
}
