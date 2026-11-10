<?php

namespace App\Http\Middleware;

use App\Support\Accounts;
use Closure;
use Illuminate\Http\Request;

class EnsureAccount
{
    public function handle(Request $request, Closure $next)
    {
        if (! Accounts::current()) {
            return response()->json(['message' => 'Please log in first.'], 401);
        }
        return $next($request);
    }
}
