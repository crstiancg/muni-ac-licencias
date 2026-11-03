<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Licences imported from dblicencias show "vigente" because closures were
     * rarely recorded. The municipality confirms the ones still in force
     * (inspection, a new procedure...) with who, when and on what basis.
     */
    public function up(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->timestamp('confirmed_at')->nullable()->after('status_changed_at');
            $table->foreignId('confirmed_by')->nullable()->after('confirmed_at')->constrained('users')->nullOnDelete();
            $table->string('confirmation_note', 255)->nullable()->after('confirmed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('confirmed_by');
            $table->dropColumn(['confirmed_at', 'confirmation_note']);
        });
    }
};
