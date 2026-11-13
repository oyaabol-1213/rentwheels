<?php

namespace App\Http\Controllers;

use App\Models\AdminAccount;
use App\Models\User;
use App\Notifications\PasswordResetCode;
use App\Support\Accounts;
use Illuminate\Support\Carbon;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

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

    public function sendPasswordResetCode(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:191'],
        ]);
        $email = strtolower(trim($data['email']));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($user) {
            $record = DB::table('password_reset_tokens')->where('email', $user->email)->first();
            if (! $record || Carbon::parse($record->created_at)->addSeconds(60)->isPast()) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                DB::table('password_reset_tokens')->updateOrInsert(
                    ['email' => $user->email],
                    ['token' => Hash::make($code), 'created_at' => now()]
                );
                $user->notify(new PasswordResetCode($code));
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a 6-digit reset code has been sent.',
        ]);
    }

    public function verifyPasswordResetCode(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:191'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);
        $email = strtolower(trim($data['email']));
        $key = $this->passwordResetCodeRateLimitKey($email);

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many code attempts. Request a new code later.'], 429);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        $resetToken = null;

        if ($user) {
            $resetToken = DB::transaction(function () use ($user, $data) {
                $record = DB::table('password_reset_tokens')
                    ->where('email', $user->email)
                    ->lockForUpdate()
                    ->first();

                if (
                    ! $record ||
                    Carbon::parse($record->created_at)->addMinutes(10)->isPast() ||
                    ! Hash::check($data['code'], $record->token)
                ) {
                    return null;
                }

                $token = bin2hex(random_bytes(32));
                DB::table('password_reset_tokens')
                    ->where('email', $user->email)
                    ->update(['token' => Hash::make($token), 'created_at' => now()]);

                return $token;
            });
        }

        if (! $resetToken) {
            RateLimiter::hit($key, 600);
            return response()->json(['message' => 'That code is invalid or has expired.'], 422);
        }

        RateLimiter::clear($key);

        return response()->json(['reset_token' => $resetToken]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:191'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);
        $email = strtolower(trim($data['email']));

        $passwordWasReset = DB::transaction(function () use ($data, $email) {
            $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
            if (! $user) {
                return false;
            }

            $record = DB::table('password_reset_tokens')
                ->where('email', $user->email)
                ->lockForUpdate()
                ->first();

            if (
                ! $record ||
                Carbon::parse($record->created_at)->addMinutes(10)->isPast() ||
                ! Hash::check($data['token'], $record->token)
            ) {
                return false;
            }

            $user->forceFill(['password' => Hash::make($data['password'])])->save();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            event(new PasswordReset($user));

            return true;
        });

        if (! $passwordWasReset) {
            return response()->json([
                'message' => 'Your verification has expired. Request a new code and try again.',
            ], 422);
        }

        return response()->json(['message' => 'Your password has been reset.']);
    }

    private function passwordResetCodeRateLimitKey(string $email): string
    {
        return 'password-reset-code:'.hash('sha256', $email);
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
