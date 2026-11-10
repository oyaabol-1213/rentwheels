<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add status, vehicle linkage, and add-on totals used by booking workflows.
        Schema::table('vehicle_bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicle_bookings', 'vehicle_id')) {
                $table->integer('vehicle_id')->nullable();
            }
            if (! Schema::hasColumn('vehicle_bookings', 'status')) {
                $table->string('status', 30)->default('Pending');
            }
            if (! Schema::hasColumn('vehicle_bookings', 'add_ons')) {
                $table->text('add_ons')->nullable();
            }
            if (! Schema::hasColumn('vehicle_bookings', 'addon_total')) {
                $table->string('addon_total', 50)->default('Php 0.00');
            }
        });

        Schema::table('tour_bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('tour_bookings', 'status')) {
                $table->string('status', 30)->default('Pending');
            }
            if (! Schema::hasColumn('tour_bookings', 'add_ons')) {
                $table->text('add_ons')->nullable();
            }
            if (! Schema::hasColumn('tour_bookings', 'addon_total')) {
                $table->string('addon_total', 50)->default('Php 0.00');
            }
            if (! Schema::hasColumn('tour_bookings', 'total_price')) {
                $table->string('total_price', 50)->default('Php 0.00');
            }
        });

        // Link legacy vehicle bookings to their fleet records when possible.
        if (Schema::hasColumn('vehicle_bookings', 'vehicle_id')) {
            DB::table('vehicle_bookings')
                ->whereNull('vehicle_id')
                ->orderBy('id')
                ->chunkById(200, function ($bookings) {
                    $vehicles = DB::table('vehicles')
                        ->whereIn('name', $bookings->pluck('vehicle_name')->unique())
                        ->orderBy('id')
                        ->get(['id', 'name'])
                        ->unique('name')
                        ->keyBy('name');

                    foreach ($bookings as $booking) {
                        $vehicle = $vehicles->get($booking->vehicle_name);
                        if ($vehicle) {
                            DB::table('vehicle_bookings')
                                ->where('id', $booking->id)
                                ->update(['vehicle_id' => $vehicle->id]);
                        }
                    }
                });
        }

        // Index reservation dates and statuses for availability checks.
        $vehicleIndexes = collect(Schema::getIndexes('vehicle_bookings'))->pluck('name');
        if (! $vehicleIndexes->contains('idx_vehicle_bookings_vehicle_dates')) {
            Schema::table('vehicle_bookings', function (Blueprint $table) {
                $table->index(['vehicle_id', 'pickup_date', 'return_date', 'status'], 'idx_vehicle_bookings_vehicle_dates');
            });
        }

        $tourIndexes = collect(Schema::getIndexes('tour_bookings'))->pluck('name');
        if (! $tourIndexes->contains('idx_tour_bookings_date_status')) {
            Schema::table('tour_bookings', function (Blueprint $table) {
                $table->index(['tour_date', 'status'], 'idx_tour_bookings_date_status');
            });
        }
    }

    public function down(): void
    {
        Schema::table('vehicle_bookings', function (Blueprint $table) {
            foreach (['vehicle_id', 'status', 'add_ons', 'addon_total'] as $column) {
                if (Schema::hasColumn('vehicle_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('tour_bookings', function (Blueprint $table) {
            foreach (['status', 'add_ons', 'addon_total', 'total_price'] as $column) {
                if (Schema::hasColumn('tour_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
