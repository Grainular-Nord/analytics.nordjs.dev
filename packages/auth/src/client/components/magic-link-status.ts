import { derived, grain } from '@grainular/grains';
import { $if, html } from '@grainular/nord';
import type { AuthStore } from '../auth.store';

export type MagicLinkStatusOptions = {
    store: AuthStore;
    onVerified: () => void;
    /** href for the "back to sign in" link on failure. Defaults to '/signin'. */
    signinHref?: string;
    /** Appended after the outer wrapper's default classes. */
    class?: string;
};

// Self-contained landing-page widget for the magic link URL: reads `token`
// from the current location, verifies it, and reports success/failure.
export const MagicLinkStatus = ({
    store,
    onVerified,
    signinHref = '/signin',
    class: extraClass = '',
}: MagicLinkStatusOptions) => {
    const error = grain<string | null>(null);

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
        error.set('This link is missing its token.');
    } else {
        store.actions.verifyMagicLink(token).then((response) => {
            if (response.ok) return onVerified();
            error.set((response.data as { message: string }).message);
        });
    }

    return html`<div class="${extraClass}">
        ${$if(derived(error, (value) => value != null))
            .$then(
                () => html`<div class="flex flex-col items-center gap-3">
                    <p class="text-sm text-danger">${error}</p>
                    <a class="text-sm font-medium text-accent underline" href="${signinHref}">Back to sign in</a>
                </div>`,
            )
            .$else(() => html`<p class="text-sm text-ink-muted">Verifying your magic link…</p>`)}
    </div>`;
};
