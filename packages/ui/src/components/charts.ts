import { derived, type Grain } from '@grainular/grains';
import { $each, $if, html } from '@grainular/nord';
import { viewsChartDirective } from '../directives/views-chart.directive';
import { formatViews } from '../utils/format';

export type TimeseriesPoint = { date: string; views: number };

export const ViewsChart = (series: Grain<TimeseriesPoint[]>) => {
    return html`<div class="relative h-full min-h-44" ${viewsChartDirective(series)}></div>`;
};

export type RankedRow = { label: string; views: number };

// A ranked list with an inline proportional fill behind the label — used for
// both referrers and top pages, distinguished only by fill color so the two
// panels read as siblings rather than duplicates.
export const RankedList = (rows: Grain<RankedRow[]>, options: { emptyText: string; fill: string; mono?: boolean }) => {
    const ranked = derived(rows, (list) => {
        const max = Math.max(1, ...list.map((row) => row.views));
        return list.slice(0, 8).map((row) => ({ ...row, pct: Math.round((row.views / max) * 100) }));
    });

    return html`${$if(derived(rows, (list) => list.length === 0))
        .$then(() => html`<p class="text-sm text-ink-muted">${options.emptyText}</p>`)
        .$else(
            () => html`<div class="flex flex-col gap-2">
                ${$each(ranked).$as(
                    (row) => html`<div class="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                        <div class="relative overflow-hidden rounded-xs px-2 py-1.5">
                            <div class="absolute inset-0" style="width: ${row.pct}%; background: ${options.fill}"></div>
                            <span class="relative ${options.mono ? 'font-mono text-xs' : ''}">${row.label}</span>
                        </div>
                        <span class="font-mono text-xs text-ink-muted">${formatViews(row.views)}</span>
                    </div>`,
                )}
            </div>`,
        )}`;
};
