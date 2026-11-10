<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureSuperAdmin
{
    // Restrict sensitive admin management actions to the Super Admin account.
    public function handle(Request $request, Closure $next)
    {
        $admin = Auth::guard('admin')->user();
        if (! $admin || ! $admin->isSuperAdmin()) {
            return response()->json(['message' => 'Only the Super Admin can do that.'], 403);
        }
        return $next($request);
    }
}
