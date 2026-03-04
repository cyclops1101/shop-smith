<?php

namespace Database\Factories;

use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectMaterial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProjectMaterial>
 */
class ProjectMaterialFactory extends Factory
{
    protected $model = ProjectMaterial::class;

    public function definition(): array
    {
        return [
            'project_id'    => Project::factory(),
            'material_id'   => Material::factory(),
            'quantity_used' => fake()->randomFloat(2, 1, 20),
            'cost_at_time'  => null,
            'notes'         => null,
        ];
    }
}
