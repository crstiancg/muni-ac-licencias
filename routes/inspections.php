<?php

use App\Enums\Permission;
use App\Http\Controllers\InspectionCaseController;
use App\Http\Controllers\InspectionController;
use Illuminate\Support\Facades\Route;

// Field inspection of businesses (inspectors' phones).
Route::middleware(['auth', 'can:'.Permission::Inspections->value])
    ->prefix('fiscalizacion')
    ->name('inspections.')
    ->controller(InspectionController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('escanear', 'scan')->name('scan');
        Route::get('visitas/nueva', 'create')->name('create');
        Route::post('visitas', 'store')->name('store');
        Route::get('visitas/{inspection}', 'show')->name('show');
        Route::get('visitas/{inspection}/acta', 'print')->name('print');
        Route::get('fotos/{photo}', 'photo')->name('photo');
    });

// Follow-up of businesses without a licence.
Route::middleware(['auth', 'can:'.Permission::Inspections->value])
    ->prefix('fiscalizacion/casos')
    ->name('inspections.cases.')
    ->controller(InspectionCaseController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('{case}', 'show')->name('show');
        Route::post('{case}/notificar', 'notify')->name('notify');
        Route::post('{case}/cerrar', 'close')->name('close');
    });
