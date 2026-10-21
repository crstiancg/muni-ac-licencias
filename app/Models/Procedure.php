<?php

namespace App\Models;

use App\Enums\ProcedureStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * A request (trámite) of a taxpayer for one of their establishments.
 *
 * @property int $id
 * @property int $year
 * @property int $sequence
 * @property string $code
 * @property int $taxpayer_id
 * @property int $establishment_id
 * @property ProcedureStatus $status
 * @property string|null $file_number
 * @property int|null $folios
 * @property string|null $notes
 * @property Carbon|null $cancelled_at
 * @property string|null $cancellation_reason
 * @property int|null $registered_by
 * @property int|null $legacy_id
 * @property-read Taxpayer $taxpayer
 * @property-read Establishment $establishment
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'year', 'sequence', 'code', 'taxpayer_id', 'establishment_id', 'status',
    'file_number', 'folios', 'notes', 'cancelled_at', 'cancellation_reason',
    'registered_by', 'legacy_id',
])]
class Procedure extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ProcedureStatus::class,
            'year' => 'integer',
            'sequence' => 'integer',
            'folios' => 'integer',
            'cancelled_at' => 'datetime',
            'legacy_id' => 'integer',
        ];
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
     * @return BelongsToMany<ProcedureType, $this>
     */
    public function types(): BelongsToMany
    {
        return $this->belongsToMany(ProcedureType::class)->orderBy('position');
    }

    /**
     * @return HasOne<PaymentOrder, $this>
     */
    public function paymentOrder(): HasOne
    {
        return $this->hasOne(PaymentOrder::class);
    }

    /**
     * @return HasMany<License, $this>
     */
    public function licenses(): HasMany
    {
        return $this->hasMany(License::class);
    }

    /**
     * @return HasMany<ProcedureEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(ProcedureEvent::class)->latest('id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    /**
     * Record what happened to this procedure in its history.
     */
    public function log(string $type, ?string $description = null): ProcedureEvent
    {
        return $this->events()->create([
            'user_id' => Auth::id(),
            'type' => $type,
            'description' => $description,
        ]);
    }

    /**
     * Filter by code, file number, or the taxpayer's document or name.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('code', 'like', "%{$term}%")
                ->orWhere('file_number', 'like', "{$term}%")
                ->orWhereHas('taxpayer', fn (Builder $query) => $query->search($term))
        ));
    }
}
