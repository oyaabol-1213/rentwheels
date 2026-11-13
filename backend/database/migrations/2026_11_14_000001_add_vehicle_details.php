<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Add optional comma-separated seat and specification details to vehicle records.
return new class extends Migration
{
    // Preserve existing vehicle rows by making the new details field nullable.
    public function up(): void
    {
        if (! Schema::hasColumn('vehicles', 'details')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->text('details')->nullable();
            });
        }
    }

    // Remove the catalog details field when rolling back this migration.
    public function down(): void
    {
        if (Schema::hasColumn('vehicles', 'details')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->dropColumn('details');
            });
        }
    }
};
