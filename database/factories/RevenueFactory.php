<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Revenue>
 */
class RevenueFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id'     => null,
            'description'    => fake()->sentence(4),
            'amount'         => fake()->randomFloat(2, 50, 5000),
            'client_name'    => null,
            'payment_method' => null,
            'received_date'  => fake()->date(),
        ];
    }

    public function forProject(): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => \App\Models\Project::factory(),
        ]);
    }
}
