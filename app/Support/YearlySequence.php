<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Next number of the year for models with `year` and `sequence` columns
 * (procedures, payment orders, licences). Call it inside a transaction: the
 * year's numbering is locked so two users never get the same number.
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

        $query = $model::query()->where('year', $year);

        if ($scope) {
            $scope($query);
        }

        self::lock($query);

        return ['year' => $year, 'sequence' => (int) $query->max('sequence') + 1];
    }

    /**
     * Postgres refuses FOR UPDATE with an aggregate (max), so it takes a
     * transaction-level advisory lock on this numbering instead, released on
     * commit. MySQL locks the scanned rows and the gap after them. SQLite
     * (tests) writes one transaction at a time.
     *
     * @param  Builder<Model>  $query
     */
    private static function lock(Builder $query): void
    {
        $connection = $query->getModel()->getConnection();

        match ($connection->getDriverName()) {
            'pgsql' => $connection->select(
                'select pg_advisory_xact_lock(?)',
                // One lock per numbering: model, year and scope (e.g. type).
                [crc32($query->toRawSql())],
            ),
            'mysql', 'mariadb' => $query->lockForUpdate(),
            default => null,
        };
    }
}
