<?php

namespace App\Models;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseStatus;
use App\Enums\RiskLevel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'type', 'year', 'sequence', 'number', 'procedure_id', 'taxpayer_id', 'establishment_id',
    'issued_at', 'valid_until', 'status', 'status_reason', 'status_changed_at', 'duplicates', 'replaced_by_id', 'qr_token',
    'holder_name', 'holder_document', 'trade_name', 'activity', 'address', 'area', 'capacity', 'risk_level',
    'sign_kind', 'sign_faces', 'sign_material', 'sign_width', 'sign_height',
    'issued_by', 'legacy_id',
])]
#[Hidden(['qr_token'])]
class License extends Model
{
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
     * Public URL the QR points to.
     */
    public function verificationUrl(): string
    {
        return rtrim((string) config('licencias.verification_url'), '/').'/v/'.$this->qr_token;
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
     * @return BelongsTo<Taxpayer, $this>
     */
    public function taxpayer(): BelongsTo
    {
        return $this->belongsTo(Taxpayer::class);
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
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('number', 'like', "%{$term}%")
                ->orWhere('holder_document', 'like', "{$term}%")
                ->orWhere('holder_name', 'like', "%{$term}%")
                ->orWhere('trade_name', 'like', "%{$term}%")
                ->orWhere('activity', 'like', "%{$term}%")
                ->orWhere('address', 'like', "%{$term}%")
        ));
    }
}
