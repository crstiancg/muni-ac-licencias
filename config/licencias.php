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
    'management' => env('LICENCIAS_MANAGEMENT', 'Gerencia de Turismo y Desarrollo Económico'),
    // Coat of arms printed on the sworn declaration, relative to public/.
    'logo' => env('LICENCIAS_LOGO', 'images/escudo.png'),

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

    /*
    |--------------------------------------------------------------------------
    | Operating licence on letterhead
    |--------------------------------------------------------------------------
    |
    | The licence is printed on the pre-printed (membretada) A4 sheet: only the
    | data goes at fixed positions. Each printer feeds paper a few millimetres
    | off, so shift everything with the offsets (mm, + right/down).
    |
    */
    'license_observations' => env('LICENCIAS_LICENSE_OBSERVATIONS', 'PROHIBIDO OCUPACION DE LA VIA PUBLICA, PROHIBIDO INSTALAR LETREROS ESQUINEROS, CASO CONTRARIO SE SANCIONARA CON NORMAS, ORDENANZAS MUNICIPALES VIGENTES Y BAJO APERCIBIMIENTO DE REVOCAR LA LICENCIA.'),
    'license_offset_x' => (float) env('LICENCIAS_LICENSE_OFFSET_X', 0),
    'license_offset_y' => (float) env('LICENCIAS_LICENSE_OFFSET_Y', 0),

    /*
    |--------------------------------------------------------------------------
    | Capacity (aforo) suggestion
    |--------------------------------------------------------------------------
    |
    | Square metres per person used to suggest the capacity from the area:
    | floor(area / area_per_person), e.g. 100 m² / 1.5 = 66 people. The RNE
    | (A.070) factor depends on the use; the clerk can always overwrite it.
    |
    */
    'area_per_person' => (float) env('LICENCIAS_AREA_PER_PERSON', 1.5),
];
