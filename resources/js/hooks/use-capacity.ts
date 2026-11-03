import { usePage } from '@inertiajs/react';

/**
 * Suggested capacity (aforo) for an area: floor(area / m² per person), e.g.
 * 100 m² at 1.5 m²/person = 66 people. Empty when there is no area.
 */
export function useCapacityFor(): (area: string) => string {
    const { areaPerPerson } = usePage().props;

    return (area) => {
        const value = Number(area);

        // The epsilon keeps exact divisions (4.5 / 1.5) from flooring down.
        return value > 0 && areaPerPerson > 0
            ? String(Math.floor(value / areaPerPerson + 1e-9))
            : '';
    };
}
