<?php

namespace App\Http\Requests;

class UpdateTaxpayerRequest extends TaxpayerRequest
{
    protected function taxpayerId(): ?int
    {
        return $this->route('taxpayer')->id;
    }
}
