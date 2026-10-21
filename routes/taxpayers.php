<?php

use App\Http\Controllers\TaxpayerController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('taxpayers/lookup', [TaxpayerController::class, 'lookup'])
        ->middleware('throttle:30,1')
        ->name('taxpayers.lookup');

    Route::resource('taxpayers', TaxpayerController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middlewareFor(['store', 'update'], 'precognitive');
});
