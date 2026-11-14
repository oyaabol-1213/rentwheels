<?php

namespace App\Http\Controllers;

use App\Models\AdminAccount;
use App\Models\User;
use App\Notifications\PasswordResetCode;
use App\Services\EmailOtpService;
use App\Support\Accounts;
use Illuminate\Support\Carbon;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private EmailOtpService $otps)
    {
    }

    // Session restoration and customer/admin authentication endpoints.
    // Restore the account currently authenticated by either session guard.
    public function me()
    {
        $account = Accounts::current();
        if ($account instanceof User && ! $account->hasVerifiedEmail()) {
            Auth::guard('web')->logout();
            $account = null;
        }
        return response()->json(['user' => $account ? Accounts::payload($account) : null]);
    }

    /** Same lookup order as the old login.php: admin_accounts first, then users. */
    // Start the matching customer or admin session after checking the password.
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

            // Right password, but the customer never verified their email: no session is created.
            // A fresh code is sent (best effort; the verify page also has a Resend button).
            if ($source['guard'] === 'web' && ! $account->hasVerifiedEmail()) {
                $this->otps->issue($account);

                return response()->json([
                    'message' => 'Please verify your email first. Enter the 6-digit code we sent you.',
                    'requires_verification' => true,
                    'email' => $account->email,
                ], 403);
            }

            $this->signOutEverywhere();
            Auth::guard($source['guard'])->login($account);
            $request->session()->regenerate();

            return response()->json(['user' => Accounts::payload($account)]);
        }

        return response()->json(['message' => 'Email not found'], 422);
    }

    // Create (or refresh) an UNVERIFIED customer account and email a 6-digit code.
    // No session is started here: the customer must verify the code first.
    public function signup(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:191', 'unique:admin_accounts,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:30'],
        ], [
            'email.unique' => 'Email already exists',
            'required' => 'Missing fields',
        ]);

        $email = trim($data['email']);
        $existing = User::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();

        if ($existing && $existing->hasVerifiedEmail()) {
            throw ValidationException::withMessages(['email' => 'Email already exists']);
        }

        // An UNVERIFIED account with this email means nobody has proven they own the address yet,
        // so this sign-up takes it over instead of locking the real owner out of their own email.
        $user = DB::transaction(function () use ($existing, $data, $email) {
            $fields = [
                'name' => trim($data['name']),
                'password' => Hash::make($data['password']),
                'phone' => $data['phone'] ?? null,
            ];

            if ($existing) {
                $existing->forceFill($fields)->save();

                return $existing;
            }

            return User::create($fields + ['email' => $email]);
        });

        $status = $this->otps->issue($user);

        if ($status === EmailOtpService::FAILED) {
            return response()->json([
                'message' => "We couldn't send the verification email right now. Please check your email address and try again in a moment.",
            ], 503);
        }
        if ($status === EmailOtpService::LIMITED) {
            return response()->json(['message' => 'Too many verification emails were requested. Please try again later.'], 429);
        }

        return response()->json([
            'message' => 'Account created. Enter the 6-digit code we emailed you to verify your email address.',
            'requires_verification' => true,
            'email' => $user->email,
            'expires_in' => EmailOtpService::TTL_MINUTES * 60,
            'resend_in' => EmailOtpService::RESEND_COOLDOWN_SECONDS,
        ], 201);
    }

    // Check the emailed sign-up code. On success the account becomes verified and the customer is signed in.
    public function verifyEmailOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:191'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $result = $this->otps->verify($data['email'], $data['code']);

        if ($result['status'] === EmailOtpService::VERIFIED && $result['user']) {
            $this->signOutEverywhere();
            Auth::guard('web')->login($result['user']);
            $request->session()->regenerate();

            return response()->json([
                'message' => 'Email verified. Welcome to RentWheels!',
                'user' => Accounts::payload($result['user']),
            ]);
        }

        return match ($result['status']) {
            EmailOtpService::EXPIRED => response()->json([
                'message' => 'This code has expired. Please request a new one.',
                'code' => 'expired',
            ], 422),
            EmailOtpService::LOCKED => response()->json([
                'message' => 'Too many incorrect attempts. Please request a new code.',
                'code' => 'locked',
            ], 429),
            default => response()->json([
                'message' => $result['attempts_left'] !== null
                    ? "That code is incorrect. {$result['attempts_left']} attempt(s) left."
                    : 'That code is invalid or has expired.',
                'attempts_left' => $result['attempts_left'],
            ], 422),
        };
    }

    // Send a new sign-up code (the old one stops working). The answer is the same whether or not the
    // email exists, so this endpoint cannot be used to find out who has an account.
    public function resendEmailOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:191'],
        ]);
        $user = User::whereRaw('LOWER(email) = ?', [strtolower(trim($data['email']))])->first();

        if ($user && ! $user->hasVerifiedEmail()) {
            $status = $this->otps->issue($user);

            if ($status === EmailOtpService::FAILED) {
                return response()->json(['message' => "We couldn't send the email right now. Please try again in a moment."], 503);
            }
            if ($status === EmailOtpService::LIMITED) {
                return response()->json(['message' => 'Too many codes were requested. Please try again later.'], 429);
            }
        }

        return response()->json([
            'message' => 'If that account is waiting for verification, a new 6-digit code has been sent.',
            'resend_in' => EmailOtpService::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    // Send a short-lived reset code without revealing whether an email is registered.
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

    // Verify the email code and exchange it for a temporary password-reset token.
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

    // Change the password once and invalidate the verified reset token.
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

    // Create a stable, non-plaintext key for limiting verification attempts per email.
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

    // Ensure only one account guard remains signed in for the current session.
    private function signOutEverywhere(): void
    {
        Auth::guard('admin')->logout();
        Auth::guard('web')->logout();
    }
}
