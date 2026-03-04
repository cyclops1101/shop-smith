<?php

namespace Database\Factories;

use App\Enums\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Expense>
 */
class ExpenseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id'   => null,
            'supplier_id'  => null,
            'category'     => fake()->randomElement(ExpenseCategory::cases())->value,
            'description'  => fake()->sentence(4),
            'amount'       => fake()->randomFloat(2, 10, 500),
            'expense_date' => fake()->date(),
            'receipt_path' => null,
        ];
    }

    public function forProject(): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => \App\Models\Project::factory(),
        ]);
    }
}
