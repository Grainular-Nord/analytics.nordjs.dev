import { html, on, type ComponentFragment, type Subscribable } from '@grainular/nord';

export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'danger-text';

const BASE_CLASS = 'cursor-pointer disabled:cursor-not-allowed';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary:
        'rounded-xs bg-accent px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50',
    outline:
        'rounded-xs border border-line px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface disabled:opacity-50',
    danger: 'rounded-xs bg-danger px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50',
    'danger-text': 'text-sm font-medium text-danger',
};

export type ButtonOptions = {
    variant?: ButtonVariant;
    type?: 'button' | 'submit';
    disabled?: boolean | Subscribable<boolean>;
    /** Appended after the default classes — use for spacing, sizing, non-conflicting utilities. */
    class?: string;
    onClick?: (event: MouseEvent) => void;
    children: ComponentFragment | string;
};

export const Button = (options: ButtonOptions) => {
    const {
        variant = 'outline',
        type = 'button',
        disabled = false,
        class: extraClass = '',
        onClick,
        children,
    } = options;

    return html`<button
        type="${type}"
        class="${BASE_CLASS} ${VARIANT_CLASS[variant]} ${extraClass}"
        disabled="${disabled}"
        ${on('click', onClick ?? (() => {}))}
    >
        ${children}
    </button>`;
};
