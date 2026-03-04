<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tag>
 */
class TagFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'  => fake()->unique()->word(),
            'color' => sprintf('#%06x', fake()->numberBetween(0, 0xFFFFFF)),
        ];
    }
}
