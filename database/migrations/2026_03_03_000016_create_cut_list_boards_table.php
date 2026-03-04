<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cut_list_boards', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignUlid('material_id')->nullable()->constrained('materials')->nullOnDelete();
            $table->string('label', 100);
            $table->decimal('length', 8, 2);
            $table->decimal('width', 8, 2);
            $table->decimal('thickness', 6, 2);
            $table->integer('quantity')->default(1);
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cut_list_boards');
    }
};
