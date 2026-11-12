const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/**
 * Dates come as YYYY-MM-DD (or a full timestamp); parse the day at noon so
 * the time zone never shifts it.
 */
export const toDate = (value: string) =>
    new Date(`${value.slice(0, 10)}T12:00:00`);

/**
 * "hoy", "hace 23 días", "hace 2 meses": how old something is at a glance.
 */
export function ago(value: string): string {
    const days = Math.round((Date.now() - toDate(value).getTime()) / 864e5);

    if (days < 30) {
        return relative.format(-Math.max(days, 0), 'day');
    }

    if (days < 365) {
        return relative.format(-Math.round(days / 30), 'month');
    }

    return relative.format(-Math.round(days / 365), 'year');
}
