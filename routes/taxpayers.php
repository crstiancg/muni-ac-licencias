<?php

use App\Enums\Permission;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\EstablishmentController;
use App\Http\Controllers\ItseCertificateController;
use App\Http\Controllers\LicenseController;
use App\Http\Controllers\MarketController;
use App\Http\Controllers\MarketStallController;
use App\Http\Controllers\PaymentOrderController;
use App\Http\Controllers\ProcedureController;
use App\Http\Controllers\RevenueReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TaxpayerController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

$view = 'can:'.Permission::ProceduresView->value;
$manage = 'can:'.Permission::ProceduresManage->value;
$collect = 'can:'.Permission::Payments->value;

Route::middleware(['auth', 'verified'])->group(function () use ($view, $manage, $collect) {
    // Shared lookups used by forms of several modules.
    Route::get('taxpayers/lookup', [TaxpayerController::class, 'lookup'])
        ->middleware('throttle:30,1')
        ->name('taxpayers.lookup');
    Route::get('taxpayers/search', [TaxpayerController::class, 'search'])->name('taxpayers.search');
    Route::get('taxpayers/{taxpayer}/establishments', [TaxpayerController::class, 'establishments'])->name('taxpayers.establishments');
    Route::get('licenses/search', [LicenseController::class, 'search'])->name('licenses.search');

    // Whoever issues an order (procedures, markets, Caja) can see and print it.
    Route::get('payment-orders/{paymentOrder}/print', [PaymentOrderController::class, 'print'])->name('payment-orders.print');
    Route::get('payment-orders/{paymentOrder}', [PaymentOrderController::class, 'show'])
        ->whereNumber('paymentOrder')
        ->name('payment-orders.show');

    Route::resource('taxpayers', TaxpayerController::class)
        ->middlewareFor(['index', 'show'], $view)
        ->middlewareFor(['create', 'edit', 'destroy'], $manage)
        ->middlewareFor(['store', 'update'], [$manage, 'precognitive']);

    Route::resource('establishments', EstablishmentController::class)
        ->except('show')
        ->middlewareFor('index', $view)
        ->middlewareFor(['create', 'edit', 'destroy'], $manage)
        ->middlewareFor(['store', 'update'], [$manage, 'precognitive']);

    Route::controller(ProcedureController::class)->prefix('procedures/{procedure}')->name('procedures.')->group(function () use ($view, $manage, $collect) {
        Route::post('cancel', 'cancel')->middleware($manage)->name('cancel');
        Route::post('payment-order', 'issuePaymentOrder')->middleware($manage)->name('payment-order.store');
        Route::get('payment-order/print', 'printPaymentOrder')->middleware($view)->name('payment-order.print');
        Route::post('payment', 'registerPayment')->middleware($collect)->name('payment.store');
        Route::post('documents', 'issueDocuments')->middleware($manage)->name('documents.store');
    });

    Route::resource('procedures', ProcedureController::class)
        ->except('destroy')
        ->middlewareFor(['index', 'show'], $view)
        ->middlewareFor(['create', 'edit'], $manage)
        ->middlewareFor(['store', 'update'], [$manage, 'precognitive']);

    Route::middleware($view)->group(function () {
        Route::get('licenses/export', [LicenseController::class, 'export'])->name('licenses.export');
        Route::get('licenses/{license}/print', [LicenseController::class, 'print'])->name('licenses.print');
        Route::resource('licenses', LicenseController::class)->only(['index', 'show']);
    });
    Route::post('licenses/{license}/status', [LicenseController::class, 'changeStatus'])->middleware($manage)->name('licenses.status');

    Route::middleware($collect)->group(function () {
        Route::post('payment-orders/{paymentOrder}/payment', [PaymentOrderController::class, 'registerPayment'])->name('payment-orders.payment');
        Route::post('payment-orders/{paymentOrder}/cancel', [PaymentOrderController::class, 'cancel'])->name('payment-orders.cancel');
        Route::resource('payment-orders', PaymentOrderController::class)->only(['index', 'create', 'store']);
    });

    Route::middleware('can:'.Permission::Reports->value)->group(function () {
        Route::get('reports/revenue', [RevenueReportController::class, 'index'])->name('reports.revenue');
        Route::get('reports/revenue/export', [RevenueReportController::class, 'export'])->name('reports.revenue.export');
    });

    Route::middleware('can:'.Permission::Itse->value)->group(function () {
        Route::post('itse/{certificate}/revoke', [ItseCertificateController::class, 'revoke'])->name('itse.revoke');
        Route::resource('itse', ItseCertificateController::class)
            ->only(['index', 'create', 'store'])
            ->middlewareFor('store', 'precognitive');
    });

    Route::middleware('can:'.Permission::Markets->value)->group(function () {
        Route::post('markets/{market}/charges', [MarketController::class, 'generateCharges'])->name('markets.charges');
        Route::resource('markets', MarketController::class)->only(['index', 'store', 'update', 'show']);
        Route::post('market-stalls/{marketStall}/bill', [MarketStallController::class, 'bill'])->name('market-stalls.bill');
        Route::resource('market-stalls', MarketStallController::class)->except(['index', 'destroy']);
    });

    Route::get('audit', [AuditController::class, 'index'])->middleware('can:'.Permission::Audit->value)->name('audit.index');

    Route::resource('users', UserController::class)
        ->except(['show', 'destroy'])
        ->middleware('can:'.Permission::Users->value)
        ->middlewareFor(['store', 'update'], 'precognitive');

    Route::resource('roles', RoleController::class)
        ->except('show')
        ->middleware('can:'.Permission::Users->value)
        ->middlewareFor(['store', 'update'], 'precognitive');
});
