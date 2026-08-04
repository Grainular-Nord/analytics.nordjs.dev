import { derived, grain } from '@grainular/grains';
import { $each, $if, html, on } from '@grainular/nord';
import { Button, Card, confirmationDialog, createDialog, openDialog } from '@analytics/ui';
import type { AuthStore } from '../auth.store';

export type PasskeyManagerOptions = {
    store: AuthStore;
    /** Appended after the card's default classes. */
    class?: string;
};

const passkeyLabelDialog = createDialog<Record<never, never>, string>((_, close) => {
    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        const label = String(new FormData(event.target as HTMLFormElement).get('label') ?? '').trim();
        close(label);
    };

    return html`<form class="flex flex-col gap-5" ${on('submit', submit)}>
        <label class="flex flex-col gap-1 text-sm font-medium">
            Name
            <input
                class="rounded-xs border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                name="label"
                placeholder="MacBook Touch ID"
                maxlength="64"
                autofocus
            />
        </label>
        <div class="flex justify-end gap-2">
            ${Button({ onClick: () => close(null), children: 'Cancel' })}
            ${Button({ variant: 'primary', type: 'submit', children: 'Add passkey' })}
        </div>
    </form>`;
});

// Self-contained "Passkeys" card: list, add, remove. Used on an account
// settings page.
export const PasskeyManager = ({ store, class: extraClass = '' }: PasskeyManagerOptions) => {
    const message = grain<{ kind: 'ok' | 'error'; text: string } | null>(null);
    const pending = grain(false);

    const notify = (kind: 'ok' | 'error', text: string) => message.set({ kind, text });

    const handleAddPasskey = async () => {
        const label = await openDialog(passkeyLabelDialog, {
            caption: 'Name this passkey',
            size: 'sm',
            props: {},
        });
        if (label === null) return;

        pending.set(true);
        const response = await store.actions.registerPasskey(label || undefined);
        pending.set(false);

        if (!response.ok) return notify('error', response.data.message);
        notify('ok', 'Passkey registered');
    };

    const handleRemovePasskey = async (credentialId: string) => {
        const confirmed = await openDialog(confirmationDialog, {
            caption: 'Remove passkey?',
            variant: 'danger',
            size: 'sm',
            props: {
                message: 'You will no longer be able to use this passkey to sign in.',
                confirmLabel: 'Remove',
                confirmVariant: 'danger',
            },
        });
        if (!confirmed) return;

        const response = await store.actions.removePasskey(credentialId);
        if (!response.ok) return notify('error', response.data.message);
        notify('ok', 'Passkey removed');
    };

    const passkeys = derived(store.state.identity, (user) => user?.passkeys ?? []);

    return Card({
        class: extraClass,
        children: html`<div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold">Passkeys</h2>
                ${Button({
                    disabled: pending,
                    onClick: handleAddPasskey,
                    class: 'px-3 py-1.5',
                    children: 'Add passkey',
                })}
            </div>

            ${$if(derived(message, (value) => value != null)).$then(() => {
                const text = derived(message, (value) => value?.text ?? '');
                const cls = derived(message, (value) =>
                    value?.kind === 'error' ? 'mt-2 text-sm text-danger' : 'mt-2 text-sm text-accent',
                );
                return html`<div class="${cls}">${text}</div>`;
            })}
            ${$if(derived(passkeys, (list) => list.length === 0))
                .$then(
                    () => html`<p class="mt-3 text-sm text-ink-muted">
                        No passkeys yet. Add one to sign in with Touch ID / Face ID.
                    </p>`,
                )
                .$else(
                    () => html`<ul class="mt-3 flex flex-col divide-y divide-line">
                        ${$each(passkeys).$as(
                            (passkey) => html`<li class="flex items-center justify-between py-2">
                                <div>
                                    <div class="text-sm font-medium">${passkey.label ?? 'Unnamed passkey'}</div>
                                    <div class="text-xs text-ink-muted">
                                        Added ${new Date(passkey.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                ${Button({
                                    variant: 'danger-text',
                                    onClick: () => handleRemovePasskey(passkey.id),
                                    children: 'Remove',
                                })}
                            </li>`,
                        )}
                    </ul>`,
                )}`,
    });
};
