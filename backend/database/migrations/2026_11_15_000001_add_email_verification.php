<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Adds email verification for new sign-ups:
//   1. users.email_verified_at  (NULL = the customer has not proven they own the email yet)
//   2. email_otps               (hashed, short-lived one-time codes)
return new class extends Migration
{
    // Safe to run more than once: every step checks whether it is already done.
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('email_verified_at')->nullable();
            });
        }

        // Customers who signed up BEFORE this feature existed must keep being able to log in,
        // so they are treated as already verified. Only brand-new sign-ups need an OTP.
        DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => now()]);

        if (! Schema::hasTable('email_otps')) {
            Schema::create('email_otps', function (Blueprint $table) {
                $table->id();
                // users.id is a signed INT(11) in vehicle_rentals.sql, so this must be a signed
                // integer too (foreignId() would create an unsigned BIGINT and MySQL would reject the key).
                $table->integer('user_id')->nullable();
                $table->string('email', 191);
                $table->string('purpose', 30)->default('registration'); // registration | password_reset
                $table->string('otp_hash');                              // bcrypt hash, never the code itself
                // nullable on purpose: a NOT NULL timestamp can silently get ON UPDATE CURRENT_TIMESTAMP on
                // MariaDB/XAMPP, which would push the expiry forward every time `attempts` changes.
                $table->timestamp('expires_at')->nullable();
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('verified_at')->nullable();            // set once = code was used
                $table->timestamps();

                $table->index(['email', 'purpose']);
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }
    }

    // Rolling back removes the OTP table and the verified flag (accounts themselves are untouched).
    public function down(): void
    {
        Schema::dropIfExists('email_otps');

        if (Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('email_verified_at');
            });
        }
    }
};
