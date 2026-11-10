<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Vehicle rental records and their customer/vehicle relationships. */
class VehicleBooking extends Model
{
    protected $table = 'vehicle_bookings';
    const UPDATED_AT = null;
    protected $fillable = [
        'user_id', 'vehicle_id', 'customer_name', 'vehicle_name', 'vehicle_price',
        'pickup_date', 'return_date', 'rental_days', 'total_price', 'status', 'add_ons', 'addon_total',
        'phone', 'license_number', 'pickup_time', 'pickup_location', 'notes',
    ];

    protected $casts = ['add_ons' => 'array'];

    public function user() { return $this->belongsTo(User::class); }

    public function vehicle() { return $this->belongsTo(Vehicle::class); }
}
