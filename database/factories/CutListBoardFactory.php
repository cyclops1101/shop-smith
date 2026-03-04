<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CutListBoard>
 */
class CutListBoardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id'  => null,
            'material_id' => null,
            'label'       => fake()->word() . ' Board',
            'length'      => fake()->randomFloat(2, 12, 96),
            'width'       => fake()->randomFloat(2, 2, 24),
            'thickness'   => fake()->randomFloat(2, 0.25, 4),
            'quantity'    => 1,
        ];
    }

    public function forProject(): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => \App\Models\Project::factory(),
        ]);
    }

    public function withMaterial(): static
    {
        return $this->state(fn (array $attributes) => [
            'material_id' => \App\Models\Material::factory(),
        ]);
    }
}
