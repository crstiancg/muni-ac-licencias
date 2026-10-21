@extends('print.layout')

@section('title', "{$license->type->label()} {$license->number}")

@section('content')
    <h1>{{ $license->type->label() }}</h1>
    <div class="number">N° {{ $license->number }}</div>

    @if ($license->duplicates > 0)
        <p style="text-align:center"><span class="stamp" style="border-color:#111;color:#111">DUPLICADO{{ $license->duplicates > 1 ? " N° {$license->duplicates}" : '' }}</span></p>
    @endif

    @if ($license->status->value !== 'vigente')
        <p style="text-align:center"><span class="stamp">{{ mb_strtoupper($license->status->label()) }}</span></p>
    @endif

    <table style="margin-top:8px">
        <tr>
            <td style="width:72%; padding:0">
                <table class="data">
                    <tr><th>Titular</th><td><strong>{{ $license->holder_name }}</strong></td></tr>
                    <tr><th>Documento</th><td>{{ $license->holder_document }}</td></tr>
                    @if ($license->trade_name)
                        <tr><th>Nombre comercial</th><td>{{ $license->trade_name }}</td></tr>
                    @endif
                    <tr><th>Giro</th><td>{{ $license->activity }}</td></tr>
                    <tr><th>Dirección</th><td>{{ $license->address }}</td></tr>
                    @if ($license->area)
                        <tr><th>Área</th><td>{{ number_format((float) $license->area, 2) }} m²</td></tr>
                    @endif
                    @if ($license->risk_level)
                        <tr><th>Nivel de riesgo</th><td>{{ $license->risk_level->label() }}</td></tr>
                    @endif
                    @if ($license->sign_kind)
                        <tr><th>Anuncio</th><td>{{ ucfirst($license->sign_kind) }}, {{ $license->sign_faces }} cara(s), {{ number_format((float) $license->sign_width, 2) }} × {{ number_format((float) $license->sign_height, 2) }} m @if ($license->sign_material)· {{ $license->sign_material }}@endif</td></tr>
                    @endif
                    <tr><th>Fecha de emisión</th><td>{{ $license->issued_at->format('d/m/Y') }}</td></tr>
                    <tr><th>Vigencia</th><td>{{ $license->valid_until ? 'Hasta el '.$license->valid_until->format('d/m/Y') : 'Indeterminada' }}</td></tr>
                </table>
            </td>
            <td style="text-align:center; padding:0 0 0 12px">
                <img src="{{ $qr }}" alt="QR de verificación" style="width:42mm; height:42mm">
                <div class="muted" style="font-size:10px">Escanee para verificar<br>su vigencia</div>
            </td>
        </tr>
    </table>

    <p class="muted" style="margin-top:16px; font-size:11px">
        Este documento debe exhibirse en un lugar visible del establecimiento. Su validez puede verificarse en
        {{ $license->verificationUrl() }}
    </p>

    <div class="signatures">
        <div>{{ config('licencias.office') }}</div>
    </div>
@endsection
