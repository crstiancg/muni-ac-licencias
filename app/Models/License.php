<?php

namespace App\Models;

use App\Concerns\Audited;
use App\Enums\IssuedDocumentType;
use App\Enums\LicenseStatus;
use App\Enums\RiskLevel;
use App\Enums\SettlementType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Operating licence or sign authorization, verifiable by its QR.
 *
 * @property int $id
 * @property IssuedDocumentType $type
 * @property int $year
 * @property int|null $sequence
 * @property string $number
 * @property int|null $procedure_id
 * @property int $taxpayer_id
 * @property int $establishment_id
 * @property Carbon $issued_at
 * @property Carbon|null $valid_until
 * @property LicenseStatus $status
 * @property string|null $status_reason
 * @property Carbon|null $status_changed_at
 * @property int $duplicates
 * @property int|null $replaced_by_id
 * @property string $qr_token
 * @property string $holder_name
 * @property string $holder_document
 * @property string|null $trade_name
 * @property string $activity
 * @property string $address
 * @property string|null $area
 * @property int|null $capacity
 * @property RiskLevel|null $risk_level
 * @property string|null $observations
 * @property string|null $sign_kind
 * @property int|null $sign_faces
 * @property string|null $sign_material
 * @property string|null $sign_width
 * @property string|null $sign_height
 * @property int|null $issued_by
 * @property int|null $legacy_id
 * @property-read Procedure|null $procedure
 * @property-read Taxpayer $taxpayer
 * @property-read Establishment $establishment
 * @property Carbon|null $confirmed_at
 * @property int|null $confirmed_by
 * @property string|null $confirmation_note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'type', 'year', 'sequence', 'number', 'series', 'procedure_id', 'taxpayer_id', 'establishment_id',
    'issued_at', 'valid_until', 'status', 'status_reason', 'status_changed_at', 'confirmed_at', 'confirmed_by', 'confirmation_note', 'duplicates', 'replaced_by_id', 'qr_token',
    'holder_name', 'holder_document', 'trade_name', 'activity', 'address', 'area', 'capacity', 'risk_level', 'observations',
    'sign_kind', 'sign_faces', 'sign_material', 'sign_width', 'sign_height',
    'issued_by', 'legacy_id',
])]
#[Hidden(['qr_token'])]
class License extends Model
{
    use Audited;

    /**
     * What fits the observations box of the form, leaving room for the
     * duplicate and validity notes the system adds.
     */
    public const OBSERVATIONS_MAX = 300;

    /**
     * Standard warning suggested when issuing an operating licence.
     */
    public static function standardObservations(): string
    {
        return (string) config('licencias.license_observations');
    }

