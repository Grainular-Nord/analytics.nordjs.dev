import { SigninForm } from '@analytics/auth/client';
import { html } from '@grainular/nord';
import { navigate } from '@grainular/router';
import { authStore } from '../../lib/auth';
import { Brand } from '../../core/components/brand';

export default () => {
    return html`<div class="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
        <div class="text-center">
            <h1 class="text-2xl font-semibold tracking-tight">${Brand({ class: 'text-2xl' })}</h1>
            <p class="mt-1 text-sm text-ink-muted">Anonymous, aggregate-only page analytics.</p>
        </div>

        ${SigninForm({ class: 'w-full max-w-md', store: authStore, onSignedIn: () => navigate('/dashboard') })}

        <p class="max-w-sm text-center text-xs text-ink-muted">
            No account yet? Request a magic link — signup happens on first use. Links are only visible in the server
            logs, which is the whole access control.
        </p>
    </div>`;
};
