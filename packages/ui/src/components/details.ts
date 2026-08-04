import { html, mounted, type PropsWithChildren } from '@grainular/nord';

export type DetailsOptions = PropsWithChildren<{
    title: string;
    name?: string;
    open?: boolean;
}>;

// A disclosure with an animated chevron and a height/opacity transition on
// ::details-content — progressive enhancement, plain <details> otherwise.
export const Details = ({ children, title, name, open = false }: DetailsOptions) => {
    return html`<details
        class="group [&::details-content]:h-0 [&::details-content]:overflow-clip [&::details-content]:opacity-0 [&::details-content]:transition-[content-visibility,height,opacity] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:transition-discrete open:[&::details-content]:h-auto open:[&::details-content]:opacity-100"
        name="${name ?? ''}"
        ${mounted((el) => {
            (el as HTMLDetailsElement).open = open;
            return () => {};
        })}
    >
        <summary
            class="flex cursor-pointer list-none items-baseline justify-between gap-4 text-sm font-medium text-ink hover:text-accent focus-visible:text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
        >
            <span>${title}</span>
            <svg
                class="size-4 shrink-0 translate-y-[0.15em] stroke-current transition-transform duration-200 ease-out group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="m6 9 6 6 6-6"></path>
            </svg>
        </summary>
        <div class="mt-3 space-y-3 text-ink-muted">${children}</div>
    </details>`;
};
