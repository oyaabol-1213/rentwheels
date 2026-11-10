<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tour Van reservation records and their customer relationship. */
class TourBooking extends Model
{
    protected $table = 'tour_bookings';
    const UPDATED_AT = null;
    protected $fillable = [
        'user_id', 'full_name', 'phone', 'tour_date', 'guests', 'route_name', 'notes',
        'status', 'add_ons', 'addon_total', 'total_price',
        'pickup_location', 'pickup_time', 'emergency_contact', 'emergency_phone',
    ];

    protected $casts = ['add_ons' => 'array'];

    public function user() { return $this->belongsTo(User::class); }
}
