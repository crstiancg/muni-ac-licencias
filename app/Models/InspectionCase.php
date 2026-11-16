<?php

namespace App\Models;

use App\Concerns\Audited;
use App\Enums\InspectionCaseStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Follow-up of a business found working without a licence.
 *
 * @property int $id
 * @property int $year
 * @property int $sequence
 * @property string $code
 * @property InspectionCaseStatus $status
 * @property string $business_name
 * @property string|null $holder_name
 * @property string|null $holder_document
 * @property string|null $document_key
 * @property string $address
 * @property string|null $activity
 * @property string|null $notice_number
 * @property Carbon|null $notified_at
 * @property Carbon|null $deadline
 * @property int|null $license_id
 * @property Carbon|null $resolved_at
 * @property string|null $resolution_note
 * @property int $opened_by
 * @property int|null $resolved_by
 * @property-read License|null $license
 * @property-read User $opener
 * @property-read User|null $resolver
 * @property-read Collection<int, Inspection> $inspections
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'year', 'sequence', 'code', 'status', 'business_name', 'holder_name', 'holder_document', 'address', 'activity',
    'notice_number', 'notified_at', 'deadline', 'license_id', 'resolved_at', 'resolution_note', 'opened_by', 'resolved_by',
])]
class InspectionCase extends Model
{
    use Audited;

    protected $attributes = [
        'status' => 'pendiente',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => InspectionCaseStatus::class,
            'notified_at' => 'date',
            'deadline' => 'date',
            'resolved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $case) {
            $case->document_key = self::documentKey($case->holder_document);
        });
    }

    /**
     * The person behind a document: a RUC 10 is a person with business, its
     * digits 3 to 10 are their DNI. Anything else is compared as is.
     */
    public static function documentKey(?string $document): ?string
    {
        $document = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', (string) $document));

        if ($document === '') {
            return null;
        }

        return preg_match('/^10(\d{8})\d$/', $document, $match) ? $match[1] : $document;
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
    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * @return HasMany<Inspection, $this>
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class)->latest('visited_at')->orderByDesc('id');
    }

    /**
     * Notified and the deadline to get a licence went by.
     */
    public function isOverdue(): bool
    {
        return $this->status === InspectionCaseStatus::Notified
            && $this->deadline !== null
            && $this->deadline->lt(today());
    }

    public function statusLabel(): string
    {
        return $this->isOverdue() ? 'Plazo vencido' : $this->status->label();
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function open(Builder $query): void
    {
        $query->whereIn('status', [InspectionCaseStatus::Pending, InspectionCaseStatus::Notified]);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function overdue(Builder $query): void
    {
        $query->where('status', InspectionCaseStatus::Notified)->whereDate('deadline', '<', today());
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
        ));
    }
}
