import { html, type ComponentFragment } from '@grainular/nord';
import { ChevronLeft } from 'lucide';
import { Icon } from './icon';

type PageHeaderContent = ComponentFragment | string;

export type PageHeaderOptions = {
    /** Optional breadcrumb-style link displayed above the title. */
    back?: { href: string; label: string };
    title: PageHeaderContent;
    description?: PageHeaderContent;
    /** Right-aligned slot for actions or view controls. */
    trailing?: ComponentFragment;
};

// Shared heading treatment for every authenticated top-level page.
export const PageHeader = ({ back, title, description, trailing }: PageHeaderOptions) => {
    return html`<header class="mb-7 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <div class="min-w-0 sm:mr-auto">
            ${back
                ? html`<a
                      class="mb-1 inline-flex items-center gap-0.5 text-xs font-medium text-ink-faint hover:underline"
                      href="${back.href}"
                  >
                      ${Icon(ChevronLeft, { size: 14 })}${back.label}</a
                  >`
                : html``}
            <h1 class="text-xl font-semibold tracking-tight">${title}</h1>
            ${description ? html`<p class="mt-1 text-sm text-ink-muted">${description}</p>` : html``}
        </div>
        <div class="max-w-full">${trailing ?? html``}</div>
    </header>`;
};
