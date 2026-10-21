<?php

use App\Http\Controllers\UitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('parameters')->group(function () {
    Route::resource('uits', UitController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middlewareFor(['store', 'update'], 'precognitive');
});
