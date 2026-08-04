import { derived } from '@grainular/grains';
import { $each, $if, html } from '@grainular/nord';
import { AsyncBoundary, Card, Container, formatViews, PageHeader } from '@analytics/ui';
import { dotFor } from '../sites/store/sites.store';
import { summaryStore } from './store/summary.store';

export default () => {
    const { overviews, loading, error } = summaryStore.state;

    const rows = derived(overviews, (list) => list.map((site, index) => ({ ...site, dot: dotFor(index) })));

    return Container({
        children: html`${PageHeader({
            title: 'Dashboard',
            description: 'Your sites at a glance.',
            trailing: html`<a class="text-xs text-ink-faint hover:text-ink" href="/sites">Manage sites</a>`,
        })}
        ${AsyncBoundary({
            loading,
            error,
            loadingText: 'Loading sites…',
            children: () => html`${$if(derived(overviews, (list) => list.length === 0)).$then(
                    () => html`<div class="rounded-xs border border-line bg-surface-raised p-8 text-center">
                        <p class="text-sm text-ink-muted">No sites yet.</p>
                        <a class="mt-2 inline-block text-sm font-medium text-accent hover:underline" href="/sites">
                            Add your first site →
                        </a>
                    </div>`,
                )}
                ${$if(derived(overviews, (list) => list.length > 0)).$then(
                    () => html`<div class="flex flex-col gap-3">
                        ${$each(rows).$as(
                            (site) => html`<a href="/${site.id}" class="block">
                                ${Card({
                                    class: 'flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-accent',
                                    children: html`<div class="min-w-0 flex items-center gap-2.5">
                                            <span
                                                class="inline-block size-2 rounded-full"
                                                style="background: ${site.dot}"
                                            ></span>
                                            <div>
                                                <div class="font-semibold">${site.name}</div>
                                                <div class="text-sm text-ink-muted">${site.domain}</div>
                                            </div>
                                        </div>
                                        <div class="ml-auto text-right">
                                            <div class="font-mono text-lg font-semibold tabular-nums">
                                                ${formatViews(site.views)}
                                            </div>
                                            <div class="text-xs text-ink-muted">views, last 30d</div>
                                        </div>`,
                                })}
                            </a>`,
                        )}
                    </div>`,
                )}

                <footer class="mt-6 text-xs text-ink-faint">
                    Aggregated counts only — no IPs, no fingerprints, no cookies.
                </footer>`,
        })}`,
    });
};
