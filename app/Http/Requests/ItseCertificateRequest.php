<?php

namespace App\Http\Requests;

use App\Enums\RiskLevel;
use App\Models\Establishment;
use App\Models\ItseCertificate;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ItseCertificateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'establishment_id' => ['required', 'integer', Rule::exists(Establishment::class, 'id')],
            'number' => ['required', 'string', 'max:30', Rule::unique(ItseCertificate::class, 'number')],
            'risk_level' => ['required', Rule::enum(RiskLevel::class)],
            'inspected_at' => ['nullable', 'date', 'before_or_equal:today'],
            'issued_at' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:inspected_at'],
            'valid_until' => ['nullable', 'date', 'after:issued_at'],
            'inspector' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:2000'],
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
            'establishment_id' => 'establecimiento',
            'number' => 'N° de certificado',
            'risk_level' => 'nivel de riesgo',
            'inspected_at' => 'fecha de inspección',
            'issued_at' => 'fecha de emisión',
            'valid_until' => 'vigencia',
            'inspector' => 'inspector',
            'notes' => 'observaciones',
        ];
    }
}
