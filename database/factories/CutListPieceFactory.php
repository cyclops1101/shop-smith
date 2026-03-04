<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CutListPiece>
 */
class CutListPieceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id'       => Project::factory(),
            'label'            => fake()->word() . ' Piece',
            'length'           => fake()->randomFloat(2, 4, 96),
            'width'            => fake()->randomFloat(2, 1, 24),
            'thickness'        => fake()->randomFloat(2, 0.25, 4),
            'quantity'         => 1,
            'grain_direction'  => false,
        ];
    }
}
