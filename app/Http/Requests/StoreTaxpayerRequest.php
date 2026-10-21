<?php

namespace App\Http\Requests;

class StoreTaxpayerRequest extends TaxpayerRequest
{
    protected function taxpayerId(): ?int
    {
        return null;
    }
}
