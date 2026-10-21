import { Head, useFormContext } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/UserController';
import FormPage from '@/components/form-page';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { index } from '@/routes/users';

type UserData = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    role: string | null;
};

type RoleOption = { value: string; label: string; permissions: string[] };

type Props = { user: UserData | null; roles: RoleOption[] };

type UserFormData = {
    name: string;
    email: string;
    role: string;
    password: string;
    password_confirmation: string;
    is_active: boolean;
};

export default function UserForm({ user, roles }: Props) {
    return (
        <>
            <Head title={user ? `Editar ${user.name}` : 'Nuevo usuario'} />

            <FormPage
                title={user ? `Editar ${user.name}` : 'Nuevo usuario'}
                description="El rol define qué módulos ve y puede usar la persona."
                form={
                    user
                        ? UserController.update.form(user.id)
                        : UserController.store.form()
                }
                cancelHref={index().url}
                submitLabel={user ? 'Guardar cambios' : 'Crear usuario'}
            >
                <Fields user={user} roles={roles} />
            </FormPage>
        </>
    );
}

function Fields({ user, roles }: Props) {
    const form = useFormContext<UserFormData>();

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={user?.name ?? ''}
                        onBlur={() => form?.validate('name')}
                        aria-invalid={form?.errors.name ? true : undefined}
                    />
                    <InputError message={form?.errors.name} />
                </div>
                <div className="grid content-start gap-2">
                    <Label htmlFor="email">Correo (para ingresar)</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="off"
                        defaultValue={user?.email ?? ''}
                        onBlur={() => form?.validate('email')}
                        aria-invalid={form?.errors.email ? true : undefined}
                    />
                    <InputError message={form?.errors.email} />
                </div>
            </div>

            <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-semibold">Rol</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    {roles.map((role) => (
                        <label
                            key={role.value}
                            className={cn(
                                'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40',
                                'has-checked:border-primary has-checked:bg-muted/60',
                            )}
                        >
                            <input
                                type="radio"
                                name="role"
                                value={role.value}
                                defaultChecked={
                                    (user?.role ?? 'Mesa de partes') ===
                                    role.value
                                }
                                className="mt-1 size-4 accent-primary"
                            />
                            <span className="grid gap-1">
                                <span className="font-medium">
                                    {role.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {role.permissions.join(' · ')}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
                <InputError message={form?.errors.role} />
            </fieldset>

            <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-semibold">
                    Contraseña
                </legend>
                {user && (
                    <p className="text-sm text-muted-foreground">
                        Déjala vacía para mantener la actual. Escribe una nueva
                        solo si la persona la olvidó.
                    </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid content-start gap-2">
                        <Label htmlFor="password">
                            {user ? 'Nueva contraseña' : 'Contraseña'}
                        </Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            autoComplete="new-password"
                            aria-invalid={
                                form?.errors.password ? true : undefined
                            }
                        />
                        <InputError message={form?.errors.password} />
                    </div>
                    <div className="grid content-start gap-2">
                        <Label htmlFor="password_confirmation">
                            Repite la contraseña
                        </Label>
                        <PasswordInput
                            id="password_confirmation"
                            name="password_confirmation"
                            autoComplete="new-password"
                        />
                    </div>
                </div>
            </fieldset>

            <div className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox
                    id="is_active"
                    name="is_active"
                    value="1"
                    defaultChecked={user?.is_active ?? true}
                />
                <div className="grid gap-1">
                    <Label htmlFor="is_active">Cuenta activa</Label>
                    <p className="text-xs text-muted-foreground">
                        Desmárcala cuando la persona deje de trabajar aquí: no
                        podrá ingresar, pero su nombre se mantiene en los
                        trámites y pagos que registró.
                    </p>
                </div>
            </div>
            <InputError message={form?.errors.is_active} />
        </>
    );
}

UserForm.layout = ({ user }: Props) => ({
    breadcrumbs: [
        { title: 'Usuarios', href: index() },
        { title: user ? user.name : 'Nuevo usuario', href: index() },
    ],
});
