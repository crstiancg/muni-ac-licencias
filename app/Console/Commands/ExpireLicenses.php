<?php

namespace App\Console\Commands;

use App\Enums\LicenseStatus;
use App\Models\License;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Marks as expired (caducada) the licences in force whose valid_until has
 * passed: temporary licences and provisional ones for bodegas. Scheduled
 * daily in routes/console.php.
 */
#[Signature('licenses:expire')]
#[Description('Marca como caducadas las licencias vigentes con fecha de vencimiento pasada')]
class ExpireLicenses extends Command
{
    public function handle(): int
    {
        $expired = 0;

        License::query()
            ->with('procedure')
            ->where('status', LicenseStatus::Active)
            ->whereDate('valid_until', '<', today())
            ->lazyById()
            ->each(function (License $license) use (&$expired) {
                $license->update([
                    'status' => LicenseStatus::Expired,
                    'status_reason' => 'Venció el '.$license->valid_until->format('d/m/Y').'.',
                    'status_changed_at' => now(),
                ]);
                $license->procedure?->log('licencia_caducada', "{$license->number}: venció el {$license->valid_until->format('d/m/Y')}.");
                $expired++;
            });

        $this->info("{$expired} licencias caducadas.");

        return self::SUCCESS;
    }
}
