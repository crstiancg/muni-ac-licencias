<?php

namespace App\Models;

use App\Enums\IssuedDocumentType;
use App\Enums\RiskLevel;
use Database\Factories\ProcedureTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * TUPA procedure a taxpayer can request (licence, sign, closure, duplicate...).
 *
 * @property int $id
 * @property string|null $tupa_code
 * @property string $name
 * @property string|null $description
 * @property string $uit_percentage
 * @property RiskLevel|null $risk_level
 * @property IssuedDocumentType|null $document_type
 * @property int|null $processing_days
 * @property string|null $legal_basis
 * @property int $position
 * @property bool $is_active
 * @property int|null $legacy_id
 * @property string|null $legacy_amount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'tupa_code', 'name', 'description', 'uit_percentage', 'risk_level', 'document_type',
    'processing_days', 'legal_basis', 'position', 'is_active',
    'legacy_id', 'legacy_amount',
])]
class ProcedureType extends Model
{
    /** @use HasFactory<ProcedureTypeFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'uit_percentage' => 'decimal:4',
            'risk_level' => RiskLevel::class,
            'document_type' => IssuedDocumentType::class,
            'processing_days' => 'integer',
            'position' => 'integer',
            'is_active' => 'boolean',
            'legacy_id' => 'integer',
            'legacy_amount' => 'decimal:2',
        ];
    }

    /**
     * Fee (derecho de trámite) in soles for the given UIT, rounded to cents.
     */
    public function feeFor(Uit $uit): string
    {
        return number_format(round((float) $this->uit_percentage * (float) $uit->amount / 100, 2), 2, '.', '');
    }

    /**
     * Filter by name or TUPA code.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('name', 'like', "%{$term}%")
                ->orWhere('tupa_code', 'like', "{$term}%")
        ));
    }

    /**
     * Filter by status: "active", "inactive" or "all".
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function status(Builder $query, string $status): void
    {
        match ($status) {
            'active' => $query->where('is_active', true),
            'inactive' => $query->where('is_active', false),
            default => null,
        };
    }
}
