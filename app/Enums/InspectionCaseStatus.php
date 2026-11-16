<?php

namespace App\Enums;

/**
 * Where the follow-up of a business without a licence stands.
 */
enum InspectionCaseStatus: string
{
    case Pending = 'pendiente';
    case Notified = 'notificado';
    case Regularized = 'regularizado';
    case Sanction = 'derivado';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pendiente de notificar',
            self::Notified => 'Notificado',
            self::Regularized => 'Regularizado',
            self::Sanction => 'Derivado a sanción',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::Notified], true);
    }

    /**
     * How the inspector closes a case by hand.
     *
     * @return list<self>
     */
    public static function closing(): array
    {
        return [self::Regularized, self::Sanction];
    }
}
