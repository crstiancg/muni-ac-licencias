<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One entry in a procedure's history (registered, updated, cancelled...).
 *
 * @property int $id
 * @property int $procedure_id
 * @property int|null $user_id
 * @property string $type
 * @property string|null $description
 * @property Carbon $created_at
 */
#[Fillable(['user_id', 'type', 'description'])]
class ProcedureEvent extends Model
{
    public const ?string UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
