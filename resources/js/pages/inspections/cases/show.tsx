import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    BellRing,
    CalendarClock,
    ChevronRight,
    CircleCheck,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import InspectionCaseController from '@/actions/App/Http/Controllers/InspectionCaseController';
import InputError from '@/components/input-error';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    caseTone,
    formatDate,
    formatDateTime,
    RESULT_TONES,
    type InspectionCaseRow,
    type InspectionResultValue,
} from '@/lib/inspections';
import { cn } from '@/lib/utils';
import { create, index, show as showInspection } from '@/routes/inspections';
import { index as casesIndex, show } from '@/routes/inspections/cases';
import { show as showLicense } from '@/routes/licenses';

type Props = {
    case: InspectionCaseRow & {
        holder_name: string | null;
        notice_number: string | null;
        notified_at: string | null;
        resolution_note: string | null;
        resolved_at: string | null;
        created_at: string;
        opened_by: string;
        resolved_by: string | null;
        license: { id: number; number: string } | null;
        inspections: {
            id: number;
            code: string;
            visited_at: string;
            notes: string | null;
            result: InspectionResultValue;
            result_label: string;
            inspector: string;
        }[];
    };
    noticeDays: number;
    closingOptions: { value: string; label: string }[];
};

const today = () => {
    const now = new Date();

    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
};

