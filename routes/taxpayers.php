<?php

use App\Http\Controllers\EstablishmentController;
use App\Http\Controllers\ProcedureController;
use App\Http\Controllers\TaxpayerController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('taxpayers/lookup', [TaxpayerController::class, 'lookup'])
        ->middleware('throttle:30,1')
        ->name('taxpayers.lookup');

    Route::get('taxpayers/search', [TaxpayerController::class, 'search'])
        ->name('taxpayers.search');

    Route::get('taxpayers/{taxpayer}/establishments', [TaxpayerController::class, 'establishments'])
        ->name('taxpayers.establishments');

    Route::resource('taxpayers', TaxpayerController::class)
        ->middlewareFor(['store', 'update'], 'precognitive');

    Route::resource('establishments', EstablishmentController::class)
        ->except('show')
        ->middlewareFor(['store', 'update'], 'precognitive');

    Route::post('procedures/{procedure}/cancel', [ProcedureController::class, 'cancel'])
        ->name('procedures.cancel');

    Route::resource('procedures', ProcedureController::class)
        ->except('destroy')
        ->middlewareFor(['store', 'update'], 'precognitive');
});
