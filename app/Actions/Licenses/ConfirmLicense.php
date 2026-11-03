<?php

namespace App\Actions\Licenses;

use App\Models\License;
use Illuminate\Support\Facades\Auth;

/**
 * Confirms that an imported licence is still in force, so its QR stops
 * warning that it may be outdated. Records who, when and on what basis.
 */
class ConfirmLicense
{
    public function handle(License $license, string $note): void
    {
        if (! $license->needsConfirmation()) {
            return;
        }

        $license->update([
            'confirmed_at' => now(),
            'confirmed_by' => Auth::id(),
            'confirmation_note' => $note,
        ]);

        $license->procedure?->log('licencia_confirmada', "{$license->number}: {$note}");
    }
}