export default function InspectionCasesShow({
    case: followUp,
    noticeDays,
    closingOptions,
}: Props) {
    const { permissions } = usePage().props.auth;

    return (
        <>
            <Head title={followUp.code} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-8">
                <header className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-2xl font-bold">
                            {followUp.business_name}
                        </h1>
                        <StatusPill tone={caseTone(followUp)}>
                            {followUp.status_label}
                        </StatusPill>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-mono">{followUp.code}</span>
                        {' · '}
                        Abierto el {formatDateTime(
                            followUp.created_at,
                        )} por{' '}
                        {followUp.opened_by}
                    </p>
                </header>

                {followUp.is_open && followUp.deadline && (
                    <p
                        className={cn(
                            'flex items-center gap-2 rounded-2xl p-4 text-sm font-medium',
                            followUp.is_overdue
                                ? 'bg-[#fce9e7] text-[#a3261c] dark:bg-red-400/15 dark:text-red-300'
                                : 'bg-[#e6eefb] text-[#1f4e96] dark:bg-sky-400/15 dark:text-sky-300',
                        )}
                    >
                        <CalendarClock className="size-5 shrink-0" />
                        {followUp.is_overdue
                            ? `El plazo venció el ${formatDate(followUp.deadline)}: revisita el negocio y, si sigue sin licencia, derívalo a sanción.`
                            : `Tiene plazo hasta el ${formatDate(followUp.deadline)} para obtener su licencia.`}
                    </p>
                )}

                {!followUp.is_open && (
                    <section className="flex flex-col gap-1 rounded-2xl border bg-card p-4 text-sm md:p-5">
                        <h2 className="font-display text-lg font-bold">
                            {followUp.status_label}
                        </h2>
                        {followUp.resolution_note && (
                            <p className="whitespace-pre-line">
                                {followUp.resolution_note}
                            </p>
                        )}
                        {followUp.license &&
                            (permissions.includes('procedures.view') ? (
                                <Link
                                    href={showLicense(followUp.license.id)}
                                    className="font-mono text-link hover:underline"
                                >
                                    Ver licencia {followUp.license.number}
                                </Link>
                            ) : (
                                <span className="font-mono">
                                    Licencia {followUp.license.number}
                                </span>
                            ))}
                        {followUp.resolved_at && (
                            <p className="text-muted-foreground">
                                {formatDateTime(followUp.resolved_at)}
                                {followUp.resolved_by &&
                                    ` · ${followUp.resolved_by}`}
                            </p>
                        )}
                    </section>
                )}

                <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                    <h2 className="font-display text-lg font-bold">Negocio</h2>
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <Item label="Dirección" wide>
                            {followUp.address}
                        </Item>
                        {followUp.activity && (
                            <Item label="Giro">{followUp.activity}</Item>
                        )}
                        {(followUp.holder_name || followUp.holder_document) && (
                            <Item label="Responsable">
                                {[
                                    followUp.holder_name,
                                    followUp.holder_document,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </Item>
                        )}
                        {followUp.notified_at && (
                            <Item label="Notificado">
                                {formatDate(followUp.notified_at)}
                                {followUp.notice_number &&
                                    ` · N° ${followUp.notice_number}`}
                            </Item>
                        )}
                    </dl>
                    {!followUp.holder_document && followUp.is_open && (
                        <p className="text-xs text-muted-foreground">
                            Sin DNI/RUC el caso no se cierra solo cuando obtenga
                            la licencia: anótalo en la próxima visita.
                        </p>
                    )}
                </section>

                {followUp.is_open && (
                    <div className="grid gap-2 sm:grid-cols-3">
                        <Button size="lg" className="h-12" asChild>
                            <Link
                                href={create({
                                    query: { case: followUp.id },
                                })}
                            >
                                <Plus />
                                Revisitar
                            </Link>
                        </Button>
                        <NotifyDialog
                            followUp={followUp}
                            noticeDays={noticeDays}
                        />
                        <CloseDialog
                            followUp={followUp}
                            options={closingOptions}
                        />
                    </div>
                )}

                <section className="flex flex-col gap-3">
                    <h2 className="font-display text-lg font-bold">
                        Visitas ({followUp.inspections.length})
                    </h2>
                    <ul className="divide-y rounded-2xl border bg-card">
                        {followUp.inspections.map((inspection) => (
                            <li key={inspection.id}>
                                <Link
                                    href={showInspection(inspection.id)}
                                    className="flex items-center gap-3 p-4 hover:bg-accent/50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm">
                                                {inspection.code}
                                            </span>
                                            <StatusPill
                                                tone={
                                                    RESULT_TONES[
                                                        inspection.result
                                                    ]
                                                }
                                            >
                                                {inspection.result_label}
                                            </StatusPill>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {formatDateTime(
                                                inspection.visited_at,
                                            )}
                                            {' · '}
                                            {inspection.inspector}
                                        </p>
                                        {inspection.notes && (
                                            <p className="mt-1 line-clamp-2 text-sm">
                                                {inspection.notes}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                <div>
                    <Button variant="outline" asChild>
                        <Link href={casesIndex()}>
                            Volver a negocios sin licencia
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

function NotifyDialog({
    followUp,
    noticeDays,
}: {
    followUp: Props['case'];
    noticeDays: number;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="h-12">
                    <BellRing />
                    {followUp.status === 'notificado'
                        ? 'Notificar de nuevo'
                        : 'Notificar'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Notificar a {followUp.business_name}</DialogTitle>
                <DialogDescription>
                    Registra la notificación entregada y el plazo que tiene para
                    obtener la licencia. Al vencer, el caso aparece como "Plazo
                    vencido" para revisitarlo.
                </DialogDescription>
                <Form
                    noValidate
                    {...InspectionCaseController.notify.form(followUp.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="min-w-0 space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="notice_number">
                                    N° de notificación (opcional)
                                </Label>
                                <Input
                                    id="notice_number"
                                    name="notice_number"
                                    maxLength={30}
                                    defaultValue={followUp.notice_number ?? ''}
                                />
                                <InputError message={errors.notice_number} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="notified_at">
                                        Fecha de notificación
                                    </Label>
                                    <Input
                                        id="notified_at"
                                        name="notified_at"
                                        type="date"
                                        max={today()}
                                        defaultValue={today()}
                                    />
                                    <InputError message={errors.notified_at} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="days">Plazo (días)</Label>
                                    <Input
                                        id="days"
                                        name="days"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={180}
                                        defaultValue={noticeDays}
                                    />
                                    <InputError message={errors.days} />
                                </div>
                            </div>
                            <InputError message={errors.status} />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Registrar notificación
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CloseDialog({
    followUp,
    options,
}: {
    followUp: Props['case'];
    options: Props['closingOptions'];
}) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(options[0]?.value ?? '');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="h-12">
                    <CircleCheck />
                    Cerrar caso
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Cerrar {followUp.code}</DialogTitle>
                <DialogDescription>
                    Si se emite la licencia a su DNI/RUC el caso se cierra solo.
                    Ciérralo a mano si lo regularizó por otra vía o si no lo
                    hizo en el plazo y se deriva a sanción.
                </DialogDescription>
                <Form
                    noValidate
                    {...InspectionCaseController.close.form(followUp.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="min-w-0 space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <input type="hidden" name="status" value={status} />
                            <div className="grid grid-cols-2 gap-2">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setStatus(option.value)}
                                        aria-pressed={status === option.value}
                                        className={cn(
                                            'rounded-xl border p-3 text-sm font-semibold',
                                            status === option.value
                                                ? 'border-primary ring-2 ring-ring/40'
                                                : 'bg-background text-muted-foreground',
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="resolution_note">
                                    Sustento
                                </Label>
                                <textarea
                                    id="resolution_note"
                                    name="resolution_note"
                                    rows={3}
                                    maxLength={500}
                                    placeholder={
                                        status === 'derivado'
                                            ? 'No regularizó en el plazo; se deriva a…'
                                            : 'Cómo se verificó que regularizó…'
                                    }
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                                />
                                <InputError message={errors.resolution_note} />
                                <InputError
                                    message={errors.status ?? undefined}
                                />
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Cerrar caso
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function Item({
    label,
    wide,
    children,
}: {
    label: string;
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={wide ? 'sm:col-span-2' : undefined}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-semibold uppercase">{children}</dd>
        </div>
    );
}

InspectionCasesShow.layout = ({ case: followUp }: Props) => ({
    breadcrumbs: [
        { title: 'Fiscalización', href: index() },
        { title: 'Negocios sin licencia', href: casesIndex() },
        { title: followUp.code, href: show(followUp.id) },
    ],
});
