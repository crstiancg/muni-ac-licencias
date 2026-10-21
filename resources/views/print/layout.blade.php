<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title')</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #f3f4f6; }
        .sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 15mm; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
        .toolbar { text-align: center; margin: 16px; }
        .toolbar button { padding: 8px 20px; font-size: 14px; cursor: pointer; border: 1px solid #111; background: #111; color: #fff; border-radius: 6px; }
        header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
        header .entity { font-size: 15px; font-weight: 700; text-transform: uppercase; }
        header .office { font-size: 12px; color: #444; }
        h1 { font-size: 18px; text-align: center; margin: 12px 0 4px; text-transform: uppercase; letter-spacing: .5px; }
        .number { text-align: center; font-size: 16px; font-weight: 700; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 8px; text-align: left; vertical-align: top; }
        table.grid th, table.grid td { border: 1px solid #999; }
        table.grid th { background: #f3f4f6; }
        .data th { width: 32%; color: #444; font-weight: 600; }
        .right { text-align: right; }
        .muted { color: #555; }
        .total td { font-weight: 700; font-size: 14px; }
        .signatures { display: flex; justify-content: space-around; margin-top: 70px; }
        .signatures div { width: 40%; border-top: 1px solid #111; text-align: center; padding-top: 4px; }
        .stamp { display: inline-block; border: 2px solid #b91c1c; color: #b91c1c; font-weight: 700; padding: 4px 10px; transform: rotate(-4deg); }
        @media print {
            body { background: #fff; }
            .sheet { margin: 0; padding: 0; box-shadow: none; width: auto; min-height: 0; }
            .toolbar { display: none; }
        }
    </style>
</head>
<body>
    <div class="toolbar"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
    <div class="sheet">
        <header>
            <div>
                <div class="entity">{{ config('licencias.municipality') }}</div>
                <div class="office">{{ config('licencias.office') }}</div>
            </div>
            <div class="muted">Impreso: {{ now()->format('d/m/Y H:i') }}</div>
        </header>

        @yield('content')
    </div>
</body>
</html>
