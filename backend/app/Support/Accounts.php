<?php

namespace App\Support;

use App\Models\AdminAccount;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Auth;

class Accounts
{
    /** The signed-in account: an admin (guard "admin") or a customer (guard "web"). */
    public static function current(): ?Authenticatable
    {
        return Auth::guard('admin')->user() ?? Auth::guard('web')->user();
    }

    public static function isAdmin(?Authenticatable $account): bool
    {
        return $account instanceof AdminAccount;
    }

    public static function avatarUrl($account): string
    {
        $path = $account->profile_image ?? null;
        if ($path && file_exists(public_path($path))) {
            return '/' . ltrim($path, '/');
        }
        return '/needs/man.jpg';
    }

    public static function payload(Authenticatable $account): array
    {
        $isAdmin = self::isAdmin($account);
        $name = trim((string) $account->name);

        return [
            'id' => $account->id,
            'name' => $account->name,
            'first_name' => $name !== '' ? explode(' ', $name)[0] : '',
            'email' => $account->email,
            'phone' => $account->phone,
            'role' => $isAdmin ? $account->role : 'user',
            'account_type' => $isAdmin ? 'admin' : 'user',
            'avatar_url' => self::avatarUrl($account),
            'created_at' => optional($account->created_at)->toDateTimeString(),
        ];
    }
}
