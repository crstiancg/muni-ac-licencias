import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import { Button, buttonVariants } from '@/components/ui/button';
import { create, edit, index } from '@/routes/users';
import type { Paginated } from '@/types';

type UserRow = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    role: string | null;
};

export default function UserIndex({
    users,
    search,
}: {
    users: Paginated<UserRow>;
    search: string | null;
}) {
    return (
        <>
            <Head title="Usuarios" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Usuarios"
                        description="Personal que usa el sistema y su rol"
                    />

                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Nuevo usuario
                        </Link>
                    </Button>
                </div>

                <SearchInput
                    initial={search ?? ''}
                    placeholder="Buscar por nombre o correo"
                    label="Buscar usuario"
                    onSearch={(value) =>
                        router.get(
                            index().url,
                            value ? { search: value } : {},
                            {
                                preserveState: true,
                                replace: true,
                                only: ['users', 'search'],
                            },
                        )
                    }
                />

                {users.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No hay usuarios que coincidan.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Nombre
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Correo
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Rol
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Estado
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.role ?? (
                                                <span className="text-muted-foreground">
                                                    Sin rol
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-2">
                                                <span
                                                    className={
                                                        user.is_active
                                                            ? 'size-2.5 rounded-full bg-emerald-500'
                                                            : 'size-2.5 rounded-full bg-muted-foreground/40'
                                                    }
                                                />
                                                {user.is_active
                                                    ? 'Activo'
                                                    : 'Desactivado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={edit(user.id)}
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                })}
                                            >
                                                Editar
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={users} />
            </div>
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [{ title: 'Usuarios', href: index() }],
};
