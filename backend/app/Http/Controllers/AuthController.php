<?php

namespace App\Http\Controllers;

use App\Models\AdminAccount;
use App\Models\User;
use App\Support\Accounts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // Session restoration and customer/admin authentication endpoints.
    public function me()
    {
        $account = Accounts::current();
        return response()->json(['user' => $account ? Accounts::payload($account) : null]);
    }

    /** Same lookup order as the old login.php: admin_accounts first, then users. */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ], ['required' => 'Missing fields']);

        $email = trim($data['email']);
        $sources = [
            ['guard' => 'admin', 'model' => AdminAccount::class],
            ['guard' => 'web', 'model' => User::class],
        ];

        foreach ($sources as $source) {
            $account = $source['model']::where('email', $email)->first();
            if (! $account) {
                continue;
            }

            if (! Hash::check($data['password'], $account->password)) {
                return response()->json(['message' => 'Incorrect password'], 422);
            }

            $this->signOutEverywhere();
            Auth::guard($source['guard'])->login($account);
            $request->session()->regenerate();

            return response()->json(['user' => Accounts::payload($account)]);
        }

        return response()->json(['message' => 'Email not found'], 422);
    }

    // Create a customer account and sign the new user in.
    public function signup(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:191', 'unique:users,email', 'unique:admin_accounts,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:30'],
        ], [
            'email.unique' => 'Email already exists',
            'required' => 'Missing fields',
        ]);

        $user = User::create([
            'name' => trim($data['name']),
            'email' => trim($data['email']),
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
        ]);

        $this->signOutEverywhere();
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['user' => Accounts::payload($user)], 201);
    }

    // Clear both account guards and invalidate the current session.
    public function logout(Request $request)
    {
        $this->signOutEverywhere();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    private function signOutEverywhere(): void
    {
        Auth::guard('admin')->logout();
        Auth::guard('web')->logout();
    }
}
