import { AsyncBoundary, Card, Container, formatViews, PageHeader, RankedList, ViewsChart } from '@analytics/ui';
import { combined, derived } from '@grainular/grains';
import { $each, html } from '@grainular/nord';
import { dotFor, sitesStore } from '../sites/store/sites.store';
import { siteDashboardStore, type Range } from './store/site-dashboard.store';

const RANGES: { value: Range; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
];
const RANGE_LABEL: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

const formatDelta = (current: number, previous: number) => {
    if (previous <= 0) return { text: current > 0 ? 'new' : '—', color: 'var(--color-ink-faint)' };
    const change = ((current - previous) / previous) * 100;
    return {
        text: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        color: change >= 0 ? 'var(--color-good)' : 'var(--color-bad)',
    };
};

export default () => {
    const { sites } = sitesStore.state;
    const { currentSiteId, currentRange, timeseries, previousTotal, pages, referrers, loading, error } =
        siteDashboardStore.state;

    const site = derived(combined([sites, currentSiteId]), ([list, id]) => list.find((s) => s.id === id) ?? null);

    const totalViews = derived(timeseries, (points) => points.reduce((total, point) => total + point.views, 0));
    const avgViews = derived(timeseries, (points) =>
        points.length ? Math.round(points.reduce((total, point) => total + point.views, 0) / points.length) : 0,
    );
    const delta = derived(combined([totalViews, previousTotal]), ([current, previous]) =>
        formatDelta(current, previous),
    );

    const pageRows = derived(pages, (rows) => rows.map(({ path, views }) => ({ label: path, views })));
    const referrerRows = derived(referrers, (rows) =>
        rows.map(({ referrer, views }) => ({
            label: referrer === 'direct' ? 'Direct / none' : referrer,
            views,
        })),
    );

    const stats = derived(combined([totalViews, referrers, avgViews, delta]), ([total, refs, avg, deltaValue]) => [
        {
            label: 'Page views',
            value: formatViews(total),
            delta: deltaValue.text,
            deltaColor: deltaValue.color,
        },
        {
            label: 'Referrers',
            value: String(refs.length),
            delta: 'sources',
            deltaColor: 'var(--color-ink-faint)',
        },
        {
            label: 'Views / day',
            value: formatViews(avg),
            delta: 'avg',
            deltaColor: 'var(--color-ink-faint)',
        },
    ]);

    const siteTabs = derived(combined([sites, currentSiteId, currentRange]), ([list, id, range]) =>
        list.map((candidate, index) => ({
            id: candidate.id,
            label: candidate.name,
            dot: dotFor(index),
            active: candidate.id === id,
            href: `/${candidate.id}?range=${range}`,
        })),
    );

    const rangeTabs = derived(combined([currentRange, currentSiteId]), ([active, id]) =>
        RANGES.map((option) => ({
            ...option,
            active: option.value === active,
            href: `/${id}?range=${option.value}`,
        })),
    );

    const updated = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return Container({
        children: html`${PageHeader({
            title: html`${derived(site, (current) => current?.name ?? 'Site analytics')}`,
            description: html`${derived(site, (current) => current?.domain ?? 'Daily aggregate page views')}`,
            trailing: html`<div
                class="flex w-fit max-w-full flex-wrap gap-1 rounded-xs border border-line bg-surface-raised p-1"
            >
                ${$each(rangeTabs).$as(
                    (tab) => html`<a
                        href="${tab.href}"
                        class="${tab.active
                            ? 'rounded-xs bg-white px-2.5 py-1 text-xs font-medium shadow-sm'
                            : 'rounded-xs px-2.5 py-1 text-xs text-ink-muted'}"
                    >
                        ${tab.label}
                    </a>`,
                )}
            </div>`,
        })}
        ${AsyncBoundary({
            loading,
            error,
            loadingText: 'Loading site data…',
            children: () => html` <nav class="mb-5 flex flex-wrap gap-1 border-b border-line">
                    ${$each(siteTabs).$as(
                        (tab) => html`<a
                            href="${tab.href}"
                            class="${tab.active
                                ? '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium text-ink'
                                : '-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm text-ink-muted'}"
                            style="${tab.active ? 'border-color: var(--color-accent)' : ''}"
                        >
                            <span class="inline-block size-2 rounded-full" style="background: ${tab.dot}"></span>
                            ${tab.label}
                        </a>`,
                    )}
                    <a
                        class="-mb-px inline-flex items-center border-b-2 border-transparent px-3 py-2.5 text-xs text-ink-faint hover:text-ink sm:ml-auto"
                        href="/sites"
                    >
                        Manage sites
                    </a>
                </nav>

                <section class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    ${$each(stats).$as(
                        (stat) => html`<div class="rounded-xs border border-line bg-surface-raised px-5 py-4">
                            <div class="mb-2 text-xs text-ink-muted">${stat.label}</div>
                            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span class="text-2xl font-semibold tracking-tight tabular-nums">${stat.value}</span>
                                <span class="font-mono text-xs" style="color: ${stat.deltaColor}">${stat.delta}</span>
                            </div>
                        </div>`,
                    )}
                </section>

                <section class="mb-3 rounded-xs border border-line bg-surface-raised p-5">
                    <div class="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span class="text-sm font-semibold">Page views</span>
                        <span class="font-mono text-xs text-ink-faint">
                            ${derived(currentRange, (value) => `last ${RANGE_LABEL[value]} · daily`)}
                        </span>
                    </div>
                    <div class="h-52 sm:aspect-4/1 sm:h-auto">${ViewsChart(timeseries)}</div>
                </section>

                <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    ${Card({
                        children: html`<div class="mb-3 text-sm font-semibold">Referrers</div>
                            ${RankedList(referrerRows, {
                                emptyText: 'No external referrers yet.',
                                fill: 'var(--color-accent-soft)',
                            })}`,
                    })}
                    ${Card({
                        children: html`<div class="mb-3 text-sm font-semibold">Top pages</div>
                            ${RankedList(pageRows, {
                                emptyText: 'No views in this range yet.',
                                fill: 'var(--color-teal-soft)',
                                mono: true,
                            })}`,
                    })}
                </section>

                <footer class="mt-6 flex flex-col gap-1 text-xs text-ink-faint sm:flex-row sm:justify-between sm:gap-4">
                    <span
                        >${derived(site, (current) => current?.domain ?? '')} — aggregated counts only, no IPs, no
                        fingerprints, no cookies.</span
                    >
                    <span class="font-mono">updated ${updated}</span>
                </footer>`,
        })}`,
    });
};
