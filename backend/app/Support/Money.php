<?php

namespace App\Support;

/** The existing tables store prices as strings like "Php 3,200.00" / "PHP 5,800". */
class Money
{
    public static function parse(?string $text): float
    {
        return (float) preg_replace('/[^0-9.]/', '', (string) $text);
    }

    public static function format(float $amount): string
    {
        return 'Php ' . number_format($amount, 2);
    }
}
