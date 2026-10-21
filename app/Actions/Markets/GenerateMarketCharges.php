<?php

namespace App\Actions\Markets;

use App\Models\Market;
use App\Models\MarketCharge;
use Illuminate\Validation\ValidationException;

/**
 * Creates the period's charge for every active stall with a fee. Periods
 * already charged are skipped, so it can run again safely.
 */
class GenerateMarketCharges
{
    /**
     * @return int charges created
     */
    public function handle(Market $market, int $year, ?int $month = null): int
    {
        if ($market->isMonthly() && $month === null) {
            throw ValidationException::withMessages(['month' => "{$market->name} cobra por mes: elige el mes."]);
        }

        $month = $market->isMonthly() ? $month : null;
        $created = 0;

        $market->stalls()
            ->where('status', 'activo')
            ->where('fee', '>', 0)
            ->lazyById()
            ->each(function ($stall) use ($year, $month, &$created) {
                $charge = MarketCharge::firstOrCreate(
                    ['market_stall_id' => $stall->id, 'period_year' => $year, 'period_month' => $month],
                    ['amount' => $stall->fee],
                );

                $created += (int) $charge->wasRecentlyCreated;
            });

        return $created;
    }
}
