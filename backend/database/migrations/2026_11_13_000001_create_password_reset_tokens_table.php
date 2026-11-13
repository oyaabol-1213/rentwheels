<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Create the table that stores short-lived password-reset verification tokens.
return new class extends Migration
{
    // Add the token table only when it has not already been created.
    public function up(): void
    {
        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    // Remove the token table when this migration is rolled back.
    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
