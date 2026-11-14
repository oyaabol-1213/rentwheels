<?php

namespace Tests\Feature;

use App\Models\EmailOtp;
use App\Models\User;
use App\Notifications\EmailVerificationCode;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/** Sign-up email OTP: unverified accounts, code rules (hash, expiry, attempts, resend) and login gating. */
class EmailVerificationTest extends TestCase
{
    /** The migration class is loaded once per process (requiring the same file twice would redeclare it). */
    private static $migration;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['email_otps', 'admin_accounts', 'users'] as $table) {
            Schema::dropIfExists($table);
        }

        // The tables as they exist in vehicle_rentals.sql BEFORE this feature (no email_verified_at yet).
        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone')->nullable();
            $table->string('profile_image')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('admin_accounts', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->string('phone')->nullable();
            $table->string('profile_image')->nullable();
            $table->string('role')->default('admin');
            $table->timestamp('created_at')->nullable();
        });

        // Run the REAL migration, so these tests also prove it builds the structure the code expects.
        $this->migration()->up();

        Notification::fake();
    }

    private function migration()
    {
        return self::$migration ??= require database_path('migrations/2026_11_15_000001_add_email_verification.php');
    }

    private function signup(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/signup', array_merge([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.test',
            'password' => 'secret123',
            'phone' => '09123456789',
        ], $overrides));
    }

    private function verify(string $email, string $code): TestResponse
    {
        return $this->postJson('/api/verify-email-otp', ['email' => $email, 'code' => $code]);
    }

    /** The newest code emailed to this user (read from the faked notification, never from an API response). */
    private function lastCode(User $user): string
    {
        $code = null;
        Notification::assertSentTo($user, EmailVerificationCode::class, function (EmailVerificationCode $notification) use (&$code) {
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    private function wrongCode(string $real): string
    {
        return $real === '000000' ? '111111' : '000000';
    }

    /** Sign up and return [user, code], the starting point of most tests. */
    private function registered(): array
    {
        $this->signup()->assertCreated();
        $user = User::firstOrFail();

        return [$user, $this->lastCode($user)];
    }

    // 1. Successful registration -------------------------------------------------------------------

    public function test_signup_creates_an_unverified_account_and_emails_a_hashed_otp(): void
    {
        $response = $this->signup()
            ->assertCreated()
            ->assertJsonPath('requires_verification', true)
            ->assertJsonPath('email', 'juan@example.test')
            ->assertJsonPath('resend_in', 60);

        $user = User::where('email', 'juan@example.test')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertGuest('web'); // no session until the code is verified

        $code = $this->lastCode($user);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertStringNotContainsString($code, $response->getContent()); // code never appears in the API response

        $otp = EmailOtp::firstOrFail();
        $this->assertNotSame($code, $otp->otp_hash);          // only a hash is stored
        $this->assertTrue(Hash::check($code, $otp->otp_hash));
        $this->assertSame('registration', $otp->purpose);
        $this->assertSame($user->id, $otp->user_id);
        $this->assertSame(0, $otp->attempts);
        $this->assertTrue($otp->expires_at->between(now()->addMinutes(4), now()->addMinutes(5)->addSecond()));
    }

    public function test_correct_otp_verifies_the_email_and_signs_the_customer_in(): void
    {
        [$user, $code] = $this->registered();

        $this->verify($user->email, $code)
            ->assertOk()
            ->assertJsonPath('message', 'Email verified. Welcome to RentWheels!')
            ->assertJsonPath('user.email', $user->email);

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertNotNull(EmailOtp::firstOrFail()->verified_at);
        $this->assertAuthenticated('web');
    }

    // 2. Existing email ----------------------------------------------------------------------------

    public function test_signup_is_rejected_when_a_verified_account_already_uses_the_email(): void
    {
        $existing = User::create(['name' => 'Taken', 'email' => 'taken@example.test', 'password' => Hash::make('secret123')]);
        $existing->forceFill(['email_verified_at' => now()])->save();

        $this->signup(['email' => 'taken@example.test'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Email already exists');

        // Same email in different letter case is still the same email.
        $this->signup(['email' => 'TAKEN@example.test'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Email already exists');

        Notification::assertNothingSent();
        $this->assertSame(1, User::count());
    }

    public function test_signing_up_again_with_an_unverified_email_takes_over_that_unverified_account(): void
    {
        $this->signup(['name' => 'Someone Else', 'password' => 'imposter99'])->assertCreated();
        $this->travel(2)->minutes(); // past the 60-second resend cooldown

        $this->signup(['name' => 'Real Owner', 'password' => 'realpass99'])->assertCreated();

        $this->assertSame(1, User::count()); // no duplicate account
        $user = User::firstOrFail();
        $this->assertSame('Real Owner', $user->name);
        $this->assertTrue(Hash::check('realpass99', $user->password));
        $this->assertSame(1, EmailOtp::count()); // the first code was discarded
        Notification::assertSentToTimes($user, EmailVerificationCode::class, 2);
    }

    // 3-6. Invalid / expired / too many attempts / reuse ------------------------------------------

    public function test_wrong_otp_is_rejected_and_the_attempt_is_counted(): void
    {
        [$user, $code] = $this->registered();

        $this->verify($user->email, $this->wrongCode($code))
            ->assertStatus(422)
            ->assertJsonPath('attempts_left', 4);

        $this->assertSame(1, EmailOtp::firstOrFail()->attempts);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertGuest('web');
    }

    public function test_malformed_code_is_rejected_by_validation(): void
    {
        [$user] = $this->registered();

        $this->verify($user->email, 'abc123')->assertStatus(422)->assertJsonValidationErrors('code');
        $this->verify($user->email, '12345')->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_expired_otp_is_rejected(): void
    {
        [$user, $code] = $this->registered();

        $this->travel(6)->minutes(); // codes live for 5 minutes

        $this->verify($user->email, $code)
            ->assertStatus(422)
            ->assertJsonPath('code', 'expired');

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_otp_is_locked_after_five_wrong_attempts_even_for_the_correct_code(): void
    {
        [$user, $code] = $this->registered();
        $bad = $this->wrongCode($code);

        foreach ([4, 3, 2, 1] as $left) {
            $this->verify($user->email, $bad)->assertStatus(422)->assertJsonPath('attempts_left', $left);
        }

        $this->verify($user->email, $bad)->assertStatus(429)->assertJsonPath('code', 'locked'); // 5th wrong attempt
        $this->verify($user->email, $code)->assertStatus(429)->assertJsonPath('code', 'locked'); // right code is too late

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertGuest('web');
    }

    public function test_a_used_otp_cannot_be_used_again(): void
    {
        [$user, $code] = $this->registered();

        $this->verify($user->email, $code)->assertOk();
        $this->postJson('/api/logout')->assertOk();

        $this->verify($user->email, $code)
            ->assertStatus(422)
            ->assertJsonPath('message', 'That code is invalid or has expired.');
        $this->assertGuest('web');
    }

    // 6. Resend ------------------------------------------------------------------------------------

    public function test_resend_issues_a_new_code_and_the_previous_one_stops_working(): void
    {
        [$user, $oldCode] = $this->registered();
        $this->travel(61)->seconds();

        $this->postJson('/api/resend-email-otp', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('resend_in', 60);

        Notification::assertSentToTimes($user, EmailVerificationCode::class, 2);
        $newCode = $this->lastCode($user);
        $this->assertNotSame($oldCode, $newCode);
        $this->assertSame(1, EmailOtp::count()); // the old record is gone, not just ignored

        $this->verify($user->email, $oldCode)->assertStatus(422);
        $this->verify($user->email, $newCode)->assertOk();
    }

    public function test_resend_is_ignored_during_the_60_second_cooldown(): void
    {
        [$user] = $this->registered();

        $this->postJson('/api/resend-email-otp', ['email' => $user->email])->assertOk();

        Notification::assertSentToTimes($user, EmailVerificationCode::class, 1); // still only the sign-up email
    }

    public function test_resend_does_not_reveal_whether_an_email_has_an_account(): void
    {
        $this->postJson('/api/resend-email-otp', ['email' => 'nobody@example.test'])
            ->assertOk()
            ->assertJsonPath('message', 'If that account is waiting for verification, a new 6-digit code has been sent.');

        Notification::assertNothingSent();
    }

    // 10-11. Login gating --------------------------------------------------------------------------

    public function test_unverified_customer_cannot_log_in_until_the_email_is_verified(): void
    {
        [$user] = $this->registered();
        $this->travel(2)->minutes();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertStatus(403)
            ->assertJsonPath('requires_verification', true)
            ->assertJsonPath('email', $user->email);

        $this->assertGuest('web');
        Notification::assertSentToTimes($user, EmailVerificationCode::class, 2); // login sent a fresh code

        $this->verify($user->email, $this->lastCode($user))->assertOk();
        $this->postJson('/api/logout')->assertOk();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);
        $this->assertAuthenticated('web');
    }

    public function test_wrong_password_on_an_unverified_account_does_not_reveal_its_status(): void
    {
        $this->registered();

        $this->postJson('/api/login', ['email' => 'juan@example.test', 'password' => 'not-the-password'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Incorrect password');
    }

    public function test_an_unverified_account_cannot_use_protected_routes_even_with_a_session(): void
    {
        $user = User::create(['name' => 'Pending', 'email' => 'pending@example.test', 'password' => Hash::make('secret123')]);

        $this->actingAs($user, 'web')
            ->getJson('/api/my-bookings')
            ->assertStatus(403)
            ->assertJsonPath('requires_verification', true);

        $this->actingAs($user, 'web')
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user', null);
    }

    // 12. Email delivery failure -------------------------------------------------------------------

    public function test_email_delivery_failure_returns_503_and_leaves_no_usable_code(): void
    {
        $this->app->instance(Dispatcher::class, new class {
            public function send($notifiables, $notification): void
            {
                throw new \RuntimeException('SMTP server is down');
            }

            public function sendNow($notifiables, $notification, ?array $channels = null): void
            {
                throw new \RuntimeException('SMTP server is down');
            }
        });

        $this->signup()->assertStatus(503);

        $this->assertSame(0, EmailOtp::count());                    // the undelivered code was discarded
        $this->assertNull(User::firstOrFail()->email_verified_at);  // account stays unverified
        $this->assertGuest('web');
    }

    // Migration ------------------------------------------------------------------------------------

    public function test_migration_marks_customers_who_signed_up_before_this_feature_as_verified(): void
    {
        // Put the database back to the "before" state, then add a customer who already exists.
        Schema::dropIfExists('email_otps');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_verified_at');
        });
        DB::table('users')->insert([
            'name' => 'Old Customer',
            'email' => 'old@example.test',
            'password' => Hash::make('secret123'),
            'created_at' => now(),
        ]);

        $this->migration()->up();

        $this->assertNotNull(DB::table('users')->where('email', 'old@example.test')->value('email_verified_at'));
        $this->postJson('/api/login', ['email' => 'old@example.test', 'password' => 'secret123'])->assertOk();
    }
}
