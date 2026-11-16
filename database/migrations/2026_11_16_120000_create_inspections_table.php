<?php

use App\Enums\Permission as PermissionName;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Field visits of inspectors. The licence is optional: a business
     * without one is recorded with what the inspector saw, for follow-up.
     */
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('sequence');
            $table->string('code', 20)->unique();
            $table->foreignId('license_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('establishment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('inspector_id')->constrained('users');
            $table->timestamp('visited_at');
            $table->string('result', 30)->index();
            // The licence status when visited: it may change afterwards.
            $table->string('license_status', 30)->nullable();
            $table->json('checks')->nullable();
            $table->text('notes')->nullable();
            // What the inspector saw, when there is no licence.
            $table->string('business_name')->nullable();
            $table->string('holder_name')->nullable();
            $table->string('holder_document', 20)->nullable();
            $table->string('address')->nullable();
            $table->string('activity')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('gps_accuracy')->nullable();
            $table->timestamps();

            $table->unique(['year', 'sequence']);
            $table->index('visited_at');
        });

        Schema::create('inspection_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->timestamps();
        });

        // The seeder only creates built-in roles once: give the new
        // permission to an existing "Fiscalización" role here.
        if (Schema::hasTable('permissions')) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            Permission::findOrCreate(PermissionName::Inspections->value);
            Role::query()->where('name', 'Fiscalización')->first()?->givePermissionTo(PermissionName::Inspections->value);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspection_photos');
        Schema::dropIfExists('inspections');
    }
};
