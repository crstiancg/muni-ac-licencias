@php
    // Positions in mm measured on the municipality's pre-printed A4 sheet.
    // Bump the layout version on every position change: it is printed in a corner to tell test prints apart.
    $layoutVersion = 'v9';
    $dx = config('licencias.license_offset_x');
    $dy = config('licencias.license_offset_y');
    $date = fn ($value) => $value?->format('Y-m-d');
    $words = $amountInWords ? preg_replace('/ SOLES$/', '', $amountInWords) : null;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $license->type->label() }} {{ $license->number }}</title>
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; }
        .toolbar { max-width: 210mm; margin: 16px auto; font-size: 13px; color: #374151; text-align: center; }
        .toolbar ol { display: inline-block; text-align: left; margin: 8px 0 0; padding: 10px 14px 10px 32px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; }
        .toolbar button { padding: 8px 20px; font-size: 14px; cursor: pointer; border: 1px solid #111; background: #111; color: #fff; border-radius: 6px; margin-bottom: 8px; }
        .letterhead { position: relative; width: 210mm; height: 297mm; margin: 0 auto 16px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); overflow: hidden; }
        .layer { position: absolute; inset: 0; transform: translate({{ $dx }}mm, {{ $dy }}mm); }
        .f { position: absolute; font-weight: 700; font-size: 10pt; text-transform: uppercase; white-space: nowrap; line-height: 1.15; }
        .wrap { white-space: normal; }
        /* Centred under the pre-printed crest, as on the blank-sheet design. */
        .crest-code { text-align: center; letter-spacing: .2mm; }
        .guide { position: absolute; font-size: 9pt; color: #9ca3af; font-family: 'Times New Roman', serif; }
        .warn { position: absolute; left: 20mm; top: 80mm; right: 20mm; text-align: center; font-size: 26pt; font-weight: 700; color: #b91c1c; border: 3px solid #b91c1c; transform: rotate(-8deg); opacity: .8; }
        .version { position: absolute; right: 8mm; bottom: 8mm; font-size: 6pt; color: #6b7280; }
        .qr { position: absolute; left: 186.5mm; top: 235mm; width: 21mm; height: 21mm; }
        @media print {
            /* Exactly one sheet: if the dialog still adds margins, whatever
               does not fit is clipped instead of spilling onto a 2nd page. */
            html, body { width: 210mm; height: 297mm; overflow: hidden; background: #fff; }
            .toolbar, .guide { display: none; }
            .letterhead { margin: 0; box-shadow: none; break-after: avoid; break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button onclick="window.print()">Imprimir / Guardar PDF</button><br>
        Coloca la hoja membretada en la bandeja. Las etiquetas grises son solo de guía: no se imprimen.<br>
        <ol>
            <li>Papel: <strong>A4</strong> · Escala: <strong>100% / Predeterminada</strong> (no "ajustar a la página").</li>
            <li>Márgenes: <strong>Ninguno</strong>.</li>
            <li>Desmarca <strong>"Encabezados y pies de página"</strong> (si no, sale la URL y la fecha).</li>
        </ol>
    </div>

    <div class="letterhead">
        <div class="layer">
            {{-- Screen-only guides: what the pre-printed sheet already has. --}}
            <div class="guide" style="left:33.5mm;top:98.5mm">Apellidos y Nombres</div>
            <div class="guide" style="left:33.5mm;top:116.5mm">Razón social del Establecimiento</div>
            <div class="guide" style="left:33.5mm;top:132.5mm">Clase de Establecimiento Comercial, Industrial o de Servicios</div>
            <div class="guide" style="left:33.5mm;top:149mm">Domicilio de Establecimiento:</div>
            <div class="guide" style="left:33.5mm;top:164.5mm">Observaciones:</div>
            <div class="guide" style="left:33.5mm;top:189mm">Importe Abonado S/</div>
            <div class="guide" style="left:103mm;top:189mm">Son:</div>
            <div class="guide" style="left:33.5mm;top:204.5mm">Expediente N°</div>
            <div class="guide" style="left:77mm;top:204.5mm">C/P.N°:</div>
            <div class="guide" style="left:115mm;top:204.5mm">Aforo:</div>
            <div class="guide" style="left:163mm;top:204.5mm">Área:</div>
            <div class="guide" style="left:33.5mm;top:211.5mm">Fecha de Trámite:</div>
            <div class="guide" style="left:33.5mm;top:217.5mm">Fecha de Pago:</div>
            <div class="guide" style="left:33.5mm;top:223.8mm">Fecha de Emisión:</div>

            @if ($license->status->value !== 'vigente')
                <div class="warn">{{ mb_strtoupper($license->status->label()) }}</div>
            @endif

            <div class="f crest-code" style="left:8mm;top:54mm;width:41mm">C.T. {{ $procedure?->code }}</div>

            <div class="f" style="left:38.7mm;top:105mm">{{ $license->holder_name }}</div>
            <div class="f" style="left:38.7mm;top:122mm">{{ $license->trade_name }}</div>
            <div class="f" style="left:38.7mm;top:139.3mm">{{ $license->activity }}</div>
            <div class="f" style="left:38.7mm;top:155.1mm">{{ $license->address }}</div>
            <div class="f wrap" style="left:40mm;top:167.3mm;width:125mm;font-size:8.5pt">{{ $observations }}</div>

            <div class="f" style="left:67mm;top:189.9mm">{{ $order ? number_format((float) $order->total, 2, '.', '') : '' }}</div>
            <div class="f" style="left:101mm;top:189.9mm">{{ $words }}</div>
            <div class="f" style="left:38.7mm;top:197.2mm">{{ $words ? 'SOLES' : '' }}</div>

            <div class="f wrap" style="left:44mm;top:207.4mm;width:21mm;font-size:9pt">{{ $procedure?->file_number }}</div>
            <div class="f" style="left:84.5mm;top:207.9mm">{{ $order?->receipt_number }}</div>
            <div class="f" style="left:124mm;top:207.9mm">{{ $license->capacity }}</div>
            <div class="f" style="left:160mm;top:207.9mm">{{ $license->area ? rtrim(rtrim(number_format((float) $license->area, 2, '.', ''), '0'), '.') : '' }}</div>

            <div class="f" style="left:66.8mm;top:214.8mm">{{ $date($procedure?->created_at) }}</div>
            <div class="f" style="left:66.8mm;top:220.6mm">{{ $date($order?->paid_at) }}</div>
            <div class="f" style="left:66.8mm;top:226.4mm">{{ $date($license->issued_at) }}</div>

            <img class="qr" src="{{ $qr }}" alt="QR de verificación">
        </div>
        <div class="version">{{ $layoutVersion }} · X{{ $dx }} Y{{ $dy }}</div>
    </div>
</body>
</html>
