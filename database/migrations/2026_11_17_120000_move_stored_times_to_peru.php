<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Framework tables: transient, nothing to fix.
     */
    private const array SKIP = ['migrations', 'cache', 'cache_locks', 'sessions', 'jobs', 'job_batches', 'failed_jobs', 'password_reset_tokens'];

    /**
     * Run the migrations.
     *
     * The app ran in UTC until now: every time it wrote is 5 hours ahead of
     * Puno (Peru has no daylight saving, so it is always -5). Moves them to
     * Peru time, except what came from the old system, which already was.
     * Then the issue date of licences issued here is taken again from the
     * moment they were issued: after 19:00 it had become the next day.
     */
    public function up(): void
    {
        // Only this database: on MySQL, getTables() without a schema lists
        // every database on the server (other projects, the old system's).
        foreach (Schema::getTableListing(Schema::getCurrentSchemaName(), schemaQualified: false) as $name) {
            if (in_array($name, self::SKIP, true)) {
                continue;
            }

            $columns = collect(Schema::getColumns($name))
                ->filter(fn (array $column) => in_array(strtolower($column['type_name']), ['timestamp', 'timestamptz', 'datetime'], true))
                ->pluck('name');

            if ($columns->isEmpty()) {
                continue;
            }

            $query = DB::table($name);

            match ($name) {
                // Imported procedures and their "importado" event keep the old system's (Peru) times.
                'procedures' => $query->whereNull('legacy_id'),
                'procedure_events' => $query->where('type', '!=', 'importado'),
                default => null,
            };

            $query->update($columns->mapWithKeys(fn (string $column) => [$column => DB::raw($this->minusFiveHours($column))])->all());
        }

        DB::table('licenses')
            ->whereNotNull('sequence')
            ->update(['issued_at' => DB::raw('date(created_at)')]);
    }

    /**
     * Times written from now on are already in Peru time: nothing to undo.
     */
    public function down(): void {}

    private function minusFiveHours(string $column): string
    {
        $column = DB::getQueryGrammar()->wrap($column);

        return match (DB::getDriverName()) {
            'pgsql' => "{$column} - interval '5 hours'",
            'mysql', 'mariadb' => "date_sub({$column}, interval 5 hour)",
            default => "datetime({$column}, '-5 hours')",
        };
    }
};
