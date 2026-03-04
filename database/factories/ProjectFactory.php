<?php

namespace Database\Factories;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title'           => fake()->sentence(3),
            'description'     => fake()->optional()->paragraph(),
            'status'          => fake()->randomElement(ProjectStatus::cases())->value,
            'priority'        => fake()->randomElement(ProjectPriority::cases())->value,
            'estimated_hours'  => null,
            'estimated_cost'   => null,
            'actual_cost'      => null,
            'sell_price'       => null,
            'is_commission'    => false,
            'client_name'      => null,
            'client_contact'   => null,
            'notes'           => null,
            'started_at'      => null,
            'completed_at'    => null,
            'deadline'        => null,
        ];
    }
}
