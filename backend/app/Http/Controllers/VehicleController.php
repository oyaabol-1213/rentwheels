<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\VehicleBooking;
use Carbon\Carbon;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index()
    {
        return response()->json([
            'vehicles' => Vehicle::orderBy('id')->get(Vehicle::listingColumns()),
        ]);
    }

    public function availability(Request $request, Vehicle $vehicle)
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

        $bookings = VehicleBooking::query()
            ->where(function ($query) use ($vehicle) {
                $query->where('vehicle_id', $vehicle->id)
                    ->orWhere(function ($legacy) use ($vehicle) {
                        $legacy->whereNull('vehicle_id')->where('vehicle_name', $vehicle->name);
                    });
            })
            ->where('status', '!=', 'Cancelled')
            ->where('pickup_date', '<=', $to)
            ->where('return_date', '>=', $from)
            ->orderBy('pickup_date')
            ->get(['pickup_date', 'return_date']);

        return response()->json([
            'booked_ranges' => $bookings->map(fn ($booking) => [
                'from' => $booking->pickup_date,
                'to' => $booking->return_date,
            ]),
        ]);
    }
}
