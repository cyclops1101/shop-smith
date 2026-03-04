<?php

namespace Database\Factories;

use App\Enums\MaintenanceType;
use App\Models\Tool;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MaintenanceSchedule>
 */
class MaintenanceScheduleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tool_id'          => Tool::factory(),
            'maintenance_type' => fake()->randomElement(MaintenanceType::cases())->value,
            'task'             => fake()->sentence(3),
            'interval_days'    => null,
            'interval_hours'   => null,
            'last_performed_at' => null,
            'next_due_at'      => null,
            'notes'            => null,
        ];
    }
}
