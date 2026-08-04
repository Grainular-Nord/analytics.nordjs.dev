import { html, type ComponentFragment } from '@grainular/nord';

export type CardOptions = {
    /** Appended after the default classes — use for spacing, sizing, non-conflicting utilities. */
    class?: string;
    children: ComponentFragment;
};

// The one card shape used across the app: thin border, subtle raised
// surface, sharp 2px corners — matches the imported design's own cards.
export const Card = ({ class: extraClass = '', children }: CardOptions) => {
    return html`<div class="rounded-xs border border-line bg-surface-raised p-5 ${extraClass}">${children}</div>`;
};
