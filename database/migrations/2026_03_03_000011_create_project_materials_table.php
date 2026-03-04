<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_materials', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUlid('material_id')->constrained('materials')->cascadeOnDelete();
            $table->decimal('quantity_used', 10, 2);
            $table->decimal('cost_at_time', 10, 2)->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->unique(['project_id', 'material_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_materials');
    }
};
