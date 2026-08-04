import { html } from '@grainular/nord';

export default () => {
    return html`<div class="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
        <h1 class="text-3xl font-semibold">404</h1>
        <p class="text-sm text-ink-muted">This page does not exist.</p>
        <a class="text-sm font-medium text-accent underline" href="/">Back home</a>
    </div>`;
};
