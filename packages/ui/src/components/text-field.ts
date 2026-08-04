import { html } from '@grainular/nord';

export type TextFieldOptions = {
    name: string;
    type?: string;
    placeholder?: string;
    autocomplete?: string;
    /** Appended after the default classes. */
    class?: string;
};

// The one plain-input style used across sign-in and site-creation forms.
export const TextField = (options: TextFieldOptions) => {
    const { name, type = 'text', placeholder = '', autocomplete = '', class: extraClass = '' } = options;

    return html`<input
        class="w-full rounded-xs border border-line bg-surface-raised px-3 py-2 text-sm outline-none transition-colors focus:border-accent ${extraClass}"
        name="${name}"
        type="${type}"
        placeholder="${placeholder}"
        autocomplete="${autocomplete}"
    />`;
};
