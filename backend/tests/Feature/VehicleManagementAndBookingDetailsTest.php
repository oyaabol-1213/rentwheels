<?php

namespace Tests\Feature;

use App\Models\AdminAccount;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VehicleManagementAndBookingDetailsTest extends TestCase
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

    protected function tearDown(): void
    {
        // Delete only the photos these tests uploaded (never the real ones in the folder).
        foreach (Vehicle::whereNotNull('image')->pluck('image') as $image) {
            File::delete(public_path($image));
        }
        parent::tearDown();
    }

    /** A tiny real PNG, so the tests do not need the GD extension. */
    private function fakePhoto(string $name): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        return UploadedFile::fake()->createWithContent($name, $png);
    }

    private function superAdmin(): AdminAccount
    {
        return AdminAccount::create([
            'name' => 'Super Admin',
            'email' => 'super@example.test',
            'password' => 'password',
            'role' => 'super_admin',
        ]);
    }

    private function customer(): User
    {
        return User::create(['name' => 'Test Customer', 'email' => 'customer@example.test', 'password' => 'password']);
    }

    private function car(string $status = 'Available'): Vehicle
    {
        return Vehicle::create([
            'name' => 'Test Car', 'type' => 'Car', 'category' => 'Test',
            'price_per_day' => 'Php 1,000.00', 'status' => $status,
        ]);
    }

    private function rentalPayload(Vehicle $vehicle, array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Test Customer',
            'vehicle_id' => $vehicle->id,
            'pickup_date' => Carbon::tomorrow()->toDateString(),
            'return_date' => Carbon::tomorrow()->addDay()->toDateString(),
            'phone' => '0912 345 6789',
            'license_number' => 'n01-23-456789',
            'pickup_time' => '09:30',
            'pickup_location' => 'Legazpi Airport',
            'notes' => 'Need a child seat.',
        ], $overrides);
    }

    // ---- Add vehicle with photo ----

    public function test_super_admin_can_add_a_vehicle_with_a_photo(): void
    {
        $this->actingAs($this->superAdmin(), 'admin')
            ->post('/api/admin/vehicles', [
                'name' => 'Toyota Vios',
                'type' => 'Car',
                'category' => 'Sedan',
                'price_per_day' => '2400',
                'status' => 'Limited',
                'image' => $this->fakePhoto('vios.png'),
            ], ['Accept' => 'application/json'])
            ->assertCreated();

        $vehicle = Vehicle::first();
        $this->assertSame('Php 2,400.00', $vehicle->price_per_day);
        $this->assertSame('Limited', $vehicle->status);
        $this->assertStringStartsWith('uploads/vehicles/', $vehicle->image);
        $this->assertFileExists(public_path($vehicle->image));
    }

    public function test_vehicle_can_be_added_without_a_photo(): void
    {
        $this->actingAs($this->superAdmin(), 'admin')
            ->postJson('/api/admin/vehicles', [
                'name' => 'Yamaha Sniper', 'type' => 'Bike', 'category' => 'Bikes', 'price_per_day' => 'Php 900.00',
            ])->assertCreated();

        $this->assertNull(Vehicle::first()->image);
        $this->assertSame('Available', Vehicle::first()->status);
    }

    public function test_non_image_files_are_rejected(): void
    {
        $this->actingAs($this->superAdmin(), 'admin')
            ->post('/api/admin/vehicles', [
                'name' => 'Bad File', 'type' => 'Car', 'category' => 'Test', 'price_per_day' => '1000',
                'image' => UploadedFile::fake()->create('virus.pdf', 100, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.image.0', 'Please upload a JPG, PNG, or WEBP photo.');

        $this->assertSame(0, Vehicle::count());
    }

    public function test_deleting_a_vehicle_removes_its_photo_file(): void
    {
        $admin = $this->superAdmin();
        $this->actingAs($admin, 'admin')->post('/api/admin/vehicles', [
            'name' => 'Temp', 'type' => 'Car', 'category' => 'Test', 'price_per_day' => '1000',
            'image' => $this->fakePhoto('temp.png'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $vehicle = Vehicle::first();
        $path = public_path($vehicle->image);
        $this->assertFileExists($path);

        $this->deleteJson('/api/admin/vehicles/' . $vehicle->id)->assertOk();
        $this->assertFileDoesNotExist($path);
    }

    // ---- Set vehicle status ----

    public function test_super_admin_can_set_vehicle_status(): void
    {
        $vehicle = $this->car();
        $this->actingAs($this->superAdmin(), 'admin');

        foreach (['Limited', 'Unavailable', 'Available'] as $status) {
            $this->patchJson('/api/admin/vehicles/' . $vehicle->id . '/status', ['status' => $status])->assertOk();
            $this->assertSame($status, $vehicle->fresh()->status);
        }
    }

    public function test_invalid_status_is_rejected_and_normal_admin_is_blocked(): void
    {
        $vehicle = $this->car();

        $this->actingAs($this->superAdmin(), 'admin')
            ->patchJson('/api/admin/vehicles/' . $vehicle->id . '/status', ['status' => 'Broken'])
            ->assertUnprocessable();

        $normal = AdminAccount::create(['name' => 'Admin', 'email' => 'a@example.test', 'password' => 'password', 'role' => 'admin']);
        $this->actingAs($normal, 'admin')
            ->patchJson('/api/admin/vehicles/' . $vehicle->id . '/status', ['status' => 'Limited'])
            ->assertForbidden();

        $this->assertSame('Available', $vehicle->fresh()->status);
    }

    public function test_unavailable_vehicle_cannot_be_booked_but_limited_can(): void
    {
        $customer = $this->customer();

        $unavailable = $this->car('Unavailable');
        $this->actingAs($customer, 'web')
            ->postJson('/api/vehicle-bookings', $this->rentalPayload($unavailable))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This vehicle is currently unavailable.');

        $limited = Vehicle::create(['name' => 'Limited Car', 'type' => 'Car', 'category' => 'Test', 'price_per_day' => 'Php 1,000.00', 'status' => 'Limited']);
        $this->postJson('/api/vehicle-bookings', $this->rentalPayload($limited))->assertCreated();
    }

    // ---- Rent booking details ----

    public function test_rental_booking_saves_the_extra_details(): void
    {
        $vehicle = $this->car();

        $this->actingAs($this->customer(), 'web')
            ->postJson('/api/vehicle-bookings', $this->rentalPayload($vehicle))
            ->assertCreated()
            ->assertJsonPath('booking.phone', '09123456789')
            ->assertJsonPath('booking.license_number', 'N01-23-456789')
            ->assertJsonPath('booking.pickup_time', '09:30')
            ->assertJsonPath('booking.pickup_location', 'Legazpi Airport')
            ->assertJsonPath('booking.total_price', 'Php 2,000.00');
    }

    public function test_rental_booking_requires_contact_license_and_pickup_details(): void
    {
        $vehicle = $this->car();
        $this->actingAs($this->customer(), 'web');

        foreach (['phone', 'license_number', 'pickup_time', 'pickup_location'] as $field) {
            $payload = $this->rentalPayload($vehicle);
            unset($payload[$field]);
            $this->postJson('/api/vehicle-bookings', $payload)->assertUnprocessable()->assertJsonValidationErrors([$field]);
        }
    }

    public function test_rental_booking_rejects_a_bad_phone_number(): void
    {
        $this->actingAs($this->customer(), 'web')
            ->postJson('/api/vehicle-bookings', $this->rentalPayload($this->car(), ['phone' => '12345']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);
    }

    // ---- Tour booking details ----

    private function tourVan(): Vehicle
    {
        return Vehicle::create([
            'name' => 'Tourist Van with Driver', 'type' => 'Tour Van', 'category' => 'Bicol Tours',
            'price_per_day' => 'PHP 5,800', 'status' => 'Available',
        ]);
    }

    private function tourPayload(array $overrides = []): array
    {
        return array_merge([
            'full_name' => 'Tour Guest',
            'phone' => '09123456789',
            'tour_date' => Carbon::tomorrow()->toDateString(),
            'guests' => '5-8 guests',
            'route_name' => 'Mayon Highlights Loop',
            'pickup_location' => 'Hotel in Legazpi',
            'pickup_time' => '07:00',
            'emergency_contact' => 'Maria Guest',
            'emergency_phone' => '0917 123 4567',
        ], $overrides);
    }

    public function test_tour_booking_saves_pickup_and_emergency_details(): void
    {
        $this->tourVan();

        $this->postJson('/api/tour-bookings', $this->tourPayload())
            ->assertCreated()
            ->assertJsonPath('booking.pickup_location', 'Hotel in Legazpi')
            ->assertJsonPath('booking.pickup_time', '07:00')
            ->assertJsonPath('booking.emergency_contact', 'Maria Guest')
            ->assertJsonPath('booking.emergency_phone', '09171234567');
    }

    public function test_tour_booking_requires_pickup_details_but_emergency_contact_is_optional(): void
    {
        $this->tourVan();

        $payload = $this->tourPayload();
        unset($payload['pickup_location'], $payload['pickup_time']);
        $this->postJson('/api/tour-bookings', $payload)->assertUnprocessable()->assertJsonValidationErrors(['pickup_location', 'pickup_time']);

        $optional = $this->tourPayload();
        unset($optional['emergency_contact'], $optional['emergency_phone']);
        $this->postJson('/api/tour-bookings', $optional)->assertCreated();
    }

    public function test_emergency_contact_name_needs_a_number(): void
    {
        $this->tourVan();

        $payload = $this->tourPayload();
        unset($payload['emergency_phone']);
        $this->postJson('/api/tour-bookings', $payload)->assertUnprocessable()->assertJsonValidationErrors(['emergency_phone']);
    }
}
