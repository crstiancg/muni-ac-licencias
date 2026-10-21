import { Head, useFormContext } from '@inertiajs/react';
import RoleController from '@/actions/App/Http/Controllers/RoleController';
import FormPage from '@/components/form-page';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index } from '@/routes/roles';

type RoleData = { id: number; name: string; permissions: string[] };

type PermissionOption = { value: string; label: string };

type Props = { role: RoleData | null; permissions: PermissionOption[] };

type RoleFormData = { name: string; permissions: string[] };

export default function RoleForm({ role, permissions }: Props) {
    return (
        <>
            <Head title={role ? `Editar rol ${role.name}` : 'Nuevo rol'} />

            <FormPage
                title={role ? `Editar rol ${role.name}` : 'Nuevo rol'}
                description="Marca lo que podrán hacer las personas con este rol. Los cambios valen desde su próximo clic."
                form={
                    role
                        ? RoleController.update.form(role.id)
                        : RoleController.store.form()
                }
                cancelHref={index().url}
                submitLabel={role ? 'Guardar cambios' : 'Crear rol'}
            >
                <Fields role={role} permissions={permissions} />
            </FormPage>
        </>
    );
}

function Fields({ role, permissions }: Props) {
    const form = useFormContext<RoleFormData>();

    return (
        <>
            <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="name">Nombre del rol</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={role?.name ?? ''}
                    placeholder="Jefe de licencias"
                    onBlur={() => form?.validate('name')}
                    aria-invalid={form?.errors.name ? true : undefined}
                />
                <InputError message={form?.errors.name} />
            </div>

            <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-semibold">Permisos</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                    {permissions.map((permission) => (
                        <label
                            key={permission.value}
                            htmlFor={`permission-${permission.value}`}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-muted/60"
                        >
                            <Checkbox
                                id={`permission-${permission.value}`}
                                name="permissions[]"
                                value={permission.value}
                                defaultChecked={role?.permissions.includes(
                                    permission.value,
                                )}
                                className="mt-0.5"
                            />
                            {permission.label}
                        </label>
                    ))}
                </div>
                <InputError message={form?.errors.permissions} />
            </fieldset>
        </>
    );
}

RoleForm.layout = ({ role }: Props) => ({
    breadcrumbs: [
        { title: 'Roles y permisos', href: index() },
        { title: role ? role.name : 'Nuevo rol', href: index() },
    ],
});
