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
        return self::rulesFor(DocumentType::tryFrom((string) $this->input('document_type')), $this->taxpayerId());
    }

    /**
     * Taxpayer rules, reusable nested in other requests (e.g. "taxpayer." when
     * a procedure registers a new taxpayer).
     *
     * @return array<string, array<mixed>>
     */
    public static function rulesFor(?DocumentType $type, ?int $ignoreId = null, string $prefix = ''): array
    {
        $rules = [
            'document_type' => ['required', Rule::enum(DocumentType::class)],
            'document_number' => array_values(array_filter([
                'required',
                'string',
                $type ? 'regex:'.$type->pattern() : null,
                $type === DocumentType::Ruc ? new Ruc : null,
                Rule::unique(Taxpayer::class, 'document_number')
                    ->where('document_type', $type?->value)
                    ->ignore($ignoreId),
            ])),
            'ruc' => [
                'nullable',
                "prohibited_if:{$prefix}document_type,ruc",
                Ruc::naturalPerson(),
                Rule::unique(Taxpayer::class, 'ruc')->ignore($ignoreId),
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

        return collect($rules)->mapWithKeys(fn (array $rule, string $key) => [$prefix.$key => $rule])->all();
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
        return self::messagesFor();
    }

    /**
     * @return array<string, string>
     */
    public static function messagesFor(string $prefix = ''): array
    {
        return [
            "{$prefix}document_number.regex" => 'El :attribute no tiene un formato válido para el tipo elegido.',
            "{$prefix}document_number.unique" => 'Ya existe un contribuyente con este documento.',
            "{$prefix}ruc.prohibited_if" => 'El RUC adicional solo aplica a personas naturales.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return self::attributesFor();
    }

    /**
     * @return array<string, string>
     */
    public static function attributesFor(string $prefix = ''): array
    {
        return collect([
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
        ])->mapWithKeys(fn (string $label, string $key) => [$prefix.$key => $label])->all();
    }
}
