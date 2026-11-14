<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\Accounts;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureAccount
{
    // Protect customer-only API routes from signed-out requests and unverified customers.
    public function handle(Request $request, Closure $next)
    {
        $account = Accounts::current();

        if (! $account) {
            return response()->json(['message' => 'Please log in first.'], 401);
        }

        // Unverified customers never get a session (login/sign-up refuse to create one), but
        // this keeps the rule enforced on the server even if one somehow exists.
        if ($account instanceof User && ! $account->hasVerifiedEmail()) {
            Auth::guard('web')->logout();

            return response()->json([
                'message' => 'Please verify your email first.',
                'requires_verification' => true,
                'email' => $account->email,
            ], 403);
        }

        return $next($request);
    }
}
