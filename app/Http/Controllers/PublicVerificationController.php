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

        return Inertia::render('public/verify', [
            'license' => $license ? [
                'number' => $license->number,
                'type_label' => $license->type->label(),
                'status' => $license->status->value,
                'status_label' => $license->status->label(),
                'is_valid' => $license->status === LicenseStatus::Active,
                'status_changed_at' => $license->status === LicenseStatus::Active ? null : $license->status_changed_at?->toDateString(),
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
