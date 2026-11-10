<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $table = 'reviews';
    const UPDATED_AT = null;
    protected $fillable = ['user_id', 'reviewer_name', 'rating', 'review_text'];

    public function user() { return $this->belongsTo(User::class); }
}
