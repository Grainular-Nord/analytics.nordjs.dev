import { AsyncBoundary, Card, Container, formatViews, PageHeader, ViewsChart } from '@analytics/ui';
import { derived } from '@grainular/grains';
import { $each, $if, html } from '@grainular/nord';
import { publicDashboardStore } from './store/public-dashboard.store';

const summaryFor = (timeseries: { views: number }[], referrerCount: number) => {
    const pageViews = timeseries.reduce((total, point) => total + point.views, 0);
    return [
        { label: 'Page views', value: formatViews(pageViews) },
        { label: 'Referrers', value: String(referrerCount) },
        { label: 'Views / day', value: formatViews(Math.round(pageViews / timeseries.length)) },
    ];
};

export default () => {
    const { sites, loading, error } = publicDashboardStore.state;

    return Container({
        children: html`${PageHeader({
            title: 'Analytics overview',
            description: 'Public, aggregate traffic across registered sites.',
        })}
        ${AsyncBoundary({
            loading,
            error,
            loadingText: 'Loading dashboards…',
            children: () => html`${$if(derived(sites, (list) => list.length > 0))
                    .$then(
                        () => html`<section class="flex flex-col gap-4">
                            ${$each(sites).$as(
                                (site, index) =>
                                    html`${Card({
                                        children: html`<div
                                                class="mb-5 flex flex-wrap items-baseline justify-between gap-3"
                                            >
                                                <h2 class="text-lg font-semibold">${site.name}</h2>
                                                <span class="font-mono text-xs text-ink-faint">last 30 days</span>
                                            </div>
                                            <div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                ${$each(() => summaryFor(site.timeseries, site.referrerCount)).$as(
                                                    (stat) => html`<div class="rounded-xs bg-surface px-4 py-3">
                                                        <div class="mb-1 text-xs text-ink-muted">${stat.label}</div>
                                                        <div class="font-mono text-xl font-semibold tabular-nums">
                                                            ${stat.value}
                                                        </div>
                                                    </div>`,
                                                )}
                                            </div>
                                            <div class="h-64 sm:h-72">
                                                ${ViewsChart(derived(sites, (list) => list[index()]?.timeseries ?? []))}
                                            </div>`,
                                    })}`,
                            )}
                        </section>`,
                    )
                    .$else(() => html`<p class="text-sm text-ink-muted">No registered sites yet.</p>`)}
                <footer class="mt-6 text-xs text-ink-faint">
                    Aggregated counts only — no personal data collected.
                </footer>`,
        })}`,
    });
};
