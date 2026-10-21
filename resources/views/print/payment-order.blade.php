@extends('print.layout')

@section('title', "Orden de pago {$order->code}")

@section('content')
    <h1>Orden de pago</h1>
    <div class="number">{{ $order->code }}</div>

    @if ($order->status->value === 'anulada')
        <p style="text-align:center"><span class="stamp">ANULADA</span></p>
    @endif

    <table class="data">
        <tr><th>Trámite</th><td>{{ $procedure->code }}@if ($procedure->file_number) · Exp. {{ $procedure->file_number }}@endif</td></tr>
        <tr><th>Contribuyente</th><td>{{ $procedure->taxpayer->name }}</td></tr>
        <tr><th>Documento</th><td>{{ strtoupper($procedure->taxpayer->document_type->value) }} {{ $procedure->taxpayer->document_number }}@if ($procedure->taxpayer->ruc) · RUC {{ $procedure->taxpayer->ruc }}@endif</td></tr>
        <tr><th>Establecimiento</th><td>{{ $procedure->establishment->activity }} — {{ $procedure->establishment->full_address }}</td></tr>
        <tr><th>Fecha de emisión</th><td>{{ $order->created_at->format('d/m/Y H:i') }}</td></tr>
    </table>

    <table class="grid" style="margin-top:16px">
        <thead>
            <tr><th>Concepto (TUPA)</th><th class="right">% UIT</th><th class="right">Importe S/</th></tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="right">{{ number_format((float) $item->uit_percentage, 4) }}</td>
                    <td class="right">{{ number_format((float) $item->amount, 2) }}</td>
                </tr>
            @endforeach
            <tr class="total">
                <td colspan="2" class="right">TOTAL A PAGAR</td>
                <td class="right">S/ {{ number_format((float) $order->total, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <p class="muted">Calculado con la UIT {{ $order->uit_year }} de S/ {{ number_format((float) $order->uit_amount, 2) }}. Presente esta orden en Caja.</p>

    @if ($order->status->value === 'pagada')
        <p><strong>Pagado:</strong> comprobante {{ $order->receipt_number }} del {{ $order->paid_at?->format('d/m/Y') }}.</p>
    @endif

    <div class="signatures">
        <div>{{ $order->issuedBy?->name ?? 'Emitido por' }}</div>
        <div>Caja</div>
    </div>
@endsection
