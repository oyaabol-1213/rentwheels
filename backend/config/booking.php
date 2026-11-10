<?php

return [
    // Server-side base rates for bookable named Tour Van routes.
    'tour_routes' => [
        'Mayon Highlights Loop' => 6200,
        'Legazpi Heritage and View Deck Tour' => 5800,
        'Donsol Nature Escape' => 7400,
        'Sorsogon Heritage Day Trip' => 7000,
    ],
    // Add-on labels and prices used to calculate tour booking totals.
    'addons' => [
        'pickup' => [
            'label' => 'Hotel or airport pickup',
            'price' => 500,
            'unit' => 'per booking',
        ],
        'extra_stop' => [
            'label' => 'Extra tour stop',
            'price' => 500,
            'unit' => 'per stop',
        ],
    ],
];
