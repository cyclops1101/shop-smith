<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProjectPhoto>
 */
class ProjectPhotoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id'        => Project::factory(),
            'file_path'         => 'photos/' . fake()->uuid() . '.jpg',
            'thumbnail_path'    => null,
            'caption'           => fake()->optional()->sentence(),
            'sort_order'        => 0,
            'is_portfolio'      => false,
            'taken_at'          => null,
        ];
    }
}
