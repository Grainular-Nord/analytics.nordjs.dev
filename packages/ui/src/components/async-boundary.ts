import { combined, derived, type Grain } from '@grainular/grains';
import { $switch, html, type ComponentFragment } from '@grainular/nord';

export type AsyncBoundaryOptions = {
    loading: Grain<boolean>;
    error: Grain<Error | null>;
    /** Creates the settled UI whenever the resource reaches the idle phase. */
    children: () => ComponentFragment;
    /** Shown while loading and nothing has resolved yet. Defaults to 'Loading…'. */
    loadingText?: string;
};

type Phase = 'error' | 'loading' | 'idle';

// The loading/error boundary used by pages that fetch their own data. A single
// derived phase drives $switch, so only one of the pending, error, or settled
// states can be mounted at a time.
export const AsyncBoundary = ({ loading, error, loadingText = 'Loading…', children }: AsyncBoundaryOptions) => {
    const message = derived(error, (value) => value?.message ?? 'Something went wrong.');
    const phase = derived(
        combined([loading, error]),
        ([busy, err]): Phase => (err != null ? 'error' : busy ? 'loading' : 'idle'),
    );

    return html`${$switch(phase)
        .$case('error', () => html`<p class="text-sm text-danger">${message}</p>`)
        .$case(
            'loading',
            () => html`<div class="flex items-center justify-center gap-3 py-10 text-sm text-ink-muted" role="status">
                <span
                    class="size-7 shrink-0 animate-spin rounded-full border-2 border-accent/20 border-r-accent border-t-accent"
                    aria-hidden="true"
                >
                </span>
                <span class="font-medium">${loadingText}</span>
            </div>`,
        )
        .$default(children)}`;
};

// True once a resource has finished loading with no error — the
// "empty state is actually meaningful now" signal, as opposed to the
// grain just being empty because nothing has arrived yet.
export const isSettled = (loading: Grain<boolean>, error: Grain<Error | null>) =>
    derived(combined([loading, error]), ([busy, err]) => !busy && err == null);
