<?php

namespace App\Support;

use chillerlan\QRCode\Output\QROutputInterface;
use chillerlan\QRCode\QRCode as Generator;
use chillerlan\QRCode\QROptions;

/**
 * QR codes as SVG data URIs, crisp at any print size.
 */
final class QrCode
{
    public static function svg(string $data): string
    {
        $options = new QROptions([
            'outputType' => QROutputInterface::MARKUP_SVG,
            'outputBase64' => true,
            'addQuietzone' => true,
            'quietzoneSize' => 1,
        ]);

        return (new Generator($options))->render($data);
    }
}
