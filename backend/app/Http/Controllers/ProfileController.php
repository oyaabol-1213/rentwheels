<?php

namespace App\Http\Controllers;

use App\Support\Accounts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    // Update the signed-in account's profile details and optional photo.
    public function update(Request $request)
    {
        $account = Accounts::current();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'profile_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
        ], [
            'name.required' => 'Name is required.',
            'profile_image.mimes' => 'Please upload a JPG, PNG, GIF, or WEBP image.',
            'profile_image.max' => 'Profile image must be 5 MB or smaller.',
        ]);

        $account->name = trim($data['name']);
        $account->phone = isset($data['phone']) ? trim($data['phone']) : null;

        if ($request->hasFile('profile_image')) {
            $file = $request->file('profile_image');
            $prefix = Accounts::isAdmin($account) ? 'admin_' : 'profile_';
            $fileName = $prefix . $account->id . '_' . time() . '.' . $file->extension();
            $file->move(public_path('uploads/profiles'), $fileName);   // same folder the PHP app used
            $account->profile_image = 'uploads/profiles/' . $fileName;
        }

        $account->save();

        return response()->json(['user' => Accounts::payload($account)]);
    }

    // Verify the current password before saving a replacement.
    public function password(Request $request)
    {
        $account = Accounts::current();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6'],
            'confirm_password' => ['required', 'same:new_password'],
        ], [
            'new_password.min' => 'New password must be at least 6 characters.',
            'confirm_password.same' => 'New password and confirm password do not match.',
        ]);

        if (! Hash::check($data['current_password'], $account->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $account->password = Hash::make($data['new_password']);
        $account->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
