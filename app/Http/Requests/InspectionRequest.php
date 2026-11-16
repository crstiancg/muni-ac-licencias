<?php

namespace App\Http\Requests;

use App\Enums\InspectionResult;
use App\Models\Inspection;
use App\Models\InspectionCase;
use App\Models\License;
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
            // An imported licence the inspector saw in use: confirm it is in force.
            'confirm_license' => ['nullable', 'boolean', $withLicense ? 'nullable' : 'prohibited'],
            // Revisit of a business without a licence that is being followed.
            'inspection_case_id' => ['nullable', 'integer', $withLicense ? 'prohibited' : 'exists:inspection_cases,id'],
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
            $result = InspectionResult::tryFrom((string) $this->input('result'));
            $license = $this->filled('license_id') ? License::find($this->input('license_id')) : null;
            $status = $license?->effectiveStatus();

            $case = $this->filled('inspection_case_id') ? InspectionCase::find($this->input('inspection_case_id')) : null;

            if ($case && ! $case->status->isOpen()) {
                $validator->errors()->add('inspection_case_id', 'Este caso ya está cerrado.');

                return;
            }

            if ($license && $this->boolean('confirm_license')) {
                if (! $license->needsConfirmation()) {
                    $validator->errors()->add('confirm_license', 'Esta licencia no requiere confirmación.');

                    return;
                }

                if (! in_array($result, [InspectionResult::Compliant, InspectionResult::Observed], true)) {
                    $validator->errors()->add('confirm_license', 'Solo se confirma la vigencia si el negocio está funcionando (Conforme o Con observaciones).');

                    return;
                }
            }

            if ($result === InspectionResult::LicenseNotInForce && $result->contradicts($status)) {
                $validator->errors()->add('result', 'La licencia está vigente: si algo no coincide, elige "Con observaciones".');

                return;
            }

            if ($result === InspectionResult::Compliant && $status && $result->contradicts($status)) {
                $validator->errors()->add('result', "La licencia no está vigente ({$status->label()}): elige \"Licencia no vigente\".");

                return;
            }

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
            'confirm_license' => 'confirmación de vigencia',
            'inspection_case_id' => 'caso de seguimiento',
        ];
    }
}
