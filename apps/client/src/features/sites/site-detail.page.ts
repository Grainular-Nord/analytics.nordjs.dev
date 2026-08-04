import {
    AsyncBoundary,
    Card,
    confirmationDialog,
    Container,
    Details,
    Icon,
    openDialog,
    PageHeader,
} from '@analytics/ui';
import { derived, grain } from '@grainular/grains';
import { $if, html, mounted, on } from '@grainular/nord';
import { Check, Copy } from 'lucide';
import beaconSource from '../../../../../packages/beacon/src/beacon.js?raw';
import { API_URL } from '../../core/services/query';
import { navigate } from '../../router';
import { siteSettingsStore } from './store/site-settings.store';
import { sitesStore } from './store/sites.store';

export default () => {
    const { site, error, loading } = siteSettingsStore.state;
    const message = grain<string | null>(null);
    const copied = grain(false);
    let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

    const snippet = derived(site, (current) =>
        current ? `<script data-site="${current.key}" data-endpoint="${API_URL}">\n${beaconSource}\n</script>` : '',
    );

    const handleOrigins = async (event: SubmitEvent) => {
        event.preventDefault();
        const current = site();
        if (!current) return;

        const raw = String(new FormData(event.target as HTMLFormElement).get('origins') ?? '');
        const allowedOrigins = raw
            .split(/[\n,]/)
            .map((origin) => origin.trim())
            .filter(Boolean);

        const response = await sitesStore.actions.updateSite(current.id, { allowedOrigins });
        if (response.ok) siteSettingsStore.actions.setLocal(response.data);
        message.set(response.ok ? 'Origins saved' : response.data.message);
    };

    const handleDelete = async () => {
        const current = site();
        if (!current) return;
        const confirmed = await openDialog(confirmationDialog, {
            caption: 'Delete site?',
            variant: 'danger',
            size: 'sm',
            props: {
                message: `Delete ${current.name} and all of its data? This cannot be undone.`,
                confirmLabel: 'Delete site',
                confirmVariant: 'danger',
            },
        });
        if (!confirmed) return;

        const response = await sitesStore.actions.deleteSite(current.id);
        if (response.ok) navigate('/sites');
        else message.set(response.data.message);
    };

    const copySnippet = () => {
        navigator.clipboard.writeText(snippet()).then(() => {
            message.set('Snippet copied');
            copied.set(true);
            clearTimeout(copiedTimeout);
            copiedTimeout = setTimeout(() => copied.set(false), 2000);
        });
    };

    return Container({
        class: 'flex flex-col gap-5',
        children: html`${AsyncBoundary({
            loading,
            error,
            loadingText: 'Loading site…',
            children: () =>
                html`${$if(derived(site, (current) => current != null)).$then(
                    () => html`<div class="flex flex-col gap-5">
                        ${PageHeader({
                            back: { href: '/sites', label: 'Manage sites' },
                            title: html`${derived(site, (current) => current?.name ?? '')}`,
                            description: html`${derived(site, (current) => current?.domain ?? '')}`,
                        })}
                        ${$if(derived(message, (value) => !!value)).$then(
                            () => html`<div class="text-sm text-accent">${message}</div>`,
                        )}
                        ${Card({
                            children: html`<h2 class="text-sm font-semibold">Inline beacon</h2>
                                <p class="mt-1 text-sm text-ink-muted">
                                    Copy the complete, self-contained script into the site's <code>&lt;head&gt;</code>.
                                    It sends path + referrer only — no cookies, no IPs, no identifiers.
                                </p>
                                ${Details({
                                    title: 'Show script',
                                    children: html`<div class="relative">
                                        <pre
                                            class="max-w-full overflow-x-auto rounded-xs bg-surface px-3 py-2 pr-11 font-mono text-xs"
                                        ><code>${snippet}</code></pre>
                                        <button
                                            type="button"
                                            class="absolute top-2 right-2 grid size-7 shrink-0 cursor-pointer place-items-center rounded-xs border border-line bg-surface-raised text-ink-muted hover:bg-surface hover:text-ink"
                                            aria-label="Copy script"
                                            title="Copy script"
                                            ${on('click', copySnippet)}
                                        >
                                            ${$if(copied)
                                                .$then(() => Icon(Check, { size: 14 }))
                                                .$else(() => Icon(Copy, { size: 14 }))}
                                        </button>
                                    </div>`,
                                })}`,
                        })}
                        ${Card({
                            children: html`<h2 class="text-sm font-semibold">Allowed origins</h2>
                                <p class="mt-1 text-sm text-ink-muted">
                                    Only these origins may send events for this site (one per line or comma separated).
                                </p>
                                <form class="mt-3 flex flex-col gap-2" ${on('submit', handleOrigins)}>
                                    <textarea
                                        class="min-h-20 w-full rounded-xs border border-line bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                                        name="origins"
                                        ${mounted((el) => {
                                            (el as HTMLTextAreaElement).value = site()?.allowedOrigins.join('\n') ?? '';
                                            return () => {};
                                        })}
                                    ></textarea>
                                    <button
                                        type="submit"
                                        class="self-start cursor-pointer rounded-xs bg-accent px-4 py-2 text-sm font-semibold text-white"
                                    >
                                        Save origins
                                    </button>
                                </form>`,
                        })}

                        <div class="rounded-xs border border-danger/30 p-5">
                            <h2 class="text-sm font-semibold text-danger">Danger zone</h2>
                            <button
                                class="mt-3 cursor-pointer rounded-xs border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
                                ${on('click', handleDelete)}
                            >
                                Delete site and all data
                            </button>
                        </div>
                    </div>`,
                )}`,
        })}`,
    });
};
