<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\AdminAccount;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BookingAvailabilityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        foreach (['vehicle_bookings', 'tour_bookings', 'vehicles', 'admin_accounts', 'users'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->string('phone')->nullable();
            $table->string('profile_image')->nullable();
            // Existing tests act as already-verified customers (new sign-ups are what start unverified).
            $table->timestamp('email_verified_at')->nullable()->useCurrent();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('admin_accounts', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->string('phone')->nullable();
            $table->string('profile_image')->nullable();
            $table->string('role')->default('admin');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('type');
            $table->string('category');
            $table->string('price_per_day');
            $table->string('status');
            $table->string('image')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('vehicle_bookings', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->integer('vehicle_id')->nullable();
            $table->string('customer_name');
            $table->string('vehicle_name');
            $table->string('vehicle_price');
            $table->date('pickup_date');
            $table->date('return_date');
            $table->integer('rental_days');
            $table->string('total_price');
            $table->string('status')->default('Pending');
            $table->text('add_ons')->nullable();
            $table->string('addon_total')->default('Php 0.00');
            $table->string('phone')->nullable();
            $table->string('license_number')->nullable();
            $table->string('pickup_time')->nullable();
            $table->string('pickup_location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('tour_bookings', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id')->nullable();
            $table->string('full_name');
            $table->string('phone');
            $table->date('tour_date');
            $table->string('guests');
            $table->string('route_name');
            $table->text('notes')->nullable();
            $table->string('status')->default('Pending');
            $table->text('add_ons')->nullable();
            $table->string('addon_total')->default('Php 0.00');
            $table->string('total_price')->default('Php 0.00');
            $table->string('pickup_location')->nullable();
            $table->string('pickup_time')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->string('emergency_phone')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    /** The extra details every tour request now needs. */
    private function tourDetails(): array
    {
        return ['pickup_location' => 'Legazpi City Hall', 'pickup_time' => '08:00'];
    }

    public function test_vehicle_booking_rejects_overlapping_dates(): void
    {
        $customer = User::create([
            'name' => 'Test Customer',
            'email' => 'customer@example.test',
            'password' => 'password',
        ]);
        $vehicle = Vehicle::create([
            'name' => 'Test Car',
            'type' => 'Car',
            'category' => 'Test',
            'price_per_day' => 'Php 1,000.00',
            'status' => 'Available',
        ]);
        $start = Carbon::tomorrow()->addDays(10)->toDateString();
        $end = Carbon::parse($start)->addDays(2)->toDateString();

        VehicleBooking::create([
            'user_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'customer_name' => $customer->name,
            'vehicle_name' => $vehicle->name,
            'vehicle_price' => $vehicle->price_per_day,
            'pickup_date' => $start,
            'return_date' => $end,
            'rental_days' => 3,
            'total_price' => 'Php 3,000.00',
            'status' => 'Pending',
        ]);

        $this->actingAs($customer, 'web')
            ->postJson('/api/vehicle-bookings', [
                'customer_name' => $customer->name,
                'vehicle_id' => $vehicle->id,
                'pickup_date' => Carbon::parse($start)->addDay()->toDateString(),
                'return_date' => Carbon::parse($end)->addDay()->toDateString(),
                'phone' => '09123456789',
                'license_number' => 'N01-23-456789',
                'pickup_time' => '09:00',
                'pickup_location' => 'Legazpi Airport',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This vehicle is already booked for part of the selected dates.');

        $this->assertSame(1, DB::table('vehicle_bookings')->count());
    }

    public function test_tour_booking_calculates_selected_addons_on_the_server(): void
    {
        Vehicle::create([
            'name' => 'Tourist Van with Driver',
            'type' => 'Tour Van',
            'category' => 'Bicol Tours',
            'price_per_day' => 'PHP 5,800',
            'status' => 'Available',
        ]);

        $this->postJson('/api/tour-bookings', [
            'full_name' => 'Tour Guest',
            'phone' => '09123456789',
            'tour_date' => Carbon::tomorrow()->toDateString(),
            'guests' => '1-4 guests',
            'route_name' => 'Donsol Nature Escape',
            'add_ons' => ['pickup' => true, 'extra_stops' => 1],
        ] + $this->tourDetails())
            ->assertCreated()
            ->assertJsonPath('booking.status', 'Pending')
            ->assertJsonPath('booking.addon_total', 'Php 1,000.00')
            ->assertJsonPath('booking.total_price', 'Php 8,400.00');
    }

    public function test_tour_booking_uses_the_selected_routes_server_price(): void
    {
        Vehicle::create([
            'name' => 'Tourist Van with Driver',
            'type' => 'Tour Van',
            'category' => 'Bicol Tours',
            'price_per_day' => 'PHP 5,800',
            'status' => 'Available',
        ]);

        $routes = [
            ['Mayon Highlights Loop', 'Php 6,200.00'],
            ['Legazpi Heritage and View Deck Tour', 'Php 5,800.00'],
            ['Donsol Nature Escape', 'Php 7,400.00'],
            ['Sorsogon Heritage Day Trip', 'Php 7,000.00'],
        ];
        foreach ($routes as $index => [$route, $expectedTotal]) {
            $this->postJson('/api/tour-bookings', [
                'full_name' => 'Tour Guest',
                'phone' => '09123456789',
                'tour_date' => Carbon::tomorrow()->addDays($index)->toDateString(),
                'guests' => '1-4 guests',
                'route_name' => $route,
            ] + $this->tourDetails())
                ->assertCreated()
                ->assertJsonPath('booking.total_price', $expectedTotal);
        }
    }

    public function test_tour_availability_excludes_cancelled_requests_and_blocks_reserved_dates(): void
    {
        Vehicle::create([
            'name' => 'Tourist Van with Driver',
            'type' => 'Tour Van',
            'category' => 'Bicol Tours',
            'price_per_day' => 'PHP 5,800',
            'status' => 'Available',
        ]);
        $tourDate = Carbon::tomorrow()->toDateString();
        DB::table('tour_bookings')->insert([
            'full_name' => 'Existing guest',
            'phone' => '09123456789',
            'tour_date' => $tourDate,
            'guests' => '1-4 guests',
            'route_name' => 'Mayon Highlights Loop',
            'status' => 'Pending',
        ]);

        $this->getJson('/api/tour-bookings/availability?from='.$tourDate.'&to='.$tourDate)
            ->assertOk()
            ->assertJsonPath('booked_dates.0', $tourDate);

        $this->postJson('/api/tour-bookings', [
            'full_name' => 'Another guest',
            'phone' => '09987654321',
            'tour_date' => $tourDate,
            'guests' => '1-4 guests',
            'route_name' => 'Mayon Highlights Loop',
        ] + $this->tourDetails())->assertUnprocessable()
            ->assertJsonPath('message', 'The tour van is already booked for this date.');
    }

    public function test_vehicle_calendar_returns_only_active_booking_ranges(): void
    {
        $customer = User::create([
            'name' => 'Test Customer',
            'email' => 'customer@example.test',
            'password' => 'password',
        ]);
        $vehicle = Vehicle::create([
            'name' => 'Test Car',
            'type' => 'Car',
            'category' => 'Test',
            'price_per_day' => 'Php 1,000.00',
            'status' => 'Available',
        ]);
        $start = Carbon::tomorrow()->addDays(10)->toDateString();
        $end = Carbon::parse($start)->addDay()->toDateString();

        foreach (['Pending', 'Cancelled'] as $status) {
            VehicleBooking::create([
                'user_id' => $customer->id,
                'vehicle_id' => $vehicle->id,
                'customer_name' => $customer->name,
                'vehicle_name' => $vehicle->name,
                'vehicle_price' => $vehicle->price_per_day,
                'pickup_date' => $start,
                'return_date' => $end,
                'rental_days' => 2,
                'total_price' => 'Php 2,000.00',
                'status' => $status,
            ]);
        }

        $this->getJson('/api/vehicles/'.$vehicle->id.'/availability?from='.$start.'&to='.$end)
            ->assertOk()
            ->assertJsonCount(1, 'booked_ranges')
            ->assertJsonPath('booked_ranges.0.from', $start)
            ->assertJsonPath('booked_ranges.0.to', $end);
    }

    public function test_admin_cannot_confirm_an_overlapping_vehicle_booking(): void
    {
        $customer = User::create([
            'name' => 'Test Customer',
            'email' => 'customer@example.test',
            'password' => 'password',
        ]);
        $vehicle = Vehicle::create([
            'name' => 'Test Car',
            'type' => 'Car',
            'category' => 'Test',
            'price_per_day' => 'Php 1,000.00',
            'status' => 'Available',
        ]);
        $start = Carbon::tomorrow()->addDays(10)->toDateString();
        $end = Carbon::parse($start)->addDay()->toDateString();
        $bookingData = [
            'user_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'customer_name' => $customer->name,
            'vehicle_name' => $vehicle->name,
            'vehicle_price' => $vehicle->price_per_day,
            'pickup_date' => $start,
            'return_date' => $end,
            'rental_days' => 2,
            'total_price' => 'Php 2,000.00',
            'status' => 'Pending',
        ];
        VehicleBooking::create($bookingData);
        $bookingToConfirm = VehicleBooking::create($bookingData);
        $admin = AdminAccount::create([
            'name' => 'Test Admin',
            'email' => 'admin@example.test',
            'password' => 'password',
            'role' => 'admin',
        ]);

        $this->actingAs($admin, 'admin')
            ->patchJson('/api/admin/vehicle-bookings/'.$bookingToConfirm->id.'/status', ['status' => 'Confirmed'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This booking overlaps another active reservation and cannot be confirmed.');

        $this->assertSame('Pending', $bookingToConfirm->fresh()->status);
    }
}
