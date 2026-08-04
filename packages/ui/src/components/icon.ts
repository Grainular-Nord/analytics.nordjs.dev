import { createDirective, html, type ComponentFragment } from '@grainular/nord';
import { createElement, type IconNode } from 'lucide';

export type IconOptions = { size?: number; class?: string };

// Wraps a lucide IconNode as a Nord fragment — the one place that touches lucide's DOM API.
export const Icon = (icon: IconNode, { size = 16, class: extraClass = '' }: IconOptions = {}): ComponentFragment => {
    const connect = createDirective((node) => {
        node.append(createElement(icon, { width: size, height: size, stroke: 'currentColor', 'stroke-width': 2 }));
    });

    return html`<span class="flex ${extraClass}" aria-hidden="true" ${connect}></span>`;
};
