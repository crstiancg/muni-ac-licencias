@php
    $taxpayer = $procedure->taxpayer;
    $establishment = $procedure->establishment;
    $d = $declaration;
    $x = fn ($checked) => $checked ? 'X' : '';
    $num = fn ($value) => $value === null || $value === '' ? '' : number_format((float) $value, 2);
    $length = $d['length'] ?? null;
    $width = $d['width'] ?? null;
    $area = $length && $width ? $length * $width : $establishment->area;
    $sector = $establishment->economic_sector?->value;
    $material = $d['construction_material'] ?? null;
    $flammable = $d['flammable_materials'] ?? null;
    $sign = (bool) ($d['sign'] ?? false);
    $signLength = $sign ? ($d['sign_length'] ?? 0) : 0;
    $signHeight = $sign ? ($d['sign_height'] ?? 0) : 0;
    // Older DJs without a declared representative fall back to the taxpayer's.
    $representative = fn (string $key) => array_key_exists($key, $d) ? $d[$key] : $taxpayer->{$key};
    $logo = config('licencias.logo');
    $hasLogo = $logo && file_exists(public_path($logo));
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Declaración jurada {{ $procedure->code }}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; background: #e5e7eb; }
        .toolbar { text-align: center; margin: 16px; }
        .toolbar button { padding: 8px 20px; font-size: 14px; cursor: pointer; border: 1px solid #111; background: #111; color: #fff; border-radius: 6px; }
        .sheet { width: 210mm; min-height: 297mm; margin: 0 auto 16px; padding: 10mm; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
        :root { --r: 10px; --line: 1px solid #555; }
        /* Rounded boxes: border-radius needs separate borders, so cells only
           draw their right/bottom lines and the table clips the corners. */
        table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: var(--line); border-radius: var(--r); overflow: hidden; }
        td { border: 0; border-right: var(--line); border-bottom: var(--line); padding: 2px 4px; vertical-align: top; }
        td:last-child { border-right: 0; }
        tr:last-child > td { border-bottom: 0; }
        td.n + td { border-left: var(--line); }
        table.plain { border: 0; border-radius: 0; overflow: visible; }
        table.plain > tbody > tr > td, table.plain > tr > td { border: 0; }
        td.v { height: 17px; font-size: 10.5px; text-transform: uppercase; }
        td.l { background: #d9d9d9; font-size: 8.5px; color: #222; height: 12px; padding: 1px 4px; }
        td.n { border-right: 0; border-bottom: 0; }
        .sec { font-weight: 700; font-size: 11px; margin: 8px 0 2px; text-transform: uppercase; }
        .box { display: inline-block; width: 15px; height: 15px; border: 1px solid #111; border-radius: 4px; text-align: center; line-height: 12px; font-weight: 700; vertical-align: middle; }
        .num { display: inline-block; min-width: 60px; border: 1px solid #111; border-radius: var(--r); text-align: center; padding: 0 6px; }
        .field { display: inline-block; border: var(--line); border-radius: var(--r); padding: 2px 8px; min-height: 18px; vertical-align: middle; }
        .legal { text-align: justify; margin: 3px 0; font-size: 9.5px; line-height: 1.25; }
        .frame { border: var(--line); border-radius: var(--r); padding: 6px 8px; margin-top: 6px; }
        .frame h3 { margin: 0 0 3px; font-size: 11.5px; text-transform: uppercase; }
        .sign { width: 260px; margin-left: auto; border-top: 1px solid #111; font-size: 8.5px; font-weight: 700; padding-top: 2px; }
        .sign span { font-weight: 400; }
        .head { display: flex; align-items: flex-start; gap: 10px; }
        .head .logo { width: 60px; text-align: center; }
        .head .logo img, .head .logo svg { width: 52px; height: 52px; }
        .head .entity { font-size: 8.5px; line-height: 1.35; margin-top: 40px; }
        .head .title { flex: 1; text-align: center; }
        .head .title h1 { font-size: 12.5px; margin: 4px 0 0; letter-spacing: .3px; }
        .head .title small { font-size: 8px; color: #444; }
        .office td { height: 20px; font-size: 8.5px; background: #d9d9d9; }
        .office td.v { background: #fff; }
        .code { text-align: right; font-size: 9px; margin-top: 2px; }
        .croquis { height: 120px; position: relative; border: var(--line) !important; border-radius: var(--r); }
        .croquis i { position: absolute; border: var(--line); border-radius: 4px; height: 16px; }
        .gray { background: #d9d9d9; }
        .fee { font-size: 20px; display: inline-block; border: 1px solid #111; border-radius: var(--r); padding: 3px 10px; min-width: 130px; }
        @media print {
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { margin: 0; padding: 0; box-shadow: none; width: auto; min-height: 0; }
            .sheet + .sheet { break-before: page; }
        }
    </style>
</head>
<body>
    <div class="toolbar"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>

    {{-- Hoja 1 --}}
    <div class="sheet">
        <div class="head">
            <div>
                <div class="logo">
                    @if ($hasLogo)
                        <img src="{{ asset($logo) }}" alt="Escudo">
                    @else
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 2.5 29.5 10v2.5h-27V10L16 2.5Zm0 3.3L8.4 10h15.2L16 5.8Z"/><path d="M5 14.5h3.5v10H5zM11 14.5h3.5v10H11zM17.5 14.5H21v10h-3.5zM23.5 14.5H27v10h-3.5z"/><path d="M2.5 26.5h27v3h-27z"/></svg>
                    @endif
                </div>
                <div class="entity">
                    {{ config('licencias.municipality') }}<br>
                    {{ config('licencias.management') }}<br>
                    {{ config('licencias.office') }}
                </div>
            </div>
            <div class="title">
                <h1>SOLICITUD DE DECLARACION JURADA PARA LA LICENCIA DE FUNCIONAMIENTO</h1>
                <small>(original y copias)</small>
            </div>
            <div style="width:190px">
                <table class="office">
                    <tr><td>Nro. de Expediente</td></tr>
                    <tr><td class="v">{{ $procedure->file_number }}</td></tr>
                    <tr><td>Fecha de recepción</td></tr>
                    <tr><td class="v"></td></tr>
                    <tr><td>Nro. de recibo de pago</td></tr>
                    <tr><td class="v">{{ $procedure->paymentOrder?->receipt_number }}</td></tr>
                </table>
                <div class="code">Código de trámite: <strong>{{ $procedure->code }}</strong></div>
            </div>
        </div>

        <div class="sec">I. MODALIDAD DE TRAMITE QUE SE SOLICITA</div>
        <table style="width:70%">
            <tr><td class="v" style="height:70px">@foreach ($procedure->types as $type){{ $type->name }}@if (! $loop->last)<br>@endif @endforeach</td></tr>
        </table>

        <div class="sec">II. DATOS DEL SOLICITANTE</div>
        <table>
            <colgroup><col style="width:28%"><col style="width:26%"><col style="width:13%"><col style="width:9%"><col style="width:12%"><col style="width:12%"></colgroup>
            <tr><td class="v" colspan="6">{{ $taxpayer->name }}</td></tr>
            <tr><td class="l" colspan="6">9. Apellidos y nombres o Razón Social</td></tr>
            <tr>
                <td class="v">{{ $taxpayer->document_number }}</td>
                <td class="v" style="text-transform:none">{{ $taxpayer->email }}</td>
                <td class="v" colspan="2">{{ $taxpayer->phone }}</td>
                <td class="v" colspan="2">{{ $taxpayer->ruc }}</td>
            </tr>
            <tr>
                <td class="l">10. Nro. de DNI o CE</td>
                <td class="l">11. Correo electrónico/e-mail</td>
                <td class="l" colspan="2">12. Nro. de teléfono</td>
                <td class="l" colspan="2">13. RUC</td>
            </tr>
            <tr><td class="v" colspan="2">{{ $taxpayer->address }}</td><td class="v"></td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
            <tr><td class="l" colspan="2">14. Av./Jr./Ca./Pje.</td><td class="l">15. Nro.</td><td class="l">Int</td><td class="l">Mz</td><td class="l">Lt</td></tr>
            <tr><td class="v"></td><td class="v">{{ $taxpayer->district }}</td><td class="v" colspan="2">{{ $taxpayer->province }}</td><td class="v" colspan="2">{{ $taxpayer->department }}</td></tr>
            <tr><td class="l">16. Urb., AA.HH, Barrio, Otros</td><td class="l">17. Distrito</td><td class="l" colspan="2">18. Provincia</td><td class="l" colspan="2">19. Departamento</td></tr>
        </table>

        <div class="sec">III. REPRESENTANTE LEGAL</div>
        <table>
            <colgroup><col style="width:46%"><col style="width:18%"><col style="width:20%"><col style="width:16%"></colgroup>
            <tr><td class="v" colspan="4">{{ $representative('representative_name') }}</td></tr>
            <tr>
                <td class="l">20. Apellidos y nombres</td>
                <td class="v">{{ $representative('representative_document') }}</td>
                <td class="v">{{ $representative('representative_sunarp') }}</td>
                <td class="v">{{ $representative('representative_phone') }}</td>
            </tr>
            <tr><td class="n"></td><td class="l">21. Nro. de DNI o CE</td><td class="l">22. Nro. de Partida P.(SUNARP)</td><td class="l">23. Nro. de Teléfono</td></tr>
        </table>

        <div class="sec">IV. DATOS DEL ESTABLECIMIENTO</div>
        <table>
            <colgroup><col style="width:16%"><col style="width:12%"><col style="width:13%"><col style="width:4%"><col style="width:14%"><col style="width:4%"><col style="width:14%"><col style="width:5%"><col style="width:18%"></colgroup>
            <tr><td class="v" colspan="5">{{ $establishment->trade_name }}</td><td class="v" colspan="4">{{ $establishment->activity }}</td></tr>
            <tr><td class="l" colspan="5">24. Nombre comercial</td><td class="l" colspan="4">25. Giro o actividad</td></tr>
            <tr>
                <td class="v" colspan="5">{{ $establishment->street_type ? $establishment->street_type->value.'. ' : '' }}{{ $establishment->street }}</td>
                <td class="v" colspan="2">{{ $establishment->number }}{{ $establishment->interior ? ' INT. '.$establishment->interior : '' }}{{ $establishment->block ? ' MZ. '.$establishment->block : '' }}{{ $establishment->lot ? ' LT. '.$establishment->lot : '' }}</td>
                <td class="v" colspan="2">{{ $establishment->settlement_name }}</td>
            </tr>
            <tr><td class="l" colspan="5">26. Av./Jr./Ca./Pje.</td><td class="l" colspan="2">27. Nro. · Int · Mz · Lt</td><td class="l" colspan="2">28. Urb., AA.HH, Barrio, otros</td></tr>
            <tr>
                <td class="v">COMERCIO <span class="box">{{ $x($sector === 'comercio') }}</span></td>
                <td class="v">INDUSTRIA <span class="box">{{ $x($sector === 'industria') }}</span></td>
                <td class="v" colspan="2">SERVICIO <span class="box">{{ $x($sector === 'servicio') }}</span></td>
                <td class="v" style="text-align:right">{{ $num($length) }} <span style="text-transform:none">mts.</span></td>
                <td class="n" style="text-align:center">X</td>
                <td class="v" style="text-align:right">{{ $num($width) }} <span style="text-transform:none">mts.</span></td>
                <td class="n" style="text-align:center">=</td>
                <td class="v" style="text-align:right">{{ $num($area) }} M2</td>
            </tr>
            <tr><td class="l" colspan="4">29. Sector Económico</td><td class="l">30. Área Largo</td><td class="n"></td><td class="l">31. Área Ancho</td><td class="n"></td><td class="l">32. Área Total</td></tr>
        </table>

        <div class="sec">V. OTROS DATOS DEL ESTABLECIMIENTO</div>
        <table class="plain">
            <colgroup><col style="width:52%"><col style="width:48%"></colgroup>
            <tr>
                <td rowspan="4" class="croquis">
                    <div style="font-size:8.5px">33. Croquis de ubicación</div>
                    <i style="left:6px;top:24px;width:24%"></i><i style="left:30%;top:24px;width:38%"></i><i style="left:74%;top:24px;width:22%"></i>
                    <i style="left:6px;top:58px;width:24%"></i><i style="left:30%;top:58px;width:38%"></i><i style="left:74%;top:58px;width:22%"></i>
                    <i style="left:6px;top:92px;width:24%"></i><i style="left:30%;top:92px;width:38%"></i><i style="left:74%;top:92px;width:22%"></i>
                </td>
                <td class="n">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                        <span>34. Capacidad a foro (CA)</span>
                        <table style="width:110px"><tr><td class="v" style="text-align:center">{{ $establishment->capacity }}</td></tr><tr><td class="l">Cantidad de personas</td></tr></table>
                    </div>
                    <div class="legal" style="margin-left:14px">CA=Capacidad de aforo área público (CP) +<br>&nbsp;&nbsp;&nbsp;&nbsp;Capacidad de aforo área administrativa o de transformación (CT)<br>CP=3 personas x m2 &nbsp;&nbsp;&nbsp; CT=1 persona x 3 m2</div>
                </td>
            </tr>
            <tr>
                <td class="n">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="margin-left:14px">35. Manipulación y/o uso de materiales<br>combustibles y/o tóxicos y/o inflamables</span>
                        <table style="width:110px"><tr><td class="v" style="text-align:center">{{ $x($flammable === true) }}</td><td class="v" style="text-align:center">{{ $x($flammable === false) }}</td></tr><tr><td class="l">SI</td><td class="l">NO</td></tr></table>
                    </div>
                </td>
            </tr>
            <tr>
                <td class="n">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="margin-left:14px">36. Material de construcción predominante</span>
                        <table style="width:110px"><tr><td class="v" style="text-align:center">{{ $x($material === 'noble') }}</td><td class="v" style="text-align:center">{{ $x(in_array($material, ['rustico', 'mixto'], true)) }}</td></tr><tr><td class="l">Noble</td><td class="l">Rústico</td></tr></table>
                    </div>
                </td>
            </tr>
            <tr><td class="n"></td></tr>
        </table>

        <div class="frame">
            <h3>37. DECLARO BAJO JURAMENTO QUE:</h3>
            <p class="legal">- Los datos consignados anteriormente expresan la verdad y que la documentación presentada es veraz.</p>
            <p class="legal">- Tengo conocimiento que la presente declaración y la documentación presentada está sujeta a verificación posterior de su veracidad, en caso de haber proporcionado información, documentación y/o declaraciones que no correspondan a la verdad, se me aplicarán las sanciones administrativas y/o penales correspondientes a, REVOCANDOSE AUTOMATICAMENTE las autorizaciones que se me otorguen como consecuencia de esta solicitud.</p>
            <p class="legal">- Tengo conocimiento que la emisión de la Licencia de Funcionamiento para el establecimiento esta sujeta a la aprobación de la inspección básica.</p>
            <div style="display:flex;align-items:flex-end;gap:20px">
                <p class="legal" style="flex:1">- Brindare las facilidades necesarias para las acciones de fiscalización y control a las autoridades municipales competentes</p>
                <div class="sign">Firma del solicitante, representante legal o apoderado<br><span>DNI/CE: ..........................................</span></div>
            </div>
        </div>
    </div>

    {{-- Hoja 2 --}}
    <div class="sheet">
        <div class="frame" style="margin-top:0">
            <h3>38. VI. DECLARACION JURADA SECTORIAL</h3>
            <div style="display:flex;gap:20px;align-items:flex-end">
                <div style="flex:1">
                    <p class="legal">Declaro bajo juramento que cuento con los permisos sectoriales necesarios para desarrollar la actividad o giro mencionado (en el punto 29), de acuerdo al Plan de Director y Zonificación establecida por la {{ config('licencias.municipality') }}</p>
                    <table><tr><td class="v" style="height:22px">{{ $d['zoning'] ?? '' }}</td></tr><tr><td class="l">El establecimiento es clasificado como uso compatible</td></tr></table>
                </div>
                <div class="sign" style="margin-bottom:24px">Firma del solicitante, representante legal o apoderado<br><span>DNI/CE: ..........................................</span></div>
            </div>
        </div>

        <div class="frame">
            <h3>39. VII. DECLARACION JURADA DE PROCESO DE INSPECCION TECNICA DE SEGURIDAD EN EDIFICACIONES - ITSE (D.S.058-2014-PCM)</h3>
            <p class="legal">- Modelo 1A (EX-POST): Establecimientos con un área de hasta 100 m2 y con una capacidad de almacenamiento no mayor del 30% del área total, donde no se manipulan ni utilizan materiales inflamables, combustibles o tóxicos. Este modelo no incluye centros de recreación de espectáculos, deportivos, culturales o de salud.</p>
            <p class="legal">- Tengo conocimiento que la presente declaración y la documentación presentada está sujeta a verificación posterior para su Inspección Técnica de Seguridad en Edificaciones Básicas Ex Post, en caso de haber proporcionado información, documentación y/o declaraciones que no respondan a la verdad, se me aplicarán las sanciones administrativas y/o penales correspondientes, REVOCANDOSE AUTOMATICAMENTE las autorizaciones que se me otorguen como consecuencia de esta solicitud, de acuerdo a las normativas vigentes Ley N° 28976, Decreto Legislativo N° 776 D.S. 058-2014-PCM. O.M. N° 421-2014-CMPP.</p>
            <p class="legal" style="margin-top:8px">Declaro bajo juramento que mi establecimiento cuenta con las siguientes medidas y equipo básico de seguridad.</p>
            <table class="plain" style="margin:6px 0">
                <colgroup><col style="width:16%"><col style="width:8%"><col style="width:20%"><col style="width:8%"><col style="width:36%"><col style="width:12%"></colgroup>
                <tr>
                    <td class="n">- Extintor Tipo:</td>
                    <td class="n">PQS<br>CO2</td>
                    <td class="n"><span class="box">{{ $x(($d['extinguisher_pqs_kg'] ?? 0) > 0) }}</span> Kilos<br><span class="box">{{ $x(($d['extinguisher_co2_kg'] ?? 0) > 0) }}</span> Kilos</td>
                    <td class="n"><span class="num">{{ $num($d['extinguisher_pqs_kg'] ?? 0) }}</span><br><span class="num">{{ $num($d['extinguisher_co2_kg'] ?? 0) }}</span></td>
                    <td class="n" style="text-align:right">- Llaves termomagnéticas:</td>
                    <td class="n"><span class="box">{{ $x($d['breakers'] ?? false) }}</span></td>
                </tr>
                <tr><td class="n" colspan="6" style="height:8px"></td></tr>
                <tr>
                    <td class="n">- Señalización:</td>
                    <td class="n">SI<br>NO</td>
                    <td class="n"><span class="box">{{ $x(($d['signage'] ?? false) === true) }}</span><br><span class="box">{{ $x(($d['signage'] ?? null) === false) }}</span></td>
                    <td class="n"></td>
                    <td class="n" style="text-align:right">- Botiquín implementado:<br><br>- Cables entubados o empotrados</td>
                    <td class="n"><span class="box">{{ $x($d['first_aid_kit'] ?? false) }}</span><br><br><span class="box">{{ $x($d['wiring_conduits'] ?? false) }}</span></td>
                </tr>
            </table>
            <div style="display:flex;gap:20px;align-items:flex-end">
                <p class="legal" style="flex:1">Así mismo declaro bajo juramento que en caso de observaciones formuladas por el inspector, me comprometo a levantarlas en un plazo no mayor de 7 días hábiles, me afirmo y me rectifico en lo expresado, en señal de lo cual firmo el presente documento</p>
                <div class="sign">Firma del solicitante, representante legal o apoderado<br><span>DNI/CE: ..........................................</span></div>
            </div>
        </div>

        <div class="frame">
            <h3>40. VIII. DECLARACION JURADA DE ANUNCIO ADOSADO A FACHADA Y/O CARACTERISTICAS DEL ANUNCIO</h3>
            <p class="legal">Declaro bajo juramento que mi establecimiento contará con un anuncio adosado a fachada.</p>
            <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
                <span>Luminoso</span>
                SI <span class="box">{{ $x($sign && ($d['sign_luminous'] ?? null) === true) }}</span>
                NO <span class="box">{{ $x($sign && ($d['sign_luminous'] ?? null) === false) }}</span>
                <span style="margin-left:14px">Características</span>
                <span class="field" style="flex:1">{{ $d['sign_features'] ?? '' }}</span>
                <span>Material</span>
                <span class="field" style="flex:1">{{ $d['sign_material'] ?? '' }}</span>
            </div>
            <div style="display:flex;align-items:flex-start;justify-content:flex-end;gap:8px">
                <span style="margin-top:3px">Medidas:</span>
                <table style="width:150px"><tr><td class="v" style="text-align:center">{{ $num($signLength) }}</td><td class="v" style="width:40px;text-transform:none">mts.</td></tr><tr><td class="l" colspan="2" style="text-align:center">Largo</td></tr></table>
                <span style="margin-top:3px">X</span>
                <table style="width:150px"><tr><td class="v" style="text-align:center">{{ $num($signHeight) }}</td><td class="v" style="width:40px;text-transform:none">mts.</td></tr><tr><td class="l" colspan="2" style="text-align:center">Alto</td></tr></table>
                <span style="margin-top:3px">=</span>
                <table style="width:150px"><tr><td class="v" style="text-align:center">{{ $sign ? $num($signLength * $signHeight) : '0' }}</td><td class="v" style="width:40px">M2</td></tr><tr><td class="l" colspan="2" style="text-align:center">Total</td></tr></table>
            </div>
            <div style="display:flex;gap:20px;align-items:flex-end">
                <div style="width:58%">
                <div style="font-size:8.5px">Gráfico</div>
                <table>
                    <tr><td class="v" style="height:80px;text-transform:none">{{ $d['sign_description'] ?? '' }}</td></tr>
                    <tr><td class="l">Estructura, Materiales, Características, Color</td></tr>
                </table>
                </div>
                <div class="sign" style="margin-bottom:14px">Firma del solicitante, representante legal o apoderado<br><span>DNI/CE: ..........................................</span></div>
            </div>
        </div>

        <div class="sec" style="margin-top:10px">41. ORDEN DE PAGO</div>
        <p class="legal">El administrativo solicitante, debe de abonar en caja un único pago correspondiente al derecho de tramite por:</p>
        <table><tr><td class="v" style="height:130px">@foreach ($procedure->types as $type){{ $type->name }}@if (! $loop->last)<br>@endif @endforeach</td></tr></table>

        <p style="margin-top:24px;font-size:10.5px">Derecho de trámite: &nbsp;&nbsp; <span style="font-size:18px">S/.</span> <span class="fee">{{ $fee === null ? '' : number_format($fee, 2) }}</span></p>

        <div style="width:220px;margin:20px 0 0 auto;text-align:center">
            <div style="border-bottom:1px solid #111;padding-bottom:2px">{{ $procedure->created_at->format('Y-m-d H:i:s') }}</div>
            <div>Fecha/Hora</div>
        </div>
        <p style="margin-top:6px">NOTA: En caso se deje abandonado el presente trámite, se archivará automáticamente a los 10 días de su inicio de presentación.</p>
    </div>
</body>
</html>
