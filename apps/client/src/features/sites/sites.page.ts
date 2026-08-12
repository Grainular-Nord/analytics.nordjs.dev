import { combined, derived, grain } from '@grainular/grains';
import { $each, $if, html, on } from '@grainular/nord';
import { navigate } from '@grainular/router';
import { Pencil, Trash2 } from 'lucide';
import {
    AsyncBoundary,
    Button,
    confirmationDialog,
    Container,
    Icon,
    isSettled,
    openDialog,
    PageHeader,
    TextField,
} from '@analytics/ui';
import { sitesStore, type SiteSummary } from './store/sites.store';

type SiteCardOptions = {
    site: SiteSummary;
    onDelete: (site: SiteSummary) => void;
};

const SiteCard = ({ site, onDelete }: SiteCardOptions) => {
    return html`<article
        class="flex w-full flex-wrap items-center gap-3 rounded-xs border border-line bg-surface-raised p-5 transition-colors hover:border-accent"
    >
        <button
            type="button"
            class="min-w-0 flex-1 cursor-pointer text-left"
            aria-label="View ${site.name} analytics"
            ${on('click', () => navigate(`/${site.id}`))}
        >
            <div class="truncate font-semibold">${site.name}</div>
            <div class="truncate text-sm text-ink-muted">${site.domain}</div>
        </button>
        <div class="ml-auto flex shrink-0 items-center gap-1">
            <button
                type="button"
                class="grid size-8 cursor-pointer place-items-center rounded-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                aria-label="Edit ${site.name}"
                title="Edit site"
                ${on('click', () => navigate(`/sites/${site.id}`))}
            >
                ${Icon(Pencil)}
            </button>
            <button
                type="button"
                class="grid size-8 cursor-pointer place-items-center rounded-xs text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label="Delete ${site.name}"
                title="Delete site"
                ${on('click', () => onDelete(site))}
            >
                ${Icon(Trash2)}
            </button>
        </div>
    </article>`;
};

export default () => {
    const { sites, loading, error: listError } = sitesStore.state;
    const formError = grain<string | null>(null);
    const actionError = grain<string | null>(null);
    const creating = grain(false);

    const settledEmpty = derived(
        combined([isSettled(loading, listError), sites]),
        ([ready, list]) => ready && list.length === 0,
    );

    const handleCreate = async (event: SubmitEvent) => {
        event.preventDefault();
        formError.set(null);
        const form = event.target as HTMLFormElement;
        const data = new FormData(form);
        const name = String(data.get('name') ?? '').trim();
        const domain = String(data.get('domain') ?? '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '');

        if (!name || !domain) return formError.set('Name and domain are required');

        creating.set(true);
        const response = await sitesStore.actions.createSite({
            name,
            domain,
            allowedOrigins: [`https://${domain}`],
        });
        creating.set(false);

        if (!response.ok) return formError.set(response.data.message);
        form.reset();
    };

    const handleDelete = async (site: SiteSummary) => {
        actionError.set(null);
        const confirmed = await openDialog(confirmationDialog, {
            caption: 'Delete site?',
            size: 'sm',
            variant: 'danger',
            props: {
                message: `Delete ${site.name} and all of its data? This cannot be undone.`,
                confirmLabel: 'Delete site',
                confirmVariant: 'danger',
            },
        });
        if (!confirmed) return;

        const response = await sitesStore.actions.deleteSite(site.id);
        if (!response.ok) actionError.set(response.data.message);
    };

    return Container({
        class: 'flex flex-col gap-6',
        children: html`${PageHeader({
            back: { href: '/dashboard', label: 'Dashboard' },
            title: 'Manage sites',
            description: 'Every site sending events to this instance.',
        })}
        ${AsyncBoundary({
            loading,
            error: listError,
            loadingText: 'Loading sites…',
            children: () => html`${$if(settledEmpty).$then(
                    () => html`<p class="text-sm text-ink-muted">No sites yet — add your first one below.</p>`,
                )}
                ${$if(derived(actionError, (value) => !!value)).$then(
                    () => html`<div class="text-sm text-danger">${actionError}</div>`,
                )}
                <div class="flex flex-col gap-3">
                    ${$each(sites).$as((site) => SiteCard({ site, onDelete: handleDelete }))}
                </div>

                <form
                    class="flex flex-col gap-3 rounded-xs border border-dashed border-line p-5"
                    ${on('submit', handleCreate)}
                >
                    <h2 class="text-sm font-semibold">Add a site</h2>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        ${TextField({ name: 'name', placeholder: 'Name (e.g. nordjs.dev)' })}
                        ${TextField({ name: 'domain', placeholder: 'Domain (e.g. nordjs.dev)' })}
                    </div>
                    ${Button({
                        variant: 'primary',
                        type: 'submit',
                        disabled: creating,
                        class: 'self-start',
                        children: 'Create site',
                    })}
                    ${$if(derived(formError, (value) => !!value)).$then(
                        () => html`<div class="text-sm text-danger">${formError}</div>`,
                    )}
                </form>`,
        })}`,
    });
};
