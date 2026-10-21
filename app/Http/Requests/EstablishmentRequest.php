<?php

namespace App\Http\Requests;

use App\Enums\EconomicSector;
use App\Enums\RiskLevel;
use App\Enums\SettlementType;
use App\Enums\StreetType;
use App\Models\Taxpayer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for storing and updating establishments.
 */
class EstablishmentRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'taxpayer_id' => ['required', 'integer', Rule::exists(Taxpayer::class, 'id')],
            'trade_name' => ['nullable', 'string', 'max:150'],
            'activity' => ['required', 'string', 'max:255'],
            'economic_sector' => ['nullable', Rule::enum(EconomicSector::class)],
            'street_type' => ['nullable', Rule::enum(StreetType::class)],
            'street' => ['required', 'string', 'max:150'],
            'number' => ['nullable', 'string', 'max:20'],
            'interior' => ['nullable', 'string', 'max:20'],
            'block' => ['nullable', 'string', 'max:10'],
            'lot' => ['nullable', 'string', 'max:10'],
            'settlement_type' => ['nullable', Rule::enum(SettlementType::class)],
            'settlement_name' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'risk_level' => ['nullable', Rule::enum(RiskLevel::class)],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'taxpayer_id' => 'contribuyente',
            'trade_name' => 'nombre comercial',
            'activity' => 'giro',
            'economic_sector' => 'sector económico',
            'street_type' => 'tipo de vía',
            'street' => 'vía',
            'number' => 'número',
            'interior' => 'interior',
            'block' => 'manzana',
            'lot' => 'lote',
            'settlement_type' => 'tipo de habilitación',
            'settlement_name' => 'habilitación',
            'area' => 'área',
            'capacity' => 'aforo',
            'risk_level' => 'nivel de riesgo',
        ];
    }
}
