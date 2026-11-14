<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One emailed one-time code. Only the bcrypt hash is stored, never the 6 digits themselves. */
class EmailOtp extends Model
{
    protected $table = 'email_otps';

    protected $fillable = ['user_id', 'email', 'purpose', 'otp_hash', 'expires_at', 'attempts', 'verified_at'];

    // Keep the hash out of any accidental toArray()/JSON output.
    protected $hidden = ['otp_hash'];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'attempts' => 'integer',
    ];
}
