<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/** Existing `users` table (customers). */
class User extends Authenticatable
{
    use Notifiable;

    protected $table = 'users';
    const UPDATED_AT = null;           // table only has created_at

    protected $fillable = ['name', 'email', 'password', 'phone', 'profile_image'];
    protected $hidden = ['password'];

    // Table has no remember_token column
    public function getRememberTokenName() { return ''; }
}
