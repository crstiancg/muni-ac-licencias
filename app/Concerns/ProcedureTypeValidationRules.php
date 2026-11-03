<?php

namespace App\Concerns;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseEffect;
use App\Enums\RiskLevel;
use App\Models\ProcedureType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProcedureTypeValidationRules
{
    /**
     * Get the validation rules used to validate procedure types.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function procedureTypeRules(?int $procedureTypeId = null): array
    {
        return [
            'tupa_code' => [
                'nullable',
                'string',
                'max:20',
                $procedureTypeId === null
                    ? Rule::unique(ProcedureType::class)
                    : Rule::unique(ProcedureType::class)->ignore($procedureTypeId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            // Either a share of the UIT of the year or a fixed amount in soles.
            'uit_percentage' => ['nullable', 'required_without:fixed_amount', 'numeric', 'decimal:0,4', 'min:0', 'max:100'],
            'fixed_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:99999'],
            'risk_level' => ['nullable', Rule::enum(RiskLevel::class)],
            'document_type' => ['nullable', Rule::enum(IssuedDocumentType::class)],
            'validity_months' => ['nullable', 'integer', 'min:1', 'max:120'],
            'license_effect' => ['nullable', Rule::enum(LicenseEffect::class)],
            'processing_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'legal_basis' => ['nullable', 'string', 'max:150'],
            'position' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get the human readable names of the procedure type attributes.
     *
     * @return array<string, string>
     */
    protected function procedureTypeAttributes(): array
    {
        return [
            'tupa_code' => 'código TUPA',
            'name' => 'nombre',
            'description' => 'descripción',
            'uit_percentage' => 'porcentaje de UIT',
            'fixed_amount' => 'monto fijo',
            'risk_level' => 'nivel de riesgo',
            'document_type' => 'documento que emite',
            'validity_months' => 'vigencia',
            'license_effect' => 'efecto sobre la licencia',
            'processing_days' => 'plazo de atención',
            'legal_basis' => 'base legal',
            'position' => 'orden',
            'is_active' => 'activo',
        ];
    }
}
