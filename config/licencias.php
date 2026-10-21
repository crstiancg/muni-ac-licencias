<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Issuing entity
    |--------------------------------------------------------------------------
    |
    | Printed on payment orders, licences and the public verification page.
    |
    */
    'municipality' => env('LICENCIAS_MUNICIPALITY', 'Municipalidad Provincial de Puno'),
    'office' => env('LICENCIAS_OFFICE', 'Subgerencia de Actividades Económicas'),

    /*
    |--------------------------------------------------------------------------
    | QR verification base URL
    |--------------------------------------------------------------------------
    |
    | Public URL of this app as seen by citizens scanning a QR. The QR encodes
    | {verification_url}/v/{qr_token}. Defaults to APP_URL.
    |
    */
    'verification_url' => env('LICENCIAS_VERIFICATION_URL', env('APP_URL')),
];
