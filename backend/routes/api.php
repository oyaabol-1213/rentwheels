<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\VehicleController;
use Illuminate\Support\Facades\Route;

// "web" gives us session cookies + CSRF (XSRF-TOKEN cookie) for the React SPA.
Route::middleware('web')->group(function () {
    // Session / identity
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/signup', [AuthController::class, 'signup'])->middleware('throttle:10,1');
    Route::post('/verify-email-otp', [AuthController::class, 'verifyEmailOtp'])->middleware('throttle:10,1');
    Route::post('/resend-email-otp', [AuthController::class, 'resendEmailOtp'])->middleware('throttle:5,1');
    Route::post('/forgot-password', [AuthController::class, 'sendPasswordResetCode'])->middleware('throttle:10,1');
    Route::post('/verify-password-reset-code', [AuthController::class, 'verifyPasswordResetCode'])->middleware('throttle:10,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
    Route::post('/logout', [AuthController::class, 'logout']);

    // Public fleet, vehicle availability, reviews, and Tour Van booking endpoints.
    Route::get('/vehicles', [VehicleController::class, 'index']);
    Route::get('/vehicles/{vehicle}/availability', [VehicleController::class, 'availability']);
    Route::get('/reviews', [ReviewController::class, 'index']);

    // Tour bookings accept guests too (user_id is nullable in the table)
    Route::get('/tour-bookings/availability', [BookingController::class, 'tourAvailability']);
    Route::post('/tour-bookings', [BookingController::class, 'storeTour']);

    // Customer account, profile, review, and booking endpoints.
    Route::middleware('account')->group(function () {
        Route::get('/my-bookings', [BookingController::class, 'myBookings']);
        Route::post('/vehicle-bookings', [BookingController::class, 'storeVehicle']);
        Route::patch('/vehicle-bookings/{booking}/cancel', [BookingController::class, 'cancelVehicleBooking']);
        Route::patch('/tour-bookings/{booking}/cancel', [BookingController::class, 'cancelTourBooking']);
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::post('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/password', [ProfileController::class, 'password']);
    });

    // Admin area
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::patch('/vehicle-bookings/{booking}/status', [AdminController::class, 'updateVehicleBookingStatus']);
        Route::patch('/tour-bookings/{booking}/status', [AdminController::class, 'updateTourBookingStatus']);

        Route::middleware('super')->group(function () {
            Route::post('/admins', [AdminController::class, 'storeAdmin']);
            Route::post('/vehicles', [AdminController::class, 'storeVehicle']);
            Route::patch('/vehicles/{vehicle}/status', [AdminController::class, 'updateVehicleStatus']);
            Route::delete('/vehicles/{vehicle}', [AdminController::class, 'destroyVehicle']);
        });
    });
});
