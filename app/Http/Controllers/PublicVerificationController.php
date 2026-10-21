<?php

namespace App\Http\Controllers;

use App\Enums\LicenseStatus;
use App\Models\License;
use Inertia\Inertia;
use Inertia\Response;

/**
 * What a citizen or inspector sees when scanning a licence QR. No login.
 * Shows only what is printed on the document, with its current status.
 */
class PublicVerificationController extends Controller
{
    public function show(string $token): Response
    {
        $license = License::query()->where('qr_token', $token)->first();
        $status = $license?->effectiveStatus();

        return Inertia::render('public/verify', [
            'license' => $license ? [
                'number' => $license->number,
                'type_label' => $license->type->label(),
                'status' => $status->value,
                'status_label' => $status->label(),
                'is_valid' => $status === LicenseStatus::Active,
                'valid_until' => $license->valid_until?->toDateString(),
                // Imported from dblicencias (no yearly sequence): its closures were rarely recorded.
                'is_legacy' => $license->sequence === null,
                'status_changed_at' => match (true) {
                    $status === LicenseStatus::Active => null,
                    $license->status === LicenseStatus::Active => $license->valid_until->toDateString(),
                    default => $license->status_changed_at?->toDateString(),
                },
                'issued_at' => $license->issued_at->toDateString(),
                'holder_name' => $license->holder_name,
                'trade_name' => $license->trade_name,
                'activity' => $license->activity,
                'address' => $license->address,
                'area' => $license->area,
            ] : null,
            'municipality' => config('licencias.municipality'),
        ]);
    }
}
