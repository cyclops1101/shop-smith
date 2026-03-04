<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('materials', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('category_id')->nullable()->constrained('material_categories')->nullOnDelete();
            $table->string('name', 255);
            $table->string('sku', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('unit', 30);
            $table->decimal('quantity_on_hand', 10, 2)->default(0);
            $table->decimal('low_stock_threshold', 10, 2)->nullable();
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->foreignUlid('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('location', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_id');
            $table->index('supplier_id');
            $table->index('quantity_on_hand');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
