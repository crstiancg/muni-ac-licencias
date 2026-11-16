<?php

namespace App\Support;

use App\Models\Establishment;
use App\Models\Inspection;
use App\Models\InspectionCase;
use App\Models\ItseCertificate;
use App\Models\License;
use App\Models\Market;
use App\Models\MarketStall;
use App\Models\PaymentOrder;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use App\Models\Uit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * How the audit speaks to people: each log (table) as a module and each
 * column with its Spanish name.
 */
final class AuditCatalog
{
    /**
     * Log name (table) => module label, audited model and the route that
     * shows a record (null when it has no page of its own).
     *
     * @var array<string, array{label: string, model: class-string<Model>, route: string|null}>
     */
    public const array MODULES = [
        'taxpayers' => ['label' => 'Contribuyentes', 'model' => Taxpayer::class, 'route' => 'taxpayers.show'],
        'establishments' => ['label' => 'Establecimientos', 'model' => Establishment::class, 'route' => null],
        'licenses' => ['label' => 'Licencias', 'model' => License::class, 'route' => 'licenses.show'],
        'itse_certificates' => ['label' => 'ITSE', 'model' => ItseCertificate::class, 'route' => null],
        'inspections' => ['label' => 'Fiscalización', 'model' => Inspection::class, 'route' => 'inspections.show'],
        'inspection_cases' => ['label' => 'Casos sin licencia', 'model' => InspectionCase::class, 'route' => 'inspections.cases.show'],
        'payment_orders' => ['label' => 'Órdenes de pago', 'model' => PaymentOrder::class, 'route' => 'payment-orders.show'],
        'markets' => ['label' => 'Mercados', 'model' => Market::class, 'route' => 'markets.show'],
        'market_stalls' => ['label' => 'Puestos', 'model' => MarketStall::class, 'route' => 'market-stalls.show'],
        'procedure_types' => ['label' => 'Tipos de trámite', 'model' => ProcedureType::class, 'route' => null],
        'uits' => ['label' => 'UIT', 'model' => Uit::class, 'route' => null],
    ];

