<?php

namespace App\Http\Requests;

use App\Enums\DocumentType;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Support\SwornDeclaration;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Correcting a registered procedure: every field of its applicant
 * (applicant.*), its establishment (premises.*) and its sworn declaration,
 * kept with this procedure only. The procedure types only while there is
 * no payment order: they set its amount.
 */
class UpdateProcedureRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Procedure $procedure */
        $procedure = $this->route('procedure');

        return [
            ...($procedure->typesAreEditable()
                ? [
                    'procedure_type_ids' => ['required', 'array', 'min:1'],
                    'procedure_type_ids.*' => ['integer', 'distinct', Rule::exists(ProcedureType::class, 'id')->where('is_active', true)],
                ]
                : ['procedure_type_ids' => ['nullable', 'array', function (string $attribute, mixed $value, $fail) use ($procedure) {
                    $current = $procedure->types()->pluck('procedure_types.id')->sort()->values()->all();

                    if (collect($value)->map(fn ($id) => (int) $id)->sort()->values()->all() !== $current) {
                        $fail('Los tipos de trámite ya no se pueden cambiar: el trámite tiene orden de pago.');
                    }
                }]]),
            'applicant' => ['required', 'array'],
            // Another person's document would still clash with their record.
            ...TaxpayerRequest::rulesFor(
                DocumentType::tryFrom((string) $this->input('applicant.document_type')),
                $procedure->taxpayer_id,
                'applicant.',
            ),
            'premises' => ['required', 'array'],
            ...EstablishmentRequest::rulesFor('premises.'),
            ...SwornDeclaration::rulesFor(),
        ];
    }

    /**
     * Upper-case the document so a CE typed in lower case matches.
     */
    protected function prepareForValidation(): void
    {
        if (is_array($this->input('applicant'))) {
            $this->merge(['applicant' => [
                ...$this->input('applicant'),
                'document_number' => mb_strtoupper(trim((string) $this->input('applicant.document_number'))) ?: null,
                'ruc' => trim((string) $this->input('applicant.ruc')) ?: null,
            ]]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return TaxpayerRequest::messagesFor('applicant.');
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'procedure_type_ids' => 'tipos de trámite',
            ...TaxpayerRequest::attributesFor('applicant.'),
            ...EstablishmentRequest::attributesFor('premises.'),
            ...SwornDeclaration::attributesFor(),
        ];
    }
}
