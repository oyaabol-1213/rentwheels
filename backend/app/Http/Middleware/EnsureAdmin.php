<?php

namespace App\Http\Middleware;

use App\Support\Accounts;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureAdmin
{
    // Require an admin session for admin-panel API routes.
    public function handle(Request $request, Closure $next)
    {
        if (! Auth::guard('admin')->check()) {
            $status = Accounts::current() ? 403 : 401;
            return response()->json(['message' => 'Admin access required.'], $status);
        }
        return $next($request);
    }
}
