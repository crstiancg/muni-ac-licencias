import { Head, Link, router } from '@inertiajs/react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { create, destroy, edit, index } from '@/routes/roles';

type RoleRow = {
    id: number;
    name: string;
    users_count: number;
    is_admin: boolean;
    permissions: string[];
};

export default function RoleIndex({ roles }: { roles: RoleRow[] }) {
    const remove = (role: RoleRow) => {
        if (window.confirm(`¿Eliminar el rol ${role.name}?`)) {
            router.delete(destroy(role.id).url, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Roles y permisos" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Roles y permisos"
                        description="Cada usuario tiene un rol; el rol define qué módulos puede usar."
                    />

                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Nuevo rol
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {roles.map((role) => (
                        <section
                            key={role.id}
                            className="flex flex-col gap-4 rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold">
                                        {role.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {role.users_count === 1
                                            ? '1 usuario'
                                            : `${role.users_count} usuarios`}
                                    </p>
                                </div>
                                {role.is_admin && (
                                    <Badge variant="secondary">Fijo</Badge>
                                )}
                            </div>

                            <ul className="flex-1 space-y-1.5 text-sm">
                                {role.is_admin ? (
                                    <li className="flex gap-2">
                                        <Check className="mt-0.5 size-4 shrink-0" />
                                        Acceso total, incluidos usuarios, roles
                                        y auditoría
                                    </li>
                                ) : role.permissions.length === 0 ? (
                                    <li className="text-muted-foreground">
                                        Sin permisos: solo ve el panel.
                                    </li>
                                ) : (
                                    role.permissions.map((permission) => (
                                        <li
                                            key={permission}
                                            className="flex gap-2"
                                        >
                                            <Check className="mt-0.5 size-4 shrink-0" />
                                            {permission}
                                        </li>
                                    ))
                                )}
                            </ul>

                            {!role.is_admin && (
                                <div className="flex gap-2 border-t pt-4">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={edit(role.id)}>
                                            <Pencil />
                                            Editar
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => remove(role)}
                                    >
                                        <Trash2 />
                                        Eliminar
                                    </Button>
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}

RoleIndex.layout = {
    breadcrumbs: [{ title: 'Roles y permisos', href: index() }],
};
