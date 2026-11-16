<?php

namespace App\Http\Requests;

use App\Enums\InspectionResult;
use App\Models\Inspection;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * A field visit: with a licence, the inspector ticks what matches; without
 * one, records the business as seen. Photos come already shrunk by the
 * phone, the size limit only stops the odd original.
 */
class InspectionRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $withLicense = $this->filled('license_id');
        $results = array_map(fn (InspectionResult $result) => $result->value, InspectionResult::for($withLicense));

        return [
            'license_id' => ['nullable', 'integer', 'exists:licenses,id'],
            'result' => ['required', Rule::in($results)],
            // A closed business cannot be compared with its licence.
            'checks' => [
                match (true) {
                    ! $withLicense => 'prohibited',
                    $this->input('result') === InspectionResult::Closed->value => 'nullable',
                    default => 'required',
                },
                'array:'.implode(',', array_keys(Inspection::CHECKS)),
            ],
            'checks.*' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'business_name' => [$withLicense ? 'nullable' : 'required', 'string', 'max:255'],
            'holder_name' => ['nullable', 'string', 'max:255'],
            'holder_document' => ['nullable', 'string', 'max:20'],
            'address' => [$withLicense ? 'nullable' : 'required', 'string', 'max:255'],
            'activity' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'gps_accuracy' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'photos' => ['nullable', 'array', 'max:'.config('licencias.inspection_max_photos')],
            'photos.*' => ['image', 'max:8192'],
        ];
    }

    /**
     * "Conforme" only when everything ticked matches.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            $checks = (array) $this->input('checks', []);

            if ($this->input('result') === InspectionResult::Compliant->value
                && collect($checks)->contains(fn ($value) => ! filter_var($value, FILTER_VALIDATE_BOOLEAN))) {
                $validator->errors()->add('result', 'No puede ser "Conforme" si algo no coincide: elige "Con observaciones".');
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'result' => 'resultado',
            'checks' => 'verificación',
            'notes' => 'observaciones',
            'business_name' => 'nombre del negocio',
            'holder_name' => 'responsable',
            'holder_document' => 'DNI/RUC',
            'address' => 'dirección',
            'activity' => 'giro',
            'photos' => 'fotos',
            'photos.*' => 'foto',
        ];
    }
}
