<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A photo taken during an inspection, on the private inspection disk.
 *
 * @property int $id
 * @property int $inspection_id
 * @property string $path
 * @property-read Inspection $inspection
 */
#[Fillable(['inspection_id', 'path'])]
class InspectionPhoto extends Model
{
    /**
     * @return BelongsTo<Inspection, $this>
     */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }
}
