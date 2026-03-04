<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tools', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('category_id')->nullable()->constrained('tool_categories')->nullOnDelete();
            $table->string('name', 255);
            $table->string('brand', 100)->nullable();
            $table->string('model_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->date('warranty_expires')->nullable();
            $table->string('location', 255)->nullable();
            $table->string('manual_url', 500)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_usage_hours', 10, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tools');
    }
};
