<?php

namespace Database\Factories;

use App\Enums\MaterialUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Material>
 */
class MaterialFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id'      => null,
            'supplier_id'      => null,
            'name'             => fake()->randomElement([
                '3/4 Baltic Birch Plywood',
                'Red Oak Board',
                'Walnut Lumber',
                'Hard Maple Board',
                'Cherry Lumber',
                'White Oak Board',
                'Pine 2x4',
                'Poplar Board',
                'Teak Lumber',
                'Ash Board',
            ]),
            'description'      => fake()->optional()->sentence(),
            'sku'              => fake()->optional()->bothify('SKU-####-??'),
            'unit'             => fake()->randomElement(MaterialUnit::cases())->value,
            'quantity_on_hand' => fake()->randomFloat(2, 0, 100),
            'low_stock_threshold' => null,
            'unit_cost'           => null,
            'location'         => null,
            'notes'            => null,
        ];
    }

    public function withCategory(): static
    {
        return $this->state(fn (array $attributes) => [
            'category_id' => \App\Models\MaterialCategory::factory(),
        ]);
    }

    public function withSupplier(): static
    {
        return $this->state(fn (array $attributes) => [
            'supplier_id' => \App\Models\Supplier::factory(),
        ]);
    }
}
