<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PublicVerificationController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Public licence verification from the printed QR (no login).
Route::get('v/{token}', [PublicVerificationController::class, 'show'])
    ->where('token', '[A-Za-z0-9]{6,16}')
    ->middleware('throttle:60,1')
    ->name('verify');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/parameters.php';
require __DIR__.'/taxpayers.php';
