<?php

namespace App\Models;

use Database\Factories\UitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Unidad Impositiva Tributaria (UIT) value in force for a given year.
 *
 * @property int $id
 * @property int $year
 * @property string $amount
 * @property string|null $legal_basis
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['year', 'amount', 'legal_basis'])]
class Uit extends Model
{
    /** @use HasFactory<UitFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'amount' => 'decimal:2',
        ];
    }
}
