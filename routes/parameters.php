<?php

use App\Enums\Permission;
use App\Http\Controllers\ProcedureTypeController;
use App\Http\Controllers\UitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'can:'.Permission::Parameters->value])->prefix('parameters')->group(function () {
    Route::resource('uits', UitController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middlewareFor(['store', 'update'], 'precognitive');

    Route::resource('procedure-types', ProcedureTypeController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middlewareFor(['store', 'update'], 'precognitive');
});
