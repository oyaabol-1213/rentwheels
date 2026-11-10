<?php

namespace App\Http\Controllers;

use App\Models\AdminAccount;
use App\Models\Review;
use App\Models\TourBooking;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function dashboard()
    {
        $vehicles = Vehicle::orderBy('id')->get(Vehicle::listingColumns());

        return response()->json([
            'stats' => [
                'users' => User::count(),
                'vehicles' => $vehicles->count(),
                'vehicle_bookings' => VehicleBooking::count(),
                'tour_bookings' => TourBooking::count(),
            ],
            'vehicles' => $vehicles,
            'users' => User::orderByDesc('created_at')->get(['id', 'name', 'email', 'phone', 'created_at']),
            'admins' => AdminAccount::orderByDesc('created_at')->get(['id', 'name', 'email', 'phone', 'role', 'created_at']),
            'vehicle_bookings' => VehicleBooking::with('user:id,email')->orderByDesc('created_at')->get()
                ->map(fn ($b) => $b->toArray() + ['email' => $b->user?->email]),
            'tour_bookings' => TourBooking::with('user:id,email')->orderByDesc('created_at')->get()
                ->map(fn ($b) => $b->toArray() + ['email' => $b->user?->email]),
            'reviews' => Review::with('user:id,email')->orderByDesc('created_at')->get()
                ->map(fn ($r) => $r->toArray() + ['email' => $r->user?->email]),
        ]);
    }

    public function updateVehicleBookingStatus(Request $request, VehicleBooking $booking)
    {
        $data = $request->validate([
            'status' => ['required', 'in:Pending,Confirmed,Cancelled,Completed'],
        ]);

        return DB::transaction(function () use ($booking, $data) {
            $booking = VehicleBooking::whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if ($data['status'] === 'Confirmed') {
                $vehicleQuery = Vehicle::query()->lockForUpdate();
                if ($booking->vehicle_id) {
                    $vehicleQuery->whereKey($booking->vehicle_id);
                } else {
                    $vehicleQuery->where('name', $booking->vehicle_name);
                }
                $vehicleQuery->first();

                $overlap = VehicleBooking::whereKeyNot($booking->id)
                    ->where(function ($query) use ($booking) {
                        $query->where('vehicle_id', $booking->vehicle_id)
                            ->orWhere(function ($legacy) use ($booking) {
                                $legacy->whereNull('vehicle_id')->where('vehicle_name', $booking->vehicle_name);
                            });
                    })
                    ->where('status', '!=', 'Cancelled')
                    ->where('pickup_date', '<=', $booking->return_date)
                    ->where('return_date', '>=', $booking->pickup_date)
                    ->exists();

                if ($overlap) {
                    return response()->json(['message' => 'This booking overlaps another active reservation and cannot be confirmed.'], 422);
                }
            }

            $booking->status = $data['status'];
            $booking->save();

            return response()->json(['message' => 'Vehicle booking status updated.']);
        });
    }

    public function updateTourBookingStatus(Request $request, TourBooking $booking)
    {
        $data = $request->validate([
            'status' => ['required', 'in:Pending,Confirmed,Cancelled,Completed'],
        ]);

        return DB::transaction(function () use ($booking, $data) {
            $booking = TourBooking::whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if ($data['status'] === 'Confirmed') {
                Vehicle::where('type', 'Tour Van')->orderBy('id')->lockForUpdate()->first();

                $overlap = TourBooking::whereKeyNot($booking->id)
                    ->where('tour_date', $booking->tour_date)
                    ->where('status', '!=', 'Cancelled')
                    ->exists();

                if ($overlap) {
                    return response()->json(['message' => 'The tour van is already reserved for this date and cannot be confirmed.'], 422);
                }
            }

            $booking->status = $data['status'];
            $booking->save();

            return response()->json(['message' => 'Tour booking status updated.']);
        });
    }

    public function storeAdmin(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:191', 'unique:admin_accounts,email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ], [
            'required' => 'Please complete the admin account form.',
            'email.unique' => 'That email is already in use.',
        ]);

        AdminAccount::create([
            'name' => trim($data['name']),
            'email' => trim($data['email']),
            'password' => Hash::make($data['password']),
            'role' => 'admin',
        ]);

        return response()->json(['message' => 'Admin account created successfully.'], 201);
    }

    public function storeVehicle(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', 'string', 'max:50'],
            'category' => ['required', 'string', 'max:100'],
            'price_per_day' => ['required', 'string', 'max:50'],
            'status' => ['nullable', 'in:Available,Limited,Unavailable'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], [
            'required' => 'Please complete the vehicle form.',
            'image.mimes' => 'Please upload a JPG, PNG, or WEBP photo.',
            'image.max' => 'The vehicle photo must be 4 MB or smaller.',
            'image.uploaded' => 'The photo could not be uploaded. Please try a smaller file.',
        ]);

        // Accept "2400", "Php 2,400" or "Php 2,400.00" and always save it the same way.
        $price = Money::parse($data['price_per_day']);
        if ($price <= 0) {
            return response()->json(['message' => 'Please enter a valid rate per day.'], 422);
        }

        // Save the photo in public/uploads/vehicles (same idea as profile photos).
        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $fileName = 'vehicle_' . time() . '_' . Str::lower(Str::random(6)) . '.' . $file->extension();
            $file->move(public_path('uploads/vehicles'), $fileName);
            $imagePath = 'uploads/vehicles/' . $fileName;
        }

        $vehicleData = [
            'name' => trim($data['name']),
            'type' => trim($data['type']),
            'category' => trim($data['category']),
            'price_per_day' => Money::format($price),
            'status' => $data['status'] ?? 'Available',
        ];

        if (Vehicle::hasImageColumn()) {
            $vehicleData['image'] = $imagePath;
        }

        Vehicle::create($vehicleData);

        return response()->json(['message' => 'Vehicle added successfully.'], 201);
    }

    public function updateVehicleStatus(Request $request, Vehicle $vehicle)
    {
        $data = $request->validate([
            'status' => ['required', 'in:Available,Limited,Unavailable'],
        ]);

        $vehicle->status = $data['status'];
        $vehicle->save();

        return response()->json(['message' => $vehicle->name . ' is now marked as ' . $data['status'] . '.']);
    }

    public function destroyVehicle(Vehicle $vehicle)
    {
        // Remove the uploaded photo too, so the folder does not fill up with unused files.
        if (Vehicle::hasImageColumn() && $vehicle->image && str_starts_with($vehicle->image, 'uploads/vehicles/')) {
            File::delete(public_path($vehicle->image));
        }

        $vehicle->delete();
        return response()->json(['message' => 'Vehicle deleted successfully.']);
    }
}
