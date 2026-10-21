<?php

namespace App\Http\Controllers;

use App\Enums\LicenseStatus;
use App\Enums\PaymentOrderStatus;
use App\Enums\ProcedureStatus;
use App\Models\License;
use App\Models\PaymentOrder;
use App\Models\Procedure;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Work pending at each step of the flow, this month's revenue and
     * licences in force.
     */
    public function __invoke(): Response
    {
        // New procedures only; imported history (year 0) is not work in progress.
        $pending = Procedure::query()
            ->where('year', '>', 0)
            ->whereIn('status', [ProcedureStatus::Registered, ProcedureStatus::Liquidated, ProcedureStatus::Paid])
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $paidThisMonth = PaymentOrder::query()
            ->where('status', PaymentOrderStatus::Paid)
            ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()]);

        return Inertia::render('dashboard', [
            'stats' => [
                'registered' => (int) ($pending[ProcedureStatus::Registered->value] ?? 0),
                'liquidated' => (int) ($pending[ProcedureStatus::Liquidated->value] ?? 0),
                'paid' => (int) ($pending[ProcedureStatus::Paid->value] ?? 0),
                'pending_amount' => number_format((float) PaymentOrder::query()->where('status', PaymentOrderStatus::Pending)->sum('total'), 2, '.', ''),
                'revenue_month' => number_format((float) (clone $paidThisMonth)->sum('total'), 2, '.', ''),
                'payments_month' => (clone $paidThisMonth)->where('total', '>', 0)->count(),
                'licenses_year' => License::query()->whereNotNull('sequence')->where('year', now()->year)->count(),
                'licenses_active' => License::query()->where('status', LicenseStatus::Active)->count(),
            ],
            'recent' => Procedure::query()
                ->where('year', '>', 0)
                ->with('taxpayer:id,name')
                ->latest('id')
                ->limit(8)
                ->get(['id', 'code', 'status', 'taxpayer_id', 'created_at'])
                ->map(fn (Procedure $procedure) => [
                    ...$procedure->only('id', 'code', 'created_at'),
                    'status' => $procedure->status->value,
                    'status_label' => $procedure->status->label(),
                    'taxpayer' => $procedure->taxpayer->name,
                ]),
        ]);
    }
}
