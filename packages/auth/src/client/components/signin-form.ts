import { derived, grain } from '@grainular/grains';
import { $if, html, on } from '@grainular/nord';
import { Button, Card, TextField } from '@analytics/ui';
import type { AuthStore } from '../auth.store';

export type SigninFormOptions = {
    store: AuthStore;
    /** Called after a successful passkey sign-in (magic link has its own landing page). */
    onSignedIn: () => void;
    /** Appended after the card's default classes. */
    class?: string;
};

// The interactive sign-in widget: passkey button + email-for-magic-link
// form. Branding/copy around it is left to the consuming page.
export const SigninForm = ({ store, onSignedIn, class: extraClass = '' }: SigninFormOptions) => {
    const pending = grain(false);
    const error = grain<string | null>(null);
    const magicSent = grain(false);

    const run = async (action: () => Promise<{ ok: boolean; data: unknown }>, onOk: () => void) => {
        error.set(null);
        pending.set(true);
        const response = await action();
        pending.set(false);

        if (!response.ok) {
            const { message } = response.data as { message: string };
            error.set(message);
            return;
        }

        onOk();
    };

    const readEmail = (event: Event) => {
        const form = (event.target as HTMLElement).closest('form');
        return String(new FormData(form ?? undefined).get('email') ?? '').trim();
    };

    const handleMagicLink = (event: Event) => {
        event.preventDefault();
        const email = readEmail(event);
        if (!email) return error.set('Enter your email first');
        run(
            () => store.actions.requestMagicLink(email),
            () => magicSent.set(true),
        );
    };

    const handlePasskey = () => {
        run(() => store.actions.signinWithPasskey(), onSignedIn);
    };

    return Card({
        class: `max-w-sm shadow-sm ${extraClass}`,
        children: html`${$if(magicSent)
            .$then(
                () => html`<div class="flex flex-col gap-3 text-center">
                    <div class="text-3xl">🔑</div>
                    <p class="text-sm">
                        A magic link was generated — it is printed to the
                        <strong>server console</strong>. Grab it there to sign in.
                    </p>
                    <button
                        class="cursor-pointer text-sm font-medium text-accent underline"
                        ${on('click', () => magicSent.set(false))}
                    >
                        Back
                    </button>
                </div>`,
            )
            .$else(
                () => html`<form class="flex flex-col gap-3" ${on('submit', handleMagicLink)}>
                    ${Button({
                        variant: 'outline',
                        disabled: pending,
                        onClick: handlePasskey,
                        children: 'Use a passkey',
                    })}
                    <div class="my-1 flex items-center gap-3 text-xs text-ink-muted">
                        <span class="h-px grow bg-line"></span>or<span class="h-px grow bg-line"></span>
                    </div>
                    <label class="flex flex-col gap-1 text-sm font-medium">
                        Email
                        ${TextField({
                            name: 'email',
                            type: 'email',
                            autocomplete: 'email webauthn',
                            placeholder: 'you@example.com',
                        })}
                    </label>
                    ${Button({
                        variant: 'primary',
                        type: 'submit',
                        disabled: pending,
                        children: 'Email me a magic link',
                    })}
                    ${$if(derived(error, (value) => !!value)).$then(
                        () => html`<div class="text-center text-sm text-danger">${error}</div>`,
                    )}
                </form>`,
            )}`,
    });
};
