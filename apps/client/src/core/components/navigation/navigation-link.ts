import { html } from '@grainular/nord';
import { active } from '@grainular/router';

export const NavigationLink = (item: { href: string; label: string }) => html`<a
    class="rounded-xs px-2 py-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink [&.active]:bg-accent-soft [&.active]:text-ink"
    ${active('active')}
    href="${item.href}"
>
    ${item.label}
</a>`;
