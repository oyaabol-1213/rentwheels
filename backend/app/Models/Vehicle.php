<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/** Existing vehicle fleet table and optional image-column compatibility checks. */
class Vehicle extends Model
{
    protected $table = 'vehicles';
    const UPDATED_AT = null;
    protected $fillable = ['name', 'type', 'category', 'price_per_day', 'status', 'image', 'details'];

    public static function listingColumns(): array
    {
        $columns = ['id', 'name', 'type', 'category', 'price_per_day', 'status'];

        if (Schema::hasColumn((new static)->getTable(), 'image')) {
            $columns[] = 'image';
        }

        if (Schema::hasColumn((new static)->getTable(), 'details')) {
            $columns[] = 'details';
        }

        return $columns;
    }

    public static function hasImageColumn(): bool
    {
        return Schema::hasColumn((new static)->getTable(), 'image');
    }
}
