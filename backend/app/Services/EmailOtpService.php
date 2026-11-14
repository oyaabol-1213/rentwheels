<?php

namespace App\Services;

use App\Models\EmailOtp;
use App\Models\User;
use App\Notifications\EmailVerificationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * All the rules for emailed one-time codes live here so the controller stays small:
 * hashing, 5-minute expiry, 5 attempts per code, resend cooldown and "old code dies on resend".
 */
class EmailOtpService
{
    public const PURPOSE_REGISTRATION = 'registration';

    public const TTL_MINUTES = 5;
    public const MAX_ATTEMPTS = 5;
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_SENDS_PER_HOUR = 5;

    // Results of issue()
    public const SENT = 'sent';
    public const COOLDOWN = 'cooldown'; // a code was sent less than 60 seconds ago, so nothing new was sent
    public const LIMITED = 'limited';   // too many codes requested for this email this hour
    public const FAILED = 'failed';     // the email server rejected or could not send the message

    // Results of verify()
    public const VERIFIED = 'verified';
    public const INVALID = 'invalid';   // wrong digits, or there is no active code for this email
    public const EXPIRED = 'expired';
    public const LOCKED = 'locked';     // 5 wrong attempts used up, a new code is needed

    /** Create a fresh code for the user, invalidate older ones, and email it. Returns one of the issue results. */
    public function issue(User $user, string $purpose = self::PURPOSE_REGISTRATION): string
    {
        $email = strtolower(trim($user->email));
        $limiterKey = 'email-otp-send:'.$purpose.':'.hash('sha256', $email);

        $latest = EmailOtp::where('email', $email)->where('purpose', $purpose)->latest('id')->first();
        if ($latest && $latest->created_at->copy()->addSeconds(self::RESEND_COOLDOWN_SECONDS)->isFuture()) {
            return self::COOLDOWN;
        }
        if (RateLimiter::tooManyAttempts($limiterKey, self::MAX_SENDS_PER_HOUR)) {
            return self::LIMITED;
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $otp = DB::transaction(function () use ($user, $email, $purpose, $code) {
            // Any earlier unused code stops working the moment a new one exists.
            EmailOtp::where('email', $email)->where('purpose', $purpose)->whereNull('verified_at')->delete();

            return EmailOtp::create([
                'user_id' => $user->id,
                'email' => $email,
                'purpose' => $purpose,
                'otp_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(self::TTL_MINUTES),
                'attempts' => 0,
            ]);
        });

        try {
            $user->notify(new EmailVerificationCode($code, self::TTL_MINUTES));
        } catch (\Throwable $e) {
            // The code was never delivered, so drop it and let the person try again right away.
            // Only the exception class and user id are logged, never the code.
            $otp->delete();
            Log::error('Verification email could not be sent.', [
                'user_id' => $user->id,
                'exception' => get_class($e),
            ]);

            return self::FAILED;
        }

        RateLimiter::hit($limiterKey, 3600);

        return self::SENT;
    }

    /**
     * Check a submitted code. Runs in one transaction with a row lock, so two requests at the same
     * time cannot both use the same code or skip the attempt counter.
     *
     * @return array{status: string, attempts_left: int|null, user: User|null}
     */
    public function verify(string $email, string $code, string $purpose = self::PURPOSE_REGISTRATION): array
    {
        $email = strtolower(trim($email));

        return DB::transaction(function () use ($email, $code, $purpose) {
            $otp = EmailOtp::where('email', $email)
                ->where('purpose', $purpose)
                ->whereNull('verified_at')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $otp) {
                return ['status' => self::INVALID, 'attempts_left' => null, 'user' => null];
            }
            if (! $otp->expires_at || $otp->expires_at->isPast()) {
                return ['status' => self::EXPIRED, 'attempts_left' => null, 'user' => null];
            }
            if ($otp->attempts >= self::MAX_ATTEMPTS) {
                return ['status' => self::LOCKED, 'attempts_left' => 0, 'user' => null];
            }

            if (! Hash::check($code, $otp->otp_hash)) {
                $otp->increment('attempts');
                $left = max(0, self::MAX_ATTEMPTS - $otp->attempts);

                return ['status' => $left === 0 ? self::LOCKED : self::INVALID, 'attempts_left' => $left, 'user' => null];
            }

            // Correct code: burn it so it can never be used again, and mark the account verified.
            $otp->forceFill(['verified_at' => now()])->save();

            $user = null;
            if ($purpose === self::PURPOSE_REGISTRATION) {
                $user = User::whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
                if ($user && $user->email_verified_at === null) {
                    $user->forceFill(['email_verified_at' => now()])->save();
                }
            }

            return ['status' => self::VERIFIED, 'attempts_left' => null, 'user' => $user];
        });
    }
}
