import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import { Button } from '@/components/ui/button';
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

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
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
                    <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                        No hay usuarios que coincidan.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border bg-card">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">
                                        Nombre
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Correo
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Rol
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
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
                                        <td className="px-4 py-3 font-semibold">
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
                                                className="font-semibold hover:text-link hover:underline"
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
