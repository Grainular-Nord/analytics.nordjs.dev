import { grain, type Grain } from '@grainular/grains';
import { createDirective, html, on, type ComponentFragment } from '@grainular/nord';
import { AlertTriangle, X } from 'lucide';
import { Button } from './button';
import { Icon } from './icon';

export type DialogVariant = 'default' | 'danger';
export type DialogSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<DialogSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
};

export type DialogController<T, R> = {
    id: string;
    props: T;
    caption: string;
    size: DialogSize;
    variant: DialogVariant;
    settled: Grain<boolean>;
    close: (value: R | null) => void;
};

type DialogConstructor<T, R> = (props: T, close: (value: R | null) => void) => ComponentFragment;

export const createDialog = <T, R>(constructor: DialogConstructor<T, R>) => {
    return (controller: DialogController<T, R>) => {
        const ref = grain<HTMLDialogElement | null>(null);
        const connect = createDirective((node) => {
            const dialog = node as HTMLDialogElement;
            ref.set(dialog);

            const handleClose = () => controller.close(null);
            const handleBackdropClick = (event: Event) => {
                if (event.target === dialog) controller.close(null);
            };

            dialog.addEventListener('close', handleClose);
            dialog.addEventListener('click', handleBackdropClick);
            return () => {
                dialog.removeEventListener('close', handleClose);
                dialog.removeEventListener('click', handleBackdropClick);
            };
        });

        return {
            ref,
            fragment: html`<dialog
                id="${controller.id}"
                class="m-auto w-[min(calc(100%-2rem),32rem)] ${SIZE_CLASS[
                    controller.size
                ]} translate-y-0 scale-100 rounded-xs border border-line bg-surface-raised p-0 text-ink opacity-100 shadow-2xl transition-[opacity,transform,overlay,display] duration-150 ease-out transition-discrete open:starting:translate-y-1 open:starting:scale-97 open:starting:opacity-0 backdrop:bg-slate-900/40 backdrop:opacity-100 backdrop:transition-opacity backdrop:duration-150 backdrop:ease-out backdrop:starting:opacity-0 backdrop:[backdrop-filter:blur(2px)]"
                aria-labelledby="${controller.id}-caption"
                ui-dialog
                ${connect}
            >
                <header class="flex items-start justify-between gap-4 px-6 pt-6">
                    <div class="flex items-center gap-3">
                        ${controller.variant === 'danger'
                            ? html`<span
                                  class="grid size-9 shrink-0 place-items-center rounded-full bg-danger/10 text-danger"
                              >
                                  ${Icon(AlertTriangle, { size: 18 })}
                              </span>`
                            : html``}
                        <h2 id="${controller.id}-caption" class="text-base font-semibold">${controller.caption}</h2>
                    </div>
                    <button
                        type="button"
                        class="-mt-1 -mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-xs text-ink-muted hover:bg-surface hover:text-ink"
                        aria-label="Close dialog"
                        ${on('click', () => controller.close(null))}
                    >
                        ${Icon(X, { size: 16 })}
                    </button>
                </header>
                <div class="p-6">${constructor(controller.props, controller.close)}</div>
            </dialog>`,
        };
    };
};

export type OpenDialogOptions<T> = {
    props: T;
    caption: string;
    size?: DialogSize;
    variant?: DialogVariant;
};

export const openDialog = <T, R>(dialog: ReturnType<typeof createDialog<T, R>>, options: OpenDialogOptions<T>) => {
    const { promise, resolve } = Promise.withResolvers<R | null>();
    const settled = grain(false);
    const id = crypto.randomUUID();
    const anchor = document.createComment(`Dialog ${id}`);
    document.body.appendChild(anchor);

    let ref: Grain<HTMLDialogElement | null>;
    const close = (value: R | null) => {
        if (settled()) return;
        settled.set(true);
        resolve(value);
        ref()?.close();
        ref()?.remove();
    };

    const rendered = dialog({
        id,
        close,
        settled,
        size: options.size ?? 'md',
        variant: options.variant ?? 'default',
        caption: options.caption,
        props: options.props,
    });
    ref = rendered.ref;
    rendered.fragment.hydrate(anchor);
    ref()?.showModal();

    return promise;
};

export type ConfirmationDialogProps = {
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'primary' | 'danger';
};

export const confirmationDialog = createDialog<ConfirmationDialogProps, boolean>((props, close) => {
    return html`<div class="flex flex-col gap-5">
        <p class="text-sm text-ink-muted">${props.message}</p>
        <div class="flex flex-wrap justify-end gap-2">
            ${Button({ onClick: () => close(null), children: props.cancelLabel ?? 'Cancel' })}
            ${Button({
                variant: props.confirmVariant ?? 'primary',
                onClick: () => close(true),
                children: props.confirmLabel ?? 'Confirm',
            })}
        </div>
    </div>`;
});
