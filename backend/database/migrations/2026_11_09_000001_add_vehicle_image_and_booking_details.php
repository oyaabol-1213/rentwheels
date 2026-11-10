<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Adds: vehicle photo, and the extra details we now collect when a customer books.
// Every column is nullable so old rows in the database keep working.
return new class extends Migration
{
    public function up(): void
    {
        // Vehicle catalog photo and customer-provided vehicle rental details.
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'image')) {
                $table->string('image', 255)->nullable();
            }
        });

        Schema::table('vehicle_bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicle_bookings', 'phone')) {
                $table->string('phone', 30)->nullable();
            }
            if (! Schema::hasColumn('vehicle_bookings', 'license_number')) {
                $table->string('license_number', 50)->nullable();
            }
            if (! Schema::hasColumn('vehicle_bookings', 'pickup_time')) {
                $table->string('pickup_time', 10)->nullable();
            }
            if (! Schema::hasColumn('vehicle_bookings', 'pickup_location')) {
                $table->string('pickup_location', 200)->nullable();
            }
            if (! Schema::hasColumn('vehicle_bookings', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        // Tour pickup and emergency-contact details collected at reservation time.
        Schema::table('tour_bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('tour_bookings', 'pickup_location')) {
                $table->string('pickup_location', 200)->nullable();
            }
            if (! Schema::hasColumn('tour_bookings', 'pickup_time')) {
                $table->string('pickup_time', 10)->nullable();
            }
            if (! Schema::hasColumn('tour_bookings', 'emergency_contact')) {
                $table->string('emergency_contact', 150)->nullable();
            }
            if (! Schema::hasColumn('tour_bookings', 'emergency_phone')) {
                $table->string('emergency_phone', 30)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (Schema::hasColumn('vehicles', 'image')) {
                $table->dropColumn('image');
            }
        });

        Schema::table('vehicle_bookings', function (Blueprint $table) {
            foreach (['phone', 'license_number', 'pickup_time', 'pickup_location', 'notes'] as $column) {
                if (Schema::hasColumn('vehicle_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('tour_bookings', function (Blueprint $table) {
            foreach (['pickup_location', 'pickup_time', 'emergency_contact', 'emergency_phone'] as $column) {
                if (Schema::hasColumn('tour_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
