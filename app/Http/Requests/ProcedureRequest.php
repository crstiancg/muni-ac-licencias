<?php

namespace App\Http\Requests;

use App\Models\Establishment;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation for registering and editing procedures.
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
        return [
            'taxpayer_id' => ['required', 'integer', Rule::exists(Taxpayer::class, 'id')],
            // The establishment must be the taxpayer's own.
            'establishment_id' => [
                'required',
                'integer',
                Rule::exists(Establishment::class, 'id')->where('taxpayer_id', $this->integer('taxpayer_id')),
            ],
            'procedure_type_ids' => ['required', 'array', 'min:1'],
            'procedure_type_ids.*' => [
                'integer',
                'distinct',
                Rule::exists(ProcedureType::class, 'id')->where('is_active', true),
            ],
            'file_number' => ['nullable', 'string', 'max:50'],
            'folios' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
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
        ];
    }
}
