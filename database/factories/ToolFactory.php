<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tool>
 */
class ToolFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id'     => null,
            'name'            => fake()->randomElement([
                'DeWalt DW735 Planer',
                'Bosch Table Saw',
                'Festool Track Saw',
                'Powermatic 8" Jointer',
                'Jet 14" Bandsaw',
                'Porter-Cable Router',
                'Makita Random Orbital Sander',
                'SawStop Cabinet Saw',
                'Laguna 18" Bandsaw',
                'Grizzly 6" Jointer',
            ]),
            'brand'           => fake()->optional()->randomElement(['DeWalt', 'Bosch', 'Festool', 'Makita', 'Milwaukee', 'Powermatic', 'Jet', 'Grizzly']),
            'model_number'    => null,
            'serial_number'   => null,
            'purchase_date'   => null,
            'purchase_price'  => null,
            'warranty_expires' => null,
            'location'        => null,
            'notes'           => null,
            'total_usage_hours' => 0,
        ];
    }

    public function withCategory(): static
    {
        return $this->state(fn (array $attributes) => [
            'category_id' => \App\Models\ToolCategory::factory(),
        ]);
    }
}
