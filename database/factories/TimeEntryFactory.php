<?php

namespace Database\Factories;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TimeEntry>
 */
class TimeEntryFactory extends Factory
{
    public function definition(): array
    {
        $startedAt = fake()->dateTimeBetween('-30 days');
        $endedAt   = Carbon::parse($startedAt)->addMinutes(fake()->numberBetween(15, 240));

        return [
            'project_id'       => Project::factory(),
            'description'      => fake()->optional()->sentence(),
            'started_at'       => $startedAt,
            'ended_at'         => $endedAt,
            'duration_minutes' => Carbon::parse($startedAt)->diffInMinutes($endedAt),
        ];
    }

    public function running(): static
    {
        return $this->state(fn (array $attributes) => [
            'ended_at'         => null,
            'duration_minutes' => null,
        ]);
    }
}
