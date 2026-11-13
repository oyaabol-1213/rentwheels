<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\PasswordResetCode;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone')->nullable();
            $table->string('profile_image')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function test_reset_code_request_does_not_reveal_if_an_account_exists(): void
    {
        Notification::fake();

        $this->postJson('/api/forgot-password', ['email' => 'missing@example.test'])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a 6-digit reset code has been sent.');

        Notification::assertNothingSent();
    }

    public function test_customer_can_verify_a_code_and_reset_password(): void
    {
        Notification::fake();
        $user = User::create([
            'name' => 'Test Customer',
            'email' => 'customer@example.test',
            'password' => Hash::make('old-password'),
        ]);

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        $code = null;
        Notification::assertSentTo($user, PasswordResetCode::class, function (PasswordResetCode $notification) use (&$code) {
            $code = $notification->code;
            return true;
        });
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $verification = $this->postJson('/api/verify-password-reset-code', [
            'email' => $user->email,
            'code' => $code,
        ])->assertOk();

        $this->postJson('/api/reset-password', [
            'token' => $verification->json('reset_token'),
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk()->assertJsonPath('message', 'Your password has been reset.');

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }
}
