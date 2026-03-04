<?php

namespace Database\Factories;

use App\Enums\MaintenanceType;
use App\Models\Tool;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MaintenanceLog>
 */
class MaintenanceLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tool_id'          => Tool::factory(),
            'schedule_id'      => null,
            'maintenance_type' => fake()->randomElement(MaintenanceType::cases())->value,
            'description'      => fake()->sentence(),
            'cost'             => null,
            'performed_at'     => fake()->dateTimeBetween('-1 year'),
        ];
    }
}
