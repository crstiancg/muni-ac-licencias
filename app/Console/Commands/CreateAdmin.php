<?php

namespace App\Console\Commands;

use App\Concerns\PasswordValidationRules;
use App\Enums\Permission;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

/**
 * Creates an administrator from the server's terminal, e.g. the first one
 * after deploying. The password is typed hidden and never passes through
 * the repository, the environment or the shell history; it follows the same
 * rules as the rest of the system (strict in production).
 */
#[Signature('app:create-admin')]
#[Description('Crea un usuario administrador (la contraseña se escribe oculta)')]
class CreateAdmin extends Command
{
    use PasswordValidationRules;

    public function handle(): int
    {
        $data = [
            'name' => trim((string) $this->ask('Nombre completo')),
            'email' => mb_strtolower(trim((string) $this->ask('Correo electrónico'))),
            'password' => (string) $this->secret('Contraseña'),
            'password_confirmation' => (string) $this->secret('Repite la contraseña'),
        ];

        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)],
            'password' => $this->passwordRules(),
        ], attributes: [
            'name' => 'nombre',
            'email' => 'correo electrónico',
            'password' => 'contraseña',
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = DB::transaction(function () use ($data) {
            if (Role::query()->where('name', Permission::ADMIN_ROLE)->doesntExist()) {
                $this->callSilent('db:seed', ['--class' => RolesAndPermissionsSeeder::class, '--force' => true]);
            }

            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'is_active' => true,
            ]);

            $user->forceFill(['email_verified_at' => now()])->save();
            $user->assignRole(Permission::ADMIN_ROLE);

            return $user;
        });

        $this->info("Administrador {$user->email} creado. Ya puede iniciar sesión.");

        return self::SUCCESS;
    }
}
