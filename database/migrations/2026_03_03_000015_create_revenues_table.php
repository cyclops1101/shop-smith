<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenues', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('description', 255);
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 50)->nullable();
            $table->date('received_date');
            $table->string('client_name', 255)->nullable();
            $table->timestamps();

            $table->index('project_id');
            $table->index('received_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenues');
    }
};
