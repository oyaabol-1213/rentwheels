<?php

use Illuminate\Support\Facades\Route;

// Production: serve the built React app (copied into public/) for every non-API path.
Route::get('/{any?}', function () {
    $index = public_path('index.html');
    abort_unless(file_exists($index), 404, 'Frontend build not found. Run `npm run build` in /frontend.');
    return response()->file($index);
})->where('any', '^(?!api|uploads|needs|css).*$');
