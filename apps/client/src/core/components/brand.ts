import { html } from '@grainular/nord';

type BrandOptions = {
    href?: string;
    class?: string;
};

/** The product mark and name used wherever we identify the app. */
export const Brand = ({ href, class: className = '' }: BrandOptions = {}) => {
    const content = html`<svg
            aria-hidden="true"
            class="size-5 shrink-0"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="64" height="64" rx="16" fill="#3478E6" />
            <path
                d="M16 43.5 28.5 31l7.5 7.5L48 26.5"
                stroke="white"
                stroke-width="7"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <circle cx="48" cy="26.5" r="4" fill="#9FF3D3" />
        </svg>
        <span>Analytics</span>`;

    const classes = `inline-flex items-center gap-2 text-base font-semibold tracking-tight ${className}`;
    return href
        ? html`<a class="${classes}" href="${href}">${content}</a>`
        : html`<span class="${classes}">${content}</span>`;
};
