<?php

namespace App\Actions\Procedures;

use App\Models\Establishment;
use App\Models\Taxpayer;
use App\Support\SwornDeclaration;
use Illuminate\Support\Arr;

/**
 * Returns the taxpayer and establishment of a procedure, creating them when
 * the wizard registered new ones. Call it inside the procedure's transaction
 * so nothing is left half-created.
 */
class ResolveParties
{
    /**
     * @param  array<string, mixed>  $data  validated ProcedureRequest data
     * @return array{taxpayer_id: int, establishment_id: int}
     */
    public function handle(array $data): array
    {
        // A new taxpayer keeps the representative declared in its first DJ.
        $taxpayerId = $data['taxpayer_id'] ?? Taxpayer::create([
            ...$data['taxpayer'],
            ...array_filter(Arr::only(SwornDeclaration::normalize($data['declaration'] ?? []), SwornDeclaration::REPRESENTATIVE)),
        ])->id;

        $establishmentId = $data['establishment_id']
            ?? Establishment::create([...$data['establishment'], 'taxpayer_id' => $taxpayerId])->id;

        return ['taxpayer_id' => $taxpayerId, 'establishment_id' => $establishmentId];
    }
}
