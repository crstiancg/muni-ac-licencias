<?php

namespace App\Http\Requests;

use App\Enums\DocumentType;
use App\Models\Establishment;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for registering and editing procedures, step by step (the
 * wizard validates each step with Precognition).
 *
 * The applicant is either an existing taxpayer (taxpayer_id) or a new one
 * (taxpayer.*), and the same for the establishment: the wizard never sends
 * the clerk to another screen to register them first.
 */
class ProcedureRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $existingTaxpayer = $this->filled('taxpayer_id');

        return [
            // Step 1: what.
            'procedure_type_ids' => ['required', 'array', 'min:1'],
            'procedure_type_ids.*' => [
                'integer',
                'distinct',
                Rule::exists(ProcedureType::class, 'id')->where('is_active', true),
            ],

            // Step 2: who.
            ...($existingTaxpayer
                ? ['taxpayer_id' => ['required', 'integer', Rule::exists(Taxpayer::class, 'id')]]
                : [
                    'taxpayer' => ['required', 'array'],
                    ...TaxpayerRequest::rulesFor(DocumentType::tryFrom((string) $this->input('taxpayer.document_type')), prefix: 'taxpayer.'),
                ]),

            // Step 3: where. A new taxpayer can only have a new establishment.
            ...($existingTaxpayer && $this->filled('establishment_id')
                ? ['establishment_id' => [
                    'required',
                    'integer',
                    Rule::exists(Establishment::class, 'id')->where('taxpayer_id', $this->integer('taxpayer_id')),
                ]]
                : [
                    'establishment' => ['required', 'array'],
                    ...EstablishmentRequest::rulesFor('establishment.'),
                ]),

            // Step 4: mesa de partes.
            'file_number' => ['nullable', 'string', 'max:50'],
            'folios' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Upper-case the new taxpayer's document so a CE typed in lower case matches.
     */
    protected function prepareForValidation(): void
    {
        if (is_array($this->input('taxpayer'))) {
            $this->merge(['taxpayer' => [
                ...$this->input('taxpayer'),
                'document_number' => mb_strtoupper(trim((string) $this->input('taxpayer.document_number'))) ?: null,
                'ruc' => trim((string) $this->input('taxpayer.ruc')) ?: null,
            ]]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'establishment_id.exists' => 'El establecimiento no pertenece al contribuyente elegido.',
            'procedure_type_ids.required' => 'Elige al menos un tipo de trámite.',
            'procedure_type_ids.*.exists' => 'Uno de los tipos de trámite ya no está activo.',
            'taxpayer.required' => 'Busca al solicitante por su DNI o RUC.',
            'establishment.required' => 'Elige o registra el establecimiento.',
            ...TaxpayerRequest::messagesFor('taxpayer.'),
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
            'establishment_id' => 'establecimiento',
            'procedure_type_ids' => 'tipos de trámite',
            'file_number' => 'N° de expediente',
            'folios' => 'folios',
            'notes' => 'observaciones',
            ...TaxpayerRequest::attributesFor('taxpayer.'),
            ...EstablishmentRequest::attributesFor('establishment.'),
        ];
    }
}
