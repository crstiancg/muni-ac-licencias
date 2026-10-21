<?php

use App\Http\Controllers\EstablishmentController;
use App\Http\Controllers\LicenseController;
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

    Route::controller(ProcedureController::class)->prefix('procedures/{procedure}')->name('procedures.')->group(function () {
        Route::post('cancel', 'cancel')->name('cancel');
        Route::post('payment-order', 'issuePaymentOrder')->name('payment-order.store');
        Route::get('payment-order/print', 'printPaymentOrder')->name('payment-order.print');
        Route::post('payment', 'registerPayment')->name('payment.store');
        Route::post('documents', 'issueDocuments')->name('documents.store');
    });

    Route::resource('procedures', ProcedureController::class)
        ->except('destroy')
        ->middlewareFor(['store', 'update'], 'precognitive');

    Route::get('licenses/export', [LicenseController::class, 'export'])->name('licenses.export');
    Route::get('licenses/{license}/print', [LicenseController::class, 'print'])->name('licenses.print');
    Route::post('licenses/{license}/status', [LicenseController::class, 'changeStatus'])->name('licenses.status');
    Route::resource('licenses', LicenseController::class)->only(['index', 'show']);
});
