<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

/**
 * Roles and the permissions each one grants. The administrator role is
 * fixed: it passes every check, so it is neither edited nor deleted.
 */
class RoleController extends Controller
{
    public function index(): Response
    {
        $labels = $this->labels();

        return Inertia::render('roles/index', [
            'roles' => Role::query()->with('permissions:id,name')->withCount('users')->orderBy('id')->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'users_count' => $role->users_count,
                    'is_admin' => $role->name === Permission::ADMIN_ROLE,
                    'permissions' => $role->permissions->map(fn ($permission) => $labels[$permission->name] ?? $permission->name)->values(),
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('roles/form', ['role' => null, 'permissions' => $this->options()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Rol {$role->name} creado."]);

        return to_route('roles.index');
    }

    public function edit(Role $role): Response
    {
        abort_if($role->name === Permission::ADMIN_ROLE, 403, 'El rol Administrador no se edita: siempre tiene todos los permisos.');

        return Inertia::render('roles/form', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions()->pluck('name'),
            ],
            'permissions' => $this->options(),
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_if($role->name === Permission::ADMIN_ROLE, 403);

        $data = $this->validated($request, $role);

        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Rol {$role->name} actualizado."]);

        return to_route('roles.index');
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_if($role->name === Permission::ADMIN_ROLE, 403);

        if ($role->users()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "No se puede eliminar {$role->name}: hay usuarios con ese rol. Cámbiales el rol primero."]);

            return back();
        }

        $role->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Rol {$role->name} eliminado."]);

        return to_route('roles.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Role $role = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique(Role::class, 'name')->ignore($role), Rule::notIn([Permission::ADMIN_ROLE])],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => [Rule::enum(Permission::class)],
        ], attributes: ['name' => 'nombre del rol', 'permissions' => 'permisos']);
    }

    /**
     * @return array<string, string>
     */
    private function labels(): array
    {
        return collect(Permission::cases())->mapWithKeys(fn (Permission $p) => [$p->value => $p->label()])->all();
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function options(): array
    {
        return array_map(fn (Permission $p) => ['value' => $p->value, 'label' => $p->label()], Permission::cases());
    }
}
