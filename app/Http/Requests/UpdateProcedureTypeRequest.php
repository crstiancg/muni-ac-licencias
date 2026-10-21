<?php

namespace App\Http\Requests;

use App\Concerns\ProcedureTypeValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProcedureTypeRequest extends FormRequest
{
    use ProcedureTypeValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->procedureTypeRules($this->route('procedure_type')->id);
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->procedureTypeAttributes();
    }
}
