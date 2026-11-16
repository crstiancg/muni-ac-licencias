@extends('print.layout')

@section('title', "Acta de fiscalización {$inspection->code}")

@php
    $license = $inspection->license;
    $statusAtVisit = $inspection->license_status ? \App\Enums\LicenseStatus::from($inspection->license_status) : null;
    $checks = collect(\App\Models\Inspection::CHECKS)
        ->map(fn (string $label, string $key) => ['label' => $label, 'ok' => $inspection->checks[$key] ?? null])
        ->filter(fn (array $check) => $check['ok'] !== null);
    $hasLocation = $inspection->latitude !== null && $inspection->longitude !== null;
@endphp

@section('content')
    <style>
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .4px; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 3px; }
        .result { display: inline-block; border: 2px solid #111; font-weight: 700; font-size: 14px; padding: 3px 12px; text-transform: uppercase; }
        .checks td:last-child { width: 18%; text-align: center; font-weight: 700; }
        .checks .no { color: #b91c1c; }
        .notes { white-space: pre-line; border: 1px solid #999; padding: 8px; min-height: 18mm; }
        .confirmed { border: 1px solid #0b6b4f; color: #0b6b4f; padding: 6px 8px; margin-top: 8px; font-weight: 600; }
        .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
        .photos figure { margin: 0; break-inside: avoid; }
        .photos img { width: 100%; height: 48mm; object-fit: cover; border: 1px solid #999; display: block; }
        .photos figcaption { font-size: 10px; color: #555; text-align: center; margin-top: 2px; }
        .signatures { break-inside: avoid; }
        .signatures div { font-size: 11px; }
        .signatures small { display: block; color: #555; text-align: left; margin-top: 6px; }
    </style>

    <h1>Acta de fiscalización</h1>
    <div class="number">{{ $inspection->code }}</div>

    <table class="data">
        <tr><th>Fecha y hora de la visita</th><td>{{ $inspection->visited_at->format('d/m/Y H:i') }}</td></tr>
        <tr><th>Fiscalizador</th><td>{{ $inspection->inspector->name }}</td></tr>
    </table>

    <h2>Establecimiento</h2>
    <table class="data">
        @if ($license)
            <tr><th>Nombre comercial</th><td>{{ $license->trade_name ?? '—' }}</td></tr>
            <tr><th>Titular</th><td>{{ $license->holder_name }}</td></tr>
            @if ($license->holder_document)
                <tr><th>Documento</th><td>{{ $license->holder_document }}</td></tr>
            @endif
            <tr><th>Dirección</th><td>{{ $license->address }}</td></tr>
            <tr><th>Giro</th><td>{{ $license->activity }}</td></tr>
            <tr>
                <th>{{ $license->type->label() }}</th>
                <td>N° {{ $license->number }}@if ($license->series) · Serie {{ $license->series }}@endif
                    @if ($license->issued_at) · emitida el {{ $license->issued_at->format('d/m/Y') }}@endif</td>
            </tr>
            <tr><th>Situación al visitar</th><td>{{ $statusAtVisit?->label() ?? '—' }}</td></tr>
        @else
            <tr><th>Nombre del negocio</th><td>{{ $inspection->business_name }}</td></tr>
            <tr><th>Responsable</th><td>{{ $inspection->holder_name ?? '—' }}</td></tr>
            <tr><th>DNI / RUC</th><td>{{ $inspection->holder_document ?? '—' }}</td></tr>
            <tr><th>Dirección</th><td>{{ $inspection->address }}</td></tr>
            <tr><th>Giro</th><td>{{ $inspection->activity ?? '—' }}</td></tr>
            <tr><th>Licencia</th><td>Sin licencia de funcionamiento</td></tr>
        @endif
        <tr>
            <th>Ubicación (GPS)</th>
            <td>
                @if ($hasLocation)
                    {{ $inspection->latitude }}, {{ $inspection->longitude }}@if ($inspection->gps_accuracy) (±{{ $inspection->gps_accuracy }} m)@endif
                @else
                    No registrada
                @endif
            </td>
        </tr>
    </table>

    <h2>Resultado</h2>
    <p><span class="result">{{ $inspection->result->label() }}</span> <span class="muted">{{ $inspection->result->description() }}</span></p>

    @if ($inspection->confirmed_license)
        <p class="confirmed">En esta visita se confirmó la vigencia de la licencia migrada del sistema anterior: el negocio sigue funcionando con ella.</p>
    @endif

    @if ($checks->isNotEmpty())
        <h2>Verificación</h2>
        <table class="grid checks">
            @foreach ($checks as $check)
                <tr>
                    <td>{{ $check['label'] }}</td>
                    <td @class(['no' => ! $check['ok']])>{{ $check['ok'] ? 'Sí' : 'No' }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <h2>Observaciones</h2>
    <div class="notes">{{ $inspection->notes ?? 'Ninguna.' }}</div>

    @if ($inspection->photos->isNotEmpty())
        <h2>Registro fotográfico</h2>
        <div class="photos">
            @foreach ($inspection->photos as $photo)
                <figure>
                    <img src="{{ route('inspections.photo', $photo) }}" alt="Foto {{ $loop->iteration }}">
                    <figcaption>Foto {{ $loop->iteration }}</figcaption>
                </figure>
            @endforeach
        </div>
    @endif

    <div class="signatures">
        <div>
            {{ $inspection->inspector->name }}<br>Fiscalizador
        </div>
        <div>
            Conductor o representante del establecimiento
            <small>Nombre: ______________________________</small>
            <small>DNI: _______________</small>
        </div>
    </div>
@endsection
