<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

/** Existing `admin_accounts` table (role: admin | super_admin). */
class AdminAccount extends Authenticatable
{
    protected $table = 'admin_accounts';
    const UPDATED_AT = null;

    protected $fillable = ['name', 'email', 'password', 'phone', 'profile_image', 'role'];
    protected $hidden = ['password'];

    public function getRememberTokenName() { return ''; }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }
}
