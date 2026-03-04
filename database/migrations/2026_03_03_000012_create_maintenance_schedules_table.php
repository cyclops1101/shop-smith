<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('tool_id')->constrained('tools')->cascadeOnDelete();
            $table->string('task', 255);
            $table->string('maintenance_type', 30);
            $table->integer('interval_hours')->nullable();
            $table->integer('interval_days')->nullable();
            $table->timestamp('last_performed_at')->nullable();
            $table->timestamp('next_due_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('tool_id');
            $table->index('next_due_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_schedules');
    }
};
