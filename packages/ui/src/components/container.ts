import { html, type ComponentFragment } from '@grainular/nord';

export type ContainerOptions = {
    /** Appended after the shared page layout classes. */
    class?: string;
    children: ComponentFragment;
};

// The one page-content wrapper used across every authenticated top-level page.
export const Container = ({ class: extraClass = '', children }: ContainerOptions) => {
    return html`<div class="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-6 ${extraClass}">${children}</div>`;
};
