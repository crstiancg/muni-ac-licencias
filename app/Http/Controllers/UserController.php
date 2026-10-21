<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

/**
 * Staff accounts. There is no public sign-up: the administrator creates each
 * account with one role and deactivates it when the person leaves.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        return Inertia::render('users/index', [
            'users' => User::query()
                ->with('roles:id,name')
                ->when($search, fn ($query) => $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->paginate(20)
                ->withQueryString()
                ->through(fn (User $user) => [
                    ...$user->only('id', 'name', 'email', 'is_active'),
                    'role' => $user->roles->first()?->name,
                ]),
            'search' => $search,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('users/form', ['user' => null, ...$this->options()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $user = User::create([
            ...collect($data)->only('name', 'email', 'password', 'is_active')->all(),
            // Created by the administrator: no e-mail confirmation step.
            'email_verified_at' => now(),
        ]);
        $user->syncRoles([$data['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Usuario {$user->name} creado."]);

        return to_route('users.index');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('users/form', [
            'user' => [
                ...$user->only('id', 'name', 'email', 'is_active'),
                'role' => $user->roles()->value('name'),
            ],
            ...$this->options(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validated($request, $user);

        if ($user->is($request->user()) && (! $data['is_active'] || $data['role'] !== Permission::ADMIN_ROLE)) {
            throw ValidationException::withMessages(['role' => 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.']);
        }

        $user->fill(collect($data)->only('name', 'email', 'is_active')->all());
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();
        $user->syncRoles([$data['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Usuario {$user->name} actualizado."]);

        return to_route('users.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($user)],
            'role' => ['required', Rule::exists(Role::class, 'name')],
            // Required for new accounts; on edit, empty keeps the current one.
            'password' => [$user ? 'nullable' : 'required', 'string', Password::defaults(), 'confirmed'],
            'is_active' => ['boolean'],
        ], attributes: [
            'name' => 'nombre', 'email' => 'correo', 'role' => 'rol', 'password' => 'contraseña',
        ]) + ['is_active' => $request->boolean('is_active')];
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        $labels = collect(Permission::cases())->mapWithKeys(fn (Permission $p) => [$p->value => $p->label()]);

        return [
            'roles' => Role::query()->with('permissions:id,name')->orderBy('id')->get()->map(fn (Role $role) => [
                'value' => $role->name,
                'label' => $role->name,
                'permissions' => $role->name === Permission::ADMIN_ROLE
                    ? ['Acceso total, incluidos usuarios y auditoría']
                    : $role->permissions->map(fn ($permission) => $labels[$permission->name] ?? $permission->name)->values(),
            ]),
        ];
    }
}
