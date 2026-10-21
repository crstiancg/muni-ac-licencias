import type { SVGAttributes } from 'react';

/**
 * Municipal building (pediment, columns and base). Uses currentColor.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2.5 29.5 10v2.5h-27V10L16 2.5Zm0 3.3L8.4 10h15.2L16 5.8Z" />
            <path d="M5 14.5h3.5v10H5zM11 14.5h3.5v10H11zM17.5 14.5H21v10h-3.5zM23.5 14.5H27v10h-3.5z" />
            <path d="M2.5 26.5h27v3h-27z" />
        </svg>
    );
}
