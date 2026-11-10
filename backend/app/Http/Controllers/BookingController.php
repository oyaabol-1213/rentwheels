<?php

namespace App\Http\Controllers;

use App\Models\TourBooking;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Support\Accounts;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    // Customer vehicle and Tour Van reservations, availability, and cancellations.
    private const ADMIN_BLOCK = "An Admin/Super Admin can't book or rent a vehicle.";

    // Philippine mobile number, e.g. 09123456789 or +639123456789 (spaces and dashes are removed first).
    private const PHONE_RULE = '/^(09|\+639)\d{9}$/';

    /** Remove spaces, dashes and brackets so "0912 345 6789" passes the phone rule. */
    private function cleanPhones(Request $request, array $fields): void
    {
        foreach ($fields as $field) {
            if ($request->filled($field)) {
                $request->merge([$field => preg_replace('/[\s\-()]/', '', (string) $request->input($field))]);
            }
        }
    }

    // Dates already occupied by active Tour Van reservations.
    public function tourAvailability(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $from = Carbon::parse($data['from'] ?? today())->toDateString();
        $to = Carbon::parse($data['to'] ?? today()->addMonths(12))->toDateString();
        if (Carbon::parse($from)->diffInDays(Carbon::parse($to)) > 366) {
            return response()->json(['message' => 'Availability can only be requested for a 12-month period.'], 422);
        }

        return response()->json([
            'booked_dates' => TourBooking::where('status', '!=', 'Cancelled')
                ->whereBetween('tour_date', [$from, $to])
                ->orderBy('tour_date')
                ->pluck('tour_date')
                ->map(fn ($date) => Carbon::parse($date)->toDateString())
                ->values(),
        ]);
    }

    // Return the signed-in customer's vehicle and tour booking history.
    public function myBookings()
    {
        $userId = Auth::guard('web')->id();

        if (! $userId) {
            return response()->json(['vehicle_bookings' => [], 'tour_bookings' => []], 401);
        }

        $vehicleBookings = VehicleBooking::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($booking) => [
                'id' => $booking->id,
                'type' => 'vehicle',
                'status' => $booking->status ?? 'Pending',
                'customer_name' => $booking->customer_name,
                'vehicle_name' => $booking->vehicle_name,
                'pickup_date' => $booking->pickup_date,
                'return_date' => $booking->return_date,
                'rental_days' => $booking->rental_days,
                'total_price' => $booking->total_price,
                'add_ons' => $booking->add_ons ?? [],
                'addon_total' => $booking->addon_total ?? Money::format(0),
                'created_at' => $booking->created_at?->toDateTimeString(),
                'phone' => $booking->phone,
                'license_number' => $booking->license_number,
                'pickup_time' => $booking->pickup_time,
                'pickup_location' => $booking->pickup_location,
                'notes' => $booking->notes,
            ]);

        $tourBookings = TourBooking::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($booking) => [
                'id' => $booking->id,
                'type' => 'tour',
                'status' => $booking->status ?? 'Pending',
                'customer_name' => $booking->full_name,
                'vehicle_name' => $booking->route_name,
                'pickup_date' => $booking->tour_date,
                'return_date' => $booking->tour_date,
                'rental_days' => 1,
                'total_price' => $booking->total_price ?? Money::format(0),
                'add_ons' => $booking->add_ons ?? [],
                'addon_total' => $booking->addon_total ?? Money::format(0),
                'created_at' => $booking->created_at?->toDateTimeString(),
                'guests' => $booking->guests,
                'phone' => $booking->phone,
                'pickup_time' => $booking->pickup_time,
                'pickup_location' => $booking->pickup_location,
                'emergency_contact' => $booking->emergency_contact,
                'emergency_phone' => $booking->emergency_phone,
                'notes' => $booking->notes,
            ]);

        return response()->json([
            'vehicle_bookings' => $vehicleBookings,
            'tour_bookings' => $tourBookings,
        ]);
    }

    // Customers may cancel only their own pending reservations.
    public function cancelVehicleBooking(VehicleBooking $booking)
    {
        if ($booking->user_id !== Auth::guard('web')->id()) {
            return response()->json(['message' => 'This booking does not belong to your account.'], 403);
        }

        if (($booking->status ?? 'Pending') !== 'Pending') {
            return response()->json(['message' => 'Only pending bookings can be cancelled.'], 422);
        }

        $updated = VehicleBooking::whereKey($booking->id)
            ->where('status', 'Pending')
            ->update(['status' => 'Cancelled']);
        if (! $updated) {
            return response()->json(['message' => 'Only pending bookings can be cancelled.'], 422);
        }

        return response()->json(['message' => 'Vehicle booking cancelled.']);
    }

    public function cancelTourBooking(TourBooking $booking)
    {
        if ($booking->user_id !== Auth::guard('web')->id()) {
            return response()->json(['message' => 'This booking does not belong to your account.'], 403);
        }

        if (($booking->status ?? 'Pending') !== 'Pending') {
            return response()->json(['message' => 'Only pending bookings can be cancelled.'], 422);
        }

        $updated = TourBooking::whereKey($booking->id)
            ->where('status', 'Pending')
            ->update(['status' => 'Cancelled']);
        if (! $updated) {
            return response()->json(['message' => 'Only pending bookings can be cancelled.'], 422);
        }

        return response()->json(['message' => 'Tour booking cancelled.']);
    }

    // Validate availability and create a vehicle reservation with server-calculated pricing.
    public function storeVehicle(Request $request)
    {
        if (Accounts::isAdmin(Accounts::current())) {
            return response()->json(['message' => self::ADMIN_BLOCK], 403);
        }

        $this->cleanPhones($request, ['phone']);

        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:150'],
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'pickup_date' => ['required', 'date', 'after_or_equal:today'],
            'return_date' => ['required', 'date', 'after_or_equal:pickup_date'],
            'phone' => ['required', 'string', 'regex:' . self::PHONE_RULE],
            'license_number' => ['required', 'string', 'regex:/^[A-Za-z0-9\- ]{5,20}$/'],
            'pickup_time' => ['required', 'date_format:H:i'],
            'pickup_location' => ['required', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'required' => 'Missing booking details.',
            'phone.regex' => 'Please enter a valid mobile number, like 09123456789.',
            'license_number.regex' => "Please enter a valid driver's license number (letters, numbers and dashes only).",
            'pickup_time.date_format' => 'Please choose a valid pick-up time.',
            'return_date.after_or_equal' => 'Invalid rental dates.',
            'pickup_date.after_or_equal' => 'Pick-up date cannot be in the past.',
        ]);

        $pickup = Carbon::parse($data['pickup_date'])->startOfDay();
        $return = Carbon::parse($data['return_date'])->startOfDay();
        $result = DB::transaction(function () use ($data, $pickup, $return) {
            $vehicle = Vehicle::whereKey($data['vehicle_id'])->lockForUpdate()->firstOrFail();
            if (strcasecmp($vehicle->status, 'Unavailable') === 0) {
                return response()->json(['message' => 'This vehicle is currently unavailable.'], 422);
            }

            $hasOverlap = VehicleBooking::where(function ($query) use ($vehicle) {
                $query->where('vehicle_id', $vehicle->id)
                    ->orWhere(function ($legacy) use ($vehicle) {
                        $legacy->whereNull('vehicle_id')->where('vehicle_name', $vehicle->name);
                    });
            })
                ->where('status', '!=', 'Cancelled')
                ->where('pickup_date', '<=', $return->toDateString())
                ->where('return_date', '>=', $pickup->toDateString())
                ->exists();

            if ($hasOverlap) {
                return response()->json(['message' => 'This vehicle is already booked for part of the selected dates.'], 422);
            }

            $days = $pickup->diffInDays($return) + 1;
            $total = $days * Money::parse($vehicle->price_per_day);
            $booking = VehicleBooking::create([
                'user_id' => Auth::guard('web')->id(),
                'vehicle_id' => $vehicle->id,
                'customer_name' => trim($data['customer_name']),
                'vehicle_name' => $vehicle->name,
                'vehicle_price' => $vehicle->price_per_day,
                'pickup_date' => $pickup->toDateString(),
                'return_date' => $return->toDateString(),
                'rental_days' => $days,
                'total_price' => Money::format($total),
                'status' => 'Pending',
                'add_ons' => [],
                'addon_total' => Money::format(0),
                'phone' => $data['phone'],
                'license_number' => strtoupper(trim($data['license_number'])),
                'pickup_time' => $data['pickup_time'],
                'pickup_location' => trim($data['pickup_location']),
                'notes' => isset($data['notes']) ? trim($data['notes']) : null,
            ]);

            return response()->json(['message' => 'Booking request submitted.', 'booking' => $booking], 201);
        });

        return $result;
    }

    // Validate the Tour Van reservation, add-ons, and server-calculated total.
    public function storeTour(Request $request)
    {
        if (Accounts::isAdmin(Accounts::current())) {
            return response()->json(['message' => self::ADMIN_BLOCK], 403);
        }

        $this->cleanPhones($request, ['phone', 'emergency_phone']);

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'regex:' . self::PHONE_RULE],
            'tour_date' => ['required', 'date', 'after_or_equal:today'],
            'guests' => ['required', 'string', 'max:30'],
            'route_name' => ['required', 'string', 'max:150', Rule::in(array_merge(array_keys(config('booking.tour_routes')), ['Custom Bicol itinerary']))],
            'notes' => ['nullable', 'string', 'max:2000'],
            'pickup_location' => ['required', 'string', 'max:200'],
            'pickup_time' => ['required', 'date_format:H:i'],
            'emergency_contact' => ['nullable', 'string', 'max:150'],
            'emergency_phone' => ['nullable', 'required_with:emergency_contact', 'regex:' . self::PHONE_RULE],
            'add_ons.pickup' => ['sometimes', 'boolean'],
            'add_ons.extra_stops' => ['sometimes', 'integer', 'min:0', 'max:20'],
        ], [
            'required' => 'Please complete the tour booking form.',
            'phone.regex' => 'Please enter a valid mobile number, like 09123456789.',
            'emergency_phone.regex' => 'Please enter a valid emergency contact number, like 09123456789.',
            'emergency_phone.required_with' => 'Please add the emergency contact number.',
            'pickup_time.date_format' => 'Please choose a valid pick-up time.',
        ]);

        $result = DB::transaction(function () use ($data) {
            $van = Vehicle::where('type', 'Tour Van')->orderBy('id')->lockForUpdate()->firstOrFail();
            if (strcasecmp($van->status, 'Unavailable') === 0) {
                return response()->json(['message' => 'The tour van is currently unavailable.'], 422);
            }

            $tourDate = Carbon::parse($data['tour_date'])->toDateString();
            $isBooked = TourBooking::where('tour_date', $tourDate)
                ->where('status', '!=', 'Cancelled')
                ->exists();
            if ($isBooked) {
                return response()->json(['message' => 'The tour van is already booked for this date.'], 422);
            }

            $addons = [];
            $addonTotal = 0;
            $addonInput = $data['add_ons'] ?? [];
            if (! empty($addonInput['pickup'])) {
                $pickupAddon = config('booking.addons.pickup');
                $addons[] = [
                    'key' => 'pickup',
                    'label' => $pickupAddon['label'],
                    'quantity' => 1,
                    'unit_price' => $pickupAddon['price'],
                    'total' => $pickupAddon['price'],
                ];
                $addonTotal += $pickupAddon['price'];
            }

            $extraStops = (int) ($addonInput['extra_stops'] ?? 0);
            if ($extraStops > 0) {
                $stopAddon = config('booking.addons.extra_stop');
                $addons[] = [
                    'key' => 'extra_stop',
                    'label' => $stopAddon['label'],
                    'quantity' => $extraStops,
                    'unit_price' => $stopAddon['price'],
                    'total' => $stopAddon['price'] * $extraStops,
                ];
                $addonTotal += $stopAddon['price'] * $extraStops;
            }

            $basePrice = config('booking.tour_routes.'.$data['route_name'])
                ?? Money::parse($van->price_per_day);
            $booking = TourBooking::create([
                'user_id' => Auth::guard('web')->id(),
                'full_name' => trim($data['full_name']),
                'phone' => trim($data['phone']),
                'tour_date' => $tourDate,
                'guests' => $data['guests'],
                'route_name' => trim($data['route_name']),
                'notes' => isset($data['notes']) ? trim($data['notes']) : null,
                'pickup_location' => trim($data['pickup_location']),
                'pickup_time' => $data['pickup_time'],
                'emergency_contact' => isset($data['emergency_contact']) ? trim($data['emergency_contact']) : null,
                'emergency_phone' => $data['emergency_phone'] ?? null,
                'status' => 'Pending',
                'add_ons' => $addons,
                'addon_total' => Money::format($addonTotal),
                'total_price' => Money::format($basePrice + $addonTotal),
            ]);

            return response()->json([
                'message' => 'Tour booking request submitted.',
                'booking' => $booking,
            ], 201);
        });

        return $result;
    }
}
