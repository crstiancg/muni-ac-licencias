<?php

namespace App\Models;

use App\Enums\DocumentType;
use Database\Factories\TaxpayerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Person or company that requests procedures (contribuyente / administrado).
 *
 * @property int $id
 * @property DocumentType $document_type
 * @property string $document_number
 * @property string|null $ruc
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $address
 * @property string|null $district
 * @property string|null $province
 * @property string|null $department
 * @property string|null $representative_name
 * @property string|null $representative_document
 * @property string|null $representative_sunarp
 * @property string|null $representative_phone
 * @property int|null $legacy_procedure_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'document_type', 'document_number', 'ruc', 'name', 'email', 'phone',
    'address', 'district', 'province', 'department',
    'representative_name', 'representative_document', 'representative_sunarp', 'representative_phone',
    'legacy_procedure_id',
])]
class Taxpayer extends Model
{
    /** @use HasFactory<TaxpayerFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'legacy_procedure_id' => 'integer',
        ];
    }

    /**
     * Companies (personas jurídicas) are identified by a RUC starting with 20.
     */
    public function isCompany(): bool
    {
        return $this->document_type === DocumentType::Ruc && str_starts_with($this->document_number, '20');
    }

    /**
     * Find by document, also matching the RUC of a natural person.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function document(Builder $query, DocumentType $type, string $number): void
    {
        $query->where(fn (Builder $query) => $query
            ->where(['document_type' => $type, 'document_number' => $number])
            ->when($type === DocumentType::Ruc, fn (Builder $query) => $query->orWhere('ruc', $number))
        );
    }

    /**
     * Filter by document number, RUC (prefix) or name.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('document_number', 'like', "{$term}%")
                ->orWhere('ruc', 'like', "{$term}%")
                ->orWhere('name', 'like', "%{$term}%")
        ));
    }
}
