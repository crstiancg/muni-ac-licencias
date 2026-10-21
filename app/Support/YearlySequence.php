<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Next number of the year for models with `year` and `sequence` columns
 * (procedures, payment orders, licences). Call it inside a transaction: the
 * year's rows are locked so two users never get the same number.
 */
final class YearlySequence
{
    /**
     * @param  class-string<Model>  $model
     * @param  (callable(Builder<Model>): mixed)|null  $scope  e.g. per document type
     * @return array{year: int, sequence: int}
     */
    public static function next(string $model, ?callable $scope = null): array
    {
        $year = now()->year;

        $query = $model::query()->where('year', $year)->lockForUpdate();

        if ($scope) {
            $scope($query);
        }

        return ['year' => $year, 'sequence' => (int) $query->max('sequence') + 1];
    }
}
