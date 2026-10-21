<?php

namespace App\Http\Requests;

use App\Enums\DocumentType;
use App\Models\Taxpayer;
use App\Rules\Ruc;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shared validation for storing and updating taxpayers. The document number
 * format depends on the chosen document type.
 */
abstract class TaxpayerRequest extends FormRequest
{
    /**
     * Id to ignore in unique rules (the taxpayer being updated).
     */
    abstract protected function taxpayerId(): ?int;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $type = DocumentType::tryFrom((string) $this->input('document_type'));

        return [
            'document_type' => ['required', Rule::enum(DocumentType::class)],
            'document_number' => array_values(array_filter([
                'required',
                'string',
                $type ? 'regex:'.$type->pattern() : null,
                $type === DocumentType::Ruc ? new Ruc : null,
                Rule::unique(Taxpayer::class)
                    ->where('document_type', $type?->value)
                    ->ignore($this->taxpayerId()),
            ])),
            'ruc' => [
                'nullable',
                'prohibited_if:document_type,ruc',
                Ruc::naturalPerson(),
                Rule::unique(Taxpayer::class)->ignore($this->taxpayerId()),
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:60'],
            'province' => ['nullable', 'string', 'max:60'],
            'department' => ['nullable', 'string', 'max:60'],
            'representative_name' => ['nullable', 'string', 'max:255'],
            'representative_document' => ['nullable', 'string', 'max:15'],
            'representative_sunarp' => ['nullable', 'string', 'max:30'],
            'representative_phone' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * Upper-case documents so a CE typed in lower case matches.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'document_number' => mb_strtoupper(trim((string) $this->input('document_number'))) ?: null,
            'ruc' => trim((string) $this->input('ruc')) ?: null,
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document_number.regex' => 'El :attribute no tiene un formato válido para el tipo elegido.',
            'document_number.unique' => 'Ya existe un contribuyente con este documento.',
            'ruc.prohibited_if' => 'El RUC adicional solo aplica a personas naturales.',
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
            'document_type' => 'tipo de documento',
            'document_number' => 'número de documento',
            'ruc' => 'RUC',
            'name' => 'nombre o razón social',
            'email' => 'correo',
            'phone' => 'teléfono',
            'address' => 'domicilio fiscal',
            'district' => 'distrito',
            'province' => 'provincia',
            'department' => 'departamento',
            'representative_name' => 'representante legal',
            'representative_document' => 'documento del representante',
            'representative_sunarp' => 'partida registral',
            'representative_phone' => 'teléfono del representante',
        ];
    }
}