    /**
     * The licence's own text, or the standard one for imported licences
     * that never had it.
     */
    public function printedObservations(): string
    {
        return $this->observations ?? self::standardObservations();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => IssuedDocumentType::class,
            'status' => LicenseStatus::class,
            'risk_level' => RiskLevel::class,
            'issued_at' => 'date',
            'valid_until' => 'date',
            'status_changed_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'area' => 'decimal:2',
            'sign_width' => 'decimal:2',
            'sign_height' => 'decimal:2',
            'duplicates' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (License $license) {
            $license->qr_token ??= static::newQrToken();
        });
    }

    /**
     * 10 random base62 characters (62^10 combinations): not guessable,
     * short enough for a small QR.
     */
    public static function newQrToken(): string
    {
        do {
            $token = Str::random(10);
        } while (static::query()->where('qr_token', $token)->exists());

        return $token;
    }

    /**
     * Status as of today: a licence past its valid_until counts as expired
     * even before licenses:expire records it.
     */
    public function effectiveStatus(): LicenseStatus
    {
        return $this->status === LicenseStatus::Active && $this->valid_until?->lt(today())
            ? LicenseStatus::Expired
            : $this->status;
    }

    /**
     * Imported from dblicencias: no yearly sequence of this system.
     */
    public function isLegacy(): bool
    {
        return $this->sequence === null;
    }

    /**
     * An imported licence that says "vigente" only because nobody recorded
     * its closure, until the municipality confirms it is still in force.
     */
    public function needsConfirmation(): bool
    {
        return $this->isLegacy()
            && $this->confirmed_at === null
            && $this->effectiveStatus() === LicenseStatus::Active;
    }

    /**
     * Public URL the QR points to. A blank LICENCIAS_VERIFICATION_URL reaches
     * config as "" (env() only defaults on missing, not empty), which would
     * print a QR with no domain: fall back to the app URL.
     */
    public function verificationUrl(): string
    {
        $base = config('licencias.verification_url') ?: config('app.url');

        return rtrim((string) $base, '/').'/v/'.$this->qr_token;
    }

    /**
     * @return BelongsTo<Procedure, $this>
     */
    public function procedure(): BelongsTo
    {
        return $this->belongsTo(Procedure::class);
    }

    /**
     * @return BelongsTo<License, $this>
     */
    public function replacedBy(): BelongsTo
    {
        return $this->belongsTo(License::class, 'replaced_by_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    /**
     * @return BelongsTo<Taxpayer, $this>
     */
    public function taxpayer(): BelongsTo
    {
        return $this->belongsTo(Taxpayer::class);
    }

    /**
     * "Clase de establecimiento" on the licence: the activity followed by the
     * trade name, when it has one (RESTAURANTE - EL SOMBRERITO).
     */
    public function establishmentClass(): string
    {
        return collect([$this->activity, $this->trade_name])->filter()->join(' - ');
    }

    /**
     * "Apellidos y Nombres" on the licence: always a person, so a company
     * prints its legal representative there.
     */
    public function printedPersonName(): ?string
    {
        return $this->isCompany() ? $this->legalRepresentative() : $this->holder_name;
    }

    /**
     * "Razón social del Establecimiento" on the licence: the company itself;
     * blank for a natural person.
     */
    public function printedBusinessName(): ?string
    {
        return $this->isCompany() ? $this->holder_name : null;
    }

    /**
     * "Domicilio de Establecimiento" on the licence: only the street, without
     * the " - BARRIO CHANU CHANU" that the stored address ends with.
     */
    public function printedAddress(): string
    {
        $labels = collect(SettlementType::cases())
            ->map(fn (SettlementType $type) => preg_quote(mb_strtoupper($type->label()), '/'))
            ->join('|');
        $address = preg_replace("/ - (?:{$labels})\\b.*$/u", '', (string) $this->address);

        // A settlement named without its type: only its name follows the dash.
        $name = $this->establishment?->settlement_name;
        $suffix = $name ? ' - '.mb_strtoupper($name) : null;

        return $suffix && str_ends_with($address, $suffix) ? mb_substr($address, 0, -mb_strlen($suffix)) : $address;
    }

    /**
     * The holder's RUC, printed under the series; null for a DNI holder.
     */
    public function holderRuc(): ?string
    {
        return str_starts_with((string) $this->holder_document, 'RUC ')
            ? substr($this->holder_document, 4)
            : null;
    }

    /**
     * Only a company (RUC 20) has a razón social and a legal representative.
     */
    public function isCompany(): bool
    {
        return str_starts_with((string) $this->holder_document, 'RUC 20');
    }

    /**
     * A company's legal representative, as declared in its procedure;
     * licences without one declared take the company's file.
     */
    public function legalRepresentative(): ?string
    {
        if (! $this->isCompany()) {
            return null;
        }

        $declared = $this->procedure?->declaration ?? [];

        return array_key_exists('representative_name', $declared)
            ? $declared['representative_name']
            : $this->taxpayer?->representative_name;
    }

    /**
     * Inspectors' field visits, latest first.
     *
     * @return HasMany<Inspection, $this>
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class)->latest('visited_at');
    }

    /**
     * @return BelongsTo<Establishment, $this>
     */
    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }

    /**
     * Filter by number, holder (name or document), activity or address.
     *
     * @param  Builder<self>  $query
     */
    /**
     * Imported licences in force not yet confirmed (fiscalización's worklist).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function pendingConfirmation(Builder $query): void
    {
        $query->whereNull('sequence')
            ->whereNull('confirmed_at')
            ->where('status', LicenseStatus::Active)
            ->where(fn (Builder $query) => $query->whereNull('valid_until')->orWhereDate('valid_until', '>=', today()));
    }

    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->whereLike('number', "%{$term}%")
                ->orWhereLike('series', "%{$term}%")
                // "RUC 10…" / "DNI 01…": the number may be typed without its prefix.
                ->orWhereLike('holder_document', "{$term}%")
                ->orWhereLike('holder_document', "% {$term}%")
                ->orWhereLike('holder_name', "%{$term}%")
                ->orWhereLike('trade_name', "%{$term}%")
                ->orWhereLike('activity', "%{$term}%")
                ->orWhereLike('address', "%{$term}%")
        ));
    }
}
