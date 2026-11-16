<?php

namespace App\Models;

use App\Concerns\Audited;
use App\Enums\InspectionResult;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * An inspector's field visit to a business, with or without a licence.
 *
 * @property int $id
 * @property int $year
 * @property int $sequence
 * @property string $code
 * @property int|null $license_id
 * @property int|null $establishment_id
 * @property int $inspector_id
 * @property Carbon $visited_at
 * @property InspectionResult $result
 * @property string|null $license_status
 * @property bool $confirmed_license
 * @property array<string, bool>|null $checks
 * @property string|null $notes
 * @property string|null $business_name
 * @property string|null $holder_name
 * @property string|null $holder_document
 * @property string|null $address
 * @property string|null $activity
 * @property string|null $latitude
 * @property string|null $longitude
 * @property int|null $gps_accuracy
 * @property-read License|null $license
 * @property-read User $inspector
 * @property-read Collection<int, InspectionPhoto> $photos
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'year', 'sequence', 'code', 'license_id', 'establishment_id', 'inspector_id', 'visited_at',
    'result', 'license_status', 'confirmed_license', 'checks', 'notes',
    'business_name', 'holder_name', 'holder_document', 'address', 'activity',
    'latitude', 'longitude', 'gps_accuracy',
])]
class Inspection extends Model
{
    use Audited;

    /**
     * What the inspector compares on site against the licence.
     *
     * @var array<string, string>
     */
    public const array CHECKS = [
        'holder_matches' => 'El titular coincide',
        'activity_matches' => 'El giro coincide',
        'address_matches' => 'La dirección coincide',
        'license_displayed' => 'Exhibe la licencia en un lugar visible',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'visited_at' => 'datetime',
            'result' => InspectionResult::class,
            'checks' => 'array',
            'confirmed_license' => 'boolean',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    /**
     * @return BelongsTo<License, $this>
     */
    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    /**
     * @return HasMany<InspectionPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(InspectionPhoto::class)->orderBy('id');
    }

    /**
     * Name of the business visited: the licence's or what the inspector saw.
     */
    public function businessName(): ?string
    {
        return $this->license?->trade_name ?? $this->license?->holder_name ?? $this->business_name;
    }

    /**
     * Code, business, holder, document or address.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->whereLike('code', "%{$term}%")
                ->orWhereLike('business_name', "%{$term}%")
                ->orWhereLike('holder_name', "%{$term}%")
                ->orWhereLike('holder_document', "{$term}%")
                ->orWhereLike('address', "%{$term}%")
                ->orWhereHas('license', fn (Builder $query) => $query->search($term))
        ));
    }
}
