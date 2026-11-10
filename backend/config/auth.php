<?php

/*
 | Two separate account tables in the existing database:
 |   users          -> guard "web"   (customers)
 |   admin_accounts -> guard "admin" (admin / super_admin)
 */
return [
    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        'web' => ['driver' => 'session', 'provider' => 'users'],
        'admin' => ['driver' => 'session', 'provider' => 'admins'],
    ],

    'providers' => [
        'users' => ['driver' => 'eloquent', 'model' => App\Models\User::class],
        'admins' => ['driver' => 'eloquent', 'model' => App\Models\AdminAccount::class],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,
];
