<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_photos', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('file_path', 500);
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('caption', 255)->nullable();
            $table->timestamp('taken_at')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_portfolio')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->index('project_id');
            $table->index('is_portfolio');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_photos');
    }
};
