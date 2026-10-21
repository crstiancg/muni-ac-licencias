<?php

use App\Http\Controllers\UitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('parameters')->group(function () {
    Route::resource('uits', UitController::class)
        ->except('show')
        ->middlewareFor(['store', 'update'], 'precognitive');
});
