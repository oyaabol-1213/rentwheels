<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Support\Accounts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $limit = min(max((int) $request->query('limit', 6), 1), 50);

        return response()->json([
            'reviews' => Review::orderByDesc('created_at')->orderByDesc('id')->limit($limit)
                ->get(['id', 'reviewer_name', 'rating', 'review_text', 'created_at']),
        ]);
    }

    public function store(Request $request)
    {
        // reviews.user_id has a foreign key to users, so only customers can review.
        if (Accounts::isAdmin(Accounts::current())) {
            return response()->json(['message' => "Admin accounts can't write reviews."], 403);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'review_text' => ['required', 'string', 'max:2000'],
        ], ['required' => 'Please provide a rating and review.']);

        $user = Auth::guard('web')->user();
        Review::create([
            'user_id' => $user->id,
            'reviewer_name' => $user->name,
            'rating' => $data['rating'],
            'review_text' => trim($data['review_text']),
        ]);

        return response()->json(['message' => 'success'], 201);
    }
}
