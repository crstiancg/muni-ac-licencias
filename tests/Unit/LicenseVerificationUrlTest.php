<?php

namespace Tests\Unit;

use App\Models\License;
use Tests\TestCase;

/**
 * The QR must always hold a full URL: a phone scanning "/v/ABC123" only
 * shows that text instead of opening the verification page.
 */
class LicenseVerificationUrlTest extends TestCase
{
    private function license(): License
    {
        return new License(['qr_token' => 'ABC123']);
    }

    public function test_it_uses_the_configured_verification_url(): void
    {
        config(['licencias.verification_url' => 'https://verifica.example.test/', 'app.url' => 'https://app.example.test']);

        $this->assertSame('https://verifica.example.test/v/ABC123', $this->license()->verificationUrl());
    }

    public function test_an_empty_verification_url_falls_back_to_the_app_url(): void
    {
        // LICENCIAS_VERIFICATION_URL= (declared but blank) reaches config as "".
        config(['licencias.verification_url' => '', 'app.url' => 'https://licencias.example.test']);

        $this->assertSame('https://licencias.example.test/v/ABC123', $this->license()->verificationUrl());
    }
}
