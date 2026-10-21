@extends('print.layout')

@section('title', "Orden de pago {$order->code}")

@section('content')
    <h1>Orden de pago</h1>
    <div class="number">{{ $order->code }}</div>

    @if ($order->status->value === 'anulada')
        <p style="text-align:center"><span class="stamp">ANULADA</span></p>
    @endif

    <table class="data">
        @if ($order->procedure)
            <tr><th>Trámite</th><td>{{ $order->procedure->code }}@if ($order->procedure->file_number) · Exp. {{ $order->procedure->file_number }}@endif</td></tr>
        @else
            <tr><th>Tipo</th><td>{{ $order->kind->label() }}</td></tr>
        @endif
        <tr><th>Contribuyente</th><td>{{ $order->payer_name }}</td></tr>
        @if ($order->payer_document)
            <tr><th>Documento</th><td>{{ $order->payer_document }}</td></tr>
        @endif
        @if ($order->procedure)
            <tr><th>Establecimiento</th><td>{{ $order->procedure->establishment->activity }} — {{ $order->procedure->establishment->full_address }}</td></tr>
        @endif
        <tr><th>Fecha de emisión</th><td>{{ $order->created_at->format('d/m/Y H:i') }}</td></tr>
    </table>

    <table class="grid" style="margin-top:16px">
        <thead>
            <tr>
                <th>Concepto</th>
                @if ($order->procedure)<th class="right">% UIT</th>@endif
                <th class="right">Importe S/</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    @if ($order->procedure)<td class="right">{{ number_format((float) $item->uit_percentage, 4) }}</td>@endif
                    <td class="right">{{ number_format((float) $item->amount, 2) }}</td>
                </tr>
            @endforeach
            <tr class="total">
                <td colspan="{{ $order->procedure ? 2 : 1 }}" class="right">TOTAL A PAGAR</td>
                <td class="right">S/ {{ number_format((float) $order->total, 2) }}</td>
            </tr>
        </tbody>
    </table>

    @if ($order->procedure)
        <p class="muted">Calculado con la UIT {{ $order->uit_year }} de S/ {{ number_format((float) $order->uit_amount, 2) }}. Presente esta orden en Caja.</p>
    @else
        <p class="muted">Presente esta orden en Caja.@if ($order->notes) {{ $order->notes }}@endif</p>
    @endif

    @if ($order->status->value === 'pagada')
        <p><strong>Pagado:</strong> comprobante {{ $order->receipt_number }} del {{ $order->paid_at?->format('d/m/Y') }}.</p>
    @endif

    <div class="signatures">
        <div>{{ $order->issuedBy?->name ?? 'Emitido por' }}</div>
        <div>Caja</div>
    </div>
@endsection
