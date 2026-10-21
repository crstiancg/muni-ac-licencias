<?php

namespace App\Enums;

/**
 * What a user may do, per module. Routes check them with "can:" and the
 * sidebar hides what the user cannot open. Administrators pass every check.
 */
enum Permission: string
{
    case ProceduresView = 'procedures.view';
    case ProceduresManage = 'procedures.manage';
    case Itse = 'itse.manage';
    case Payments = 'payments.collect';
    case Reports = 'reports.view';
    case Markets = 'markets.manage';
    case Parameters = 'parameters.manage';
    case Audit = 'audit.view';
    case Users = 'users.manage';

    public function label(): string
    {
        return match ($this) {
            self::ProceduresView => 'Consultar trámites, licencias y contribuyentes',
            self::ProceduresManage => 'Registrar y tramitar (mesa de partes)',
            self::Itse => 'Certificados ITSE',
            self::Payments => 'Caja: emitir, cobrar y anular órdenes',
            self::Reports => 'Reporte de recaudación',
            self::Markets => 'Mercados y puestos',
            self::Parameters => 'UIT y tipos de trámite',
            self::Audit => 'Auditoría',
            self::Users => 'Usuarios y roles',
        };
    }

    /**
     * Built-in roles and their permissions. The administrator role has none:
     * it passes every check (see AppServiceProvider).
     *
     * @return array<string, list<self>>
     */
    public static function roles(): array
    {
        return [
            'Administrador' => [],
            'Mesa de partes' => [self::ProceduresView, self::ProceduresManage],
            'Caja' => [self::ProceduresView, self::Payments, self::Reports],
            'Fiscalización' => [self::ProceduresView, self::Itse],
            'Mercados' => [self::Markets],
        ];
    }

    public const string ADMIN_ROLE = 'Administrador';
}
