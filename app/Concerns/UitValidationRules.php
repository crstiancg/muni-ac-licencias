<?php

namespace App\Concerns;

use App\Models\Uit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait UitValidationRules
{
    /**
     * Get the validation rules used to validate UITs.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function uitRules(?int $uitId = null): array
    {
        return [
            'year' => [
                'required',
                'integer',
                'min:1990',
                'max:'.(now()->year + 1),
                $uitId === null
                    ? Rule::unique(Uit::class)
                    : Rule::unique(Uit::class)->ignore($uitId),
            ],
            'amount' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'legal_basis' => ['nullable', 'string', 'max:150'],
        ];
    }

    /**
     * Get the human readable names of the UIT attributes.
     *
     * @return array<string, string>
     */
    protected function uitAttributes(): array
    {
        return [
            'year' => 'año',
            'amount' => 'valor',
            'legal_basis' => 'base legal',
        ];
    }
}
