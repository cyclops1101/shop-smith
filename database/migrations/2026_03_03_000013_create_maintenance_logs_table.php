<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('tool_id')->constrained('tools')->cascadeOnDelete();
            $table->foreignUlid('schedule_id')->nullable()->constrained('maintenance_schedules')->nullOnDelete();
            $table->string('maintenance_type', 30);
            $table->text('description');
            $table->decimal('cost', 10, 2)->nullable();
            $table->timestamp('performed_at');
            $table->decimal('usage_hours_at', 10, 2)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('tool_id');
            $table->index('performed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
    }
};
