@php
    // Same form as the municipality's pre-printed sheet, drawn whole for a plain A4 sheet.
    $date = fn ($value) => $value?->format('Y-m-d');
    $words = $amountInWords ? preg_replace('/ SOLES$/', '', $amountInWords) : null;
    $area = $license->area ? rtrim(rtrim(number_format((float) $license->area, 2, '.', ''), '0'), '.') : '';
    $logo = config('licencias.logo');
    $hasLogo = $logo && file_exists(public_path($logo));
    $serial = $license->series ?? $license->number;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $license->type->label() }} {{ $license->number }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; color: #111; }
        .toolbar { max-width: 210mm; margin: 16px auto; font-size: 13px; color: #374151; text-align: center; }
        .toolbar ol { display: inline-block; text-align: left; margin: 8px 0 0; padding: 10px 14px 10px 32px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; }
        .toolbar button { padding: 8px 20px; font-size: 14px; cursor: pointer; border: 1px solid #111; background: #111; color: #fff; border-radius: 6px; margin-bottom: 8px; }

        .sheet { position: relative; width: 210mm; height: 297mm; margin: 0 auto 16px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); overflow: hidden; }
        .waves { position: absolute; inset: 0; width: 100%; height: 100%; }
        .condensed { font-family: Oswald, 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif; font-stretch: condensed; }

        .crest { position: absolute; left: 22mm; top: 19mm; width: 29mm; height: 37mm; object-fit: contain; }
        .photo { position: absolute; left: 161mm; top: 23mm; width: 31mm; height: 39mm; border: .6mm solid #111; background: #fff; }
        .serial { position: absolute; left: 88mm; top: 35mm; white-space: nowrap; }
        .serial .label { font-weight: 700; font-size: 21pt; color: #1f2937; letter-spacing: .2mm; }
        .serial .num { margin-left: 5mm; font-family: 'Courier New', monospace; font-size: 19pt; color: #d6336c; letter-spacing: .6mm; }

        .entity { position: absolute; left: 30mm; right: 30mm; top: 56mm; text-align: center; text-transform: uppercase; color: #1f2937; line-height: 1.12; }
        .entity .l1 { font-size: 17pt; font-weight: 500; }
        .entity .l2, .entity .l3 { font-size: 12.5pt; font-weight: 500; }

        .title { position: absolute; left: 0; right: 0; top: 77mm; margin: 0; text-align: center; text-transform: uppercase; font-size: 25pt; font-weight: 700; line-height: 1; letter-spacing: .1mm; color: #2563eb; -webkit-text-stroke: .35mm #fff; paint-order: stroke fill; text-shadow: .3mm .3mm 0 #0b2a6b, -.15mm -.15mm 0 #0b2a6b, .15mm -.15mm 0 #0b2a6b, -.15mm .15mm 0 #0b2a6b; }

        .content { position: absolute; left: 19.5mm; width: 171.5mm; top: 91.5mm; }
        .box { border: .3mm solid #111; border-radius: 3mm; overflow: hidden; }
        .box .label { padding: 1mm 4mm 0; height: 6.5mm; font-family: 'Times New Roman', Times, serif; font-size: 12.5pt; border-bottom: .3mm solid #111; white-space: nowrap; }
        .box .value { padding: 2mm 4mm 2mm 18mm; min-height: 10.5mm; font-weight: 700; font-size: 10.5pt; text-transform: uppercase; border-bottom: .3mm solid #111; }
        .box .value.obs { min-height: 19mm; padding-left: 19mm; padding-right: 28mm; font-size: 8.5pt; line-height: 1.3; }
        .box > :last-child { border-bottom: 0; }
        .box .label b { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; text-transform: uppercase; }
        .row { display: flex; align-items: baseline; }
        .row b { padding: 0 3mm 0 4mm; }

        .dates { margin-top: 3mm; border-collapse: collapse; font-weight: 700; font-size: 11pt; }
        .dates td { padding: .6mm 0; }
        .dates td:first-child { width: 42mm; }

        .warn { position: absolute; left: 20mm; top: 130mm; right: 20mm; text-align: center; font-size: 26pt; font-weight: 700; color: #b91c1c; border: 3px solid #b91c1c; transform: rotate(-8deg); opacity: .8; }
        .signatures { position: absolute; left: 0; top: 252mm; width: 100%; font-size: 7.5pt; text-align: center; color: #1f2937; }
        .signatures div { position: absolute; width: 39mm; border-top: .3mm solid #111; padding-top: .8mm; line-height: 1.25; }
        .qr { position: absolute; left: 186mm; top: 236mm; width: 21mm; height: 21mm; }
        .note { position: absolute; left: 30mm; right: 30mm; top: 262mm; text-align: center; font-size: 7.5pt; font-weight: 700; line-height: 1.3; }

        @media print {
            /* Exactly one sheet: if the dialog still adds margins, whatever
               does not fit is clipped instead of spilling onto a 2nd page. */
            html, body { width: 210mm; height: 297mm; overflow: hidden; background: #fff; }
            .toolbar { display: none; }
            .sheet { margin: 0; box-shadow: none; break-after: avoid; break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button onclick="window.print()">Imprimir / Guardar PDF</button><br>
        Usa una hoja A4 en blanco: el formato completo (escudo, bordes y textos) sale impreso.<br>
        <ol>
            <li>Papel: <strong>A4</strong> · Escala: <strong>100% / Predeterminada</strong> (no "ajustar a la página").</li>
            <li>Márgenes: <strong>Ninguno</strong>.</li>
            <li>Marca <strong>"Gráficos de fondo"</strong> (si no, no salen los colores).</li>
            <li>Desmarca <strong>"Encabezados y pies de página"</strong> (si no, sale la URL y la fecha).</li>
        </ol>
    </div>

    <div class="sheet">
        {{-- Decorative blue swooshes of the official form, in mm (viewBox = A4). --}}
        <svg class="waves" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="deep" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stop-color="#9cc4f2"/>
                    <stop offset=".6" stop-color="#3b82e0"/>
                    <stop offset="1" stop-color="#1d5fc4"/>
                </linearGradient>
                <linearGradient id="light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#cfe2fa"/>
                    <stop offset="1" stop-color="#eaf2fd"/>
                </linearGradient>
            </defs>
            {{-- Top --}}
            <path d="M92 17 C125 3 170 -1 210 3 L210 30 C186 15 142 8 92 17 Z" fill="url(#deep)"/>
            <path d="M0 70 C55 61 115 33 210 26 L210 29.5 C118 37 58 65 0 72.5 Z" fill="#a9cbf3"/>
            <path d="M0 70 C55 61 115 33 210 26" fill="none" stroke="#2f6fd6" stroke-width=".7"/>
            {{-- Bottom --}}
            <path d="M0 272 C50 281 125 283 210 268 L210 297 L0 297 Z" fill="url(#light)"/>
            <path d="M0 246 C25 249 50 258 75 268 C50 262 25 259 0 259 Z" fill="url(#deep)"/>
            <path d="M95 275 C140 273 180 267 210 257 L210 263 C178 273 140 278 95 275 Z" fill="url(#deep)"/>
            <path d="M0 287 C60 284 140 290 210 284 L210 297 L0 297 Z" fill="#a9cbf3" opacity=".6"/>
        </svg>

        @if ($hasLogo)
            <img class="crest" src="{{ asset($logo) }}" alt="Escudo">
        @endif
        <div class="photo"></div>

        <div class="serial condensed">
            <span class="label">{{ $license->series ? 'SERIE' : 'N°' }}</span>
            {{-- Shrinks so a long series never runs into the photo box. --}}
            <span class="num" @if (mb_strlen($serial) > 9) style="font-size:{{ max(10, 19 - (mb_strlen($serial) - 9) * 1.6) }}pt;letter-spacing:0" @endif>{{ $serial }}</span>
        </div>

        <div class="entity condensed">
            <div class="l1">{{ mb_strtoupper(config('licencias.municipality')) }}</div>
            <div class="l2">Gerencia de Turismo y Desarrollo Económico</div>
            <div class="l3">Subgerencia de Actividades Económicas Ley N° 28976</div>
        </div>

        <h1 class="title condensed">Licencia de funcionamiento para establecimiento</h1>

        <div class="content">
            <div class="box">
                <div class="label">Apellidos y Nombres</div>
                <div class="value">{{ $license->holder_name }}</div>
                <div class="label">Razón social del Establecimiento</div>
                <div class="value">{{ $license->trade_name }}</div>
                <div class="label">Clase de Establecimiento Comercial, Industrial o de Servicios</div>
                <div class="value">{{ $license->activity }}</div>
                <div class="label">Domicilio de Establecimiento:</div>
                <div class="value">{{ $license->address }}</div>
                <div class="label">Observaciones:</div>
                <div class="value obs">{{ $observations }}</div>
                <div class="label row">
                    Importe Abonado S/ <b style="width:30mm; text-align:center">{{ $order ? number_format((float) $order->total, 2, '.', '') : '' }}</b>
                    Son: <b>{{ $words }}</b>
                </div>
                <div class="value">{{ $words ? 'SOLES' : '' }}</div>
                <div class="label row">
                    Expediente N° <b style="width:32mm">{{ $procedure?->file_number }}</b>
                    C/P.N°: <b style="width:22mm">{{ $order?->receipt_number }}</b>
                    Aforo: <b style="width:24mm; text-align:center">{{ $license->capacity }}</b>
                    Área: <b>{{ $area }}</b>
                </div>
            </div>

            <table class="dates">
                <tr><td>Fecha de Trámite:</td><td>{{ $date($procedure?->created_at) }}</td></tr>
                <tr><td>Fecha de Pago:</td><td>{{ $date($order?->paid_at) }}</td></tr>
                <tr><td>Fecha de Emisión:</td><td>{{ $date($license->issued_at) }}</td></tr>
            </table>
        </div>

        @if ($license->status->value !== 'vigente')
            <div class="warn">{{ mb_strtoupper($license->status->label()) }}</div>
        @endif

        <div class="signatures">
            <div style="left:18.5mm">Emisor</div>
            <div style="left:77mm">Sub Gerencia de Actividades<br>Económicas</div>
            <div style="left:135mm">Gerencia de Turismo y<br>Desarrollo Económico</div>
        </div>
        <img class="qr" src="{{ $qr }}" alt="QR de verificación">

        <div class="note">
            NOTA: En caso de cierre de establecimiento, sírvase dar<br>
            aviso a la Sub Gerencia de Actividades Económicas.
        </div>
    </div>
</body>
</html>