    /**
     * Column => Spanish name. Shared columns mean the same in every table;
     * the few that differ per module are overridden below.
     *
     * @var array<string, string>
     */
    private const array FIELDS = [
        'year' => 'Año',
        'sequence' => 'Correlativo',
        'code' => 'Código',
        'number' => 'Número',
        'series' => 'Serie del formato',
        'type' => 'Tipo',
        'name' => 'Nombre',
        'description' => 'Descripción',
        'notes' => 'Observaciones',
        'status' => 'Estado',
        'status_reason' => 'Motivo del estado',
        'status_changed_at' => 'Fecha del cambio de estado',
        'is_active' => 'Activo',
        'legacy_id' => 'ID en el sistema anterior',
        'legacy_procedure_id' => 'Trámite en el sistema anterior',
        'legacy_amount' => 'Monto en el sistema anterior',
        'legacy_itse_type' => 'Tipo de ITSE (sistema anterior)',
        'procedure_id' => 'Trámite',
        'taxpayer_id' => 'Contribuyente',
        'establishment_id' => 'Establecimiento',
        'license_id' => 'Licencia',
        'market_id' => 'Mercado',
        'issued_by' => 'Emitido por',
        'registered_by' => 'Registrado por',
        'confirmed_by' => 'Confirmado por',
        'payment_registered_by' => 'Pago registrado por',
        'inspector_id' => 'Fiscalizador',
        'issued_at' => 'Fecha de emisión',
        'valid_until' => 'Vigente hasta',
        'confirmed_at' => 'Fecha de confirmación',
        'confirmation_note' => 'Nota de confirmación',
        'duplicates' => 'Duplicados',
        'replaced_by_id' => 'Reemplazada por',
        'qr_token' => 'Código QR',
        'holder_name' => 'Titular',
        'holder_document' => 'Documento del titular',
        'trade_name' => 'Nombre comercial',
        'activity' => 'Giro',
        'economic_sector' => 'Sector económico',
        'address' => 'Dirección',
        'area' => 'Área (m²)',
        'capacity' => 'Aforo',
        'risk_level' => 'Nivel de riesgo',
        'observations' => 'Observaciones impresas',
        'sign_kind' => 'Tipo de anuncio',
        'sign_faces' => 'Caras del anuncio',
        'sign_material' => 'Material del anuncio',
        'sign_width' => 'Largo del anuncio',
        'sign_height' => 'Alto del anuncio',
        'street_type' => 'Tipo de vía',
        'street' => 'Vía',
        'interior' => 'Interior',
        'block' => 'Manzana',
        'lot' => 'Lote',
        'settlement_type' => 'Tipo de urbanización',
        'settlement_name' => 'Urbanización',
        'inspection_timing' => 'Momento de la inspección',
        'inspected_at' => 'Fecha de inspección',
        'inspector' => 'Inspector',
        'document_type' => 'Tipo de documento',
        'document_number' => 'N° de documento',
        'ruc' => 'RUC',
        'email' => 'Correo',
        'phone' => 'Teléfono',
        'district' => 'Distrito',
        'province' => 'Provincia',
        'department' => 'Departamento',
        'representative_name' => 'Representante legal',
        'representative_document' => 'Documento del representante',
        'representative_sunarp' => 'Partida SUNARP del representante',
        'representative_phone' => 'Teléfono del representante',
        'payer_name' => 'Pagador',
        'payer_document' => 'Documento del pagador',
        'kind' => 'Concepto',
        'uit_year' => 'Año de la UIT',
        'uit_amount' => 'Valor de la UIT',
        'total' => 'Total',
        'receipt_number' => 'N° de comprobante',
        'paid_at' => 'Fecha de pago',
        'payment_frequency' => 'Frecuencia de pago',
        'stall_type' => 'Tipo de puesto',
        'fee' => 'Tarifa',
        'tupa_code' => 'Código TUPA',
        'uit_percentage' => '% de la UIT',
        'fixed_amount' => 'Monto fijo',
        'validity_months' => 'Vigencia (meses)',
        'license_effect' => 'Efecto sobre la licencia',
        'processing_days' => 'Plazo (días)',
        'legal_basis' => 'Base legal',
        'position' => 'Orden',
        'amount' => 'Monto',
        'visited_at' => 'Fecha de visita',
        'result' => 'Resultado',
        'license_status' => 'Estado de la licencia al visitar',
        'checks' => 'Verificación',
        'business_name' => 'Nombre del negocio',
        'latitude' => 'Latitud',
        'longitude' => 'Longitud',
        'gps_accuracy' => 'Precisión del GPS (m)',
        'inspection_case_id' => 'Caso de seguimiento',
        'notice_number' => 'N° de notificación',
        'notified_at' => 'Fecha de notificación',
        'deadline' => 'Plazo hasta',
        'resolved_at' => 'Fecha de cierre',
        'resolution_note' => 'Sustento del cierre',
        'opened_by' => 'Abierto por',
        'resolved_by' => 'Cerrado por',
    ];

    /**
     * Per-module meaning of a shared column.
     *
     * @var array<string, array<string, string>>
     */
    private const array MODULE_FIELDS = [
        'establishments' => ['number' => 'N° de puerta'],
        'inspections' => ['holder_name' => 'Responsable', 'holder_document' => 'DNI/RUC del responsable', 'address' => 'Dirección del negocio'],
        'inspection_cases' => ['holder_name' => 'Responsable', 'holder_document' => 'DNI/RUC del responsable', 'address' => 'Dirección del negocio'],
        'market_stalls' => ['code' => 'N° de puesto'],
    ];

    /**
     * Inside a JSON column (e.g. the inspection checks).
     *
     * @var array<string, string>
     */
    public const array NESTED = Inspection::CHECKS;

    public static function module(string $logName): string
    {
        return self::MODULES[$logName]['label'] ?? Str::headline($logName);
    }

    public static function field(string $field, ?string $logName = null): string
    {
        return self::MODULE_FIELDS[$logName][$field]
            ?? self::FIELDS[$field]
            ?? Str::ucfirst(str_replace('_', ' ', $field));
    }

    /**
     * Audited columns of a module, as filter options.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function fields(string $logName): array
    {
        $model = self::MODULES[$logName]['model'] ?? null;

        if (! $model) {
            return [];
        }

        return collect((new $model)->getFillable())
            ->map(fn (string $field) => ['value' => $field, 'label' => self::field($field, $logName)])
            ->sortBy('label', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * How a record is called: its code, number or name.
     */
    public static function subjectLabel(?Model $subject, ?int $id): string
    {
        if (! $subject) {
            return $id ? "#{$id}" : '—';
        }

        foreach (['code', 'number', 'name', 'trade_name', 'holder_name', 'year'] as $attribute) {
            if (filled($subject->getAttribute($attribute))) {
                return (string) $subject->getAttribute($attribute);
            }
        }

        return "#{$subject->getKey()}";
    }
}
