<?php

namespace Database\Seeders;

use App\Enums\Permission as PermissionName;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Creates the permission catalog and the built-in roles. Safe to run again:
 * it adds what is missing and resyncs the built-in roles. If nobody is an
 * administrator yet, the first user becomes one.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionName::cases() as $permission) {
            Permission::findOrCreate($permission->value);
        }

        // Built-in roles are only created; later changes made on the Roles
        // screen are kept.
        foreach (PermissionName::roles() as $name => $permissions) {
            $role = Role::findOrCreate($name);

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions(array_map(fn (PermissionName $p) => $p->value, $permissions));
            }
        }

        if (User::role(PermissionName::ADMIN_ROLE)->doesntExist()) {
            User::query()->oldest('id')->first()?->assignRole(PermissionName::ADMIN_ROLE);
        }
    }
}
