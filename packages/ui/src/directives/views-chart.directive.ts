import { type Grain } from '@grainular/grains';
import { createDirective } from '@grainular/nord';
import uPlot from 'uplot';
import type { TimeseriesPoint } from '../components/charts';
import { formatViews } from '../utils/format';

const chartData = (points: TimeseriesPoint[]): uPlot.AlignedData => [
    points.map((point) => Date.parse(`${point.date}T00:00:00Z`) / 1_000),
    points.map((point) => point.views),
];

const dateLabel = (timestamp: number) =>
    new Date(timestamp * 1_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * Connects a host element to a responsive uPlot chart. The directive owns the
 * chart's data subscription, resize observer, tooltip, and disposal lifecycle.
 */
export const viewsChartDirective = (series: Grain<TimeseriesPoint[]>) =>
    createDirective((node) => {
        const host = node as HTMLDivElement;
        const tooltip = document.createElement('div');
        tooltip.className =
            'pointer-events-none absolute z-10 hidden -translate-x-1/2 -translate-y-full rounded-xs border border-line bg-surface-raised px-2.5 py-1.5 shadow-sm';
        host.append(tooltip);

        const height = () => Math.max(176, host.clientHeight);
        const plot = new uPlot(
            {
                width: Math.max(1, host.clientWidth),
                height: height(),
                legend: { show: false },
                cursor: { y: false, points: { show: false }, drag: { setScale: false } },
                series: [
                    {},
                    {
                        label: 'Views',
                        stroke: '#3478e6',
                        fill: 'rgba(52, 120, 230, 0.12)',
                        width: 2,
                        points: { show: false },
                    },
                ],
                axes: [
                    {
                        stroke: '#7b8090',
                        font: '12px JetBrains Mono, monospace',
                        grid: { show: false },
                        ticks: { show: false },
                        values: (_self, splits) => splits.map(dateLabel),
                    },
                    {
                        stroke: '#7b8090',
                        font: '12px JetBrains Mono, monospace',
                        size: 42,
                        grid: { stroke: '#e4e5e8', width: 1 },
                        ticks: { show: false },
                        values: (_self, splits) => splits.map((value) => formatViews(value)),
                    },
                ],
                hooks: {
                    setCursor: [
                        (self) => {
                            const index = self.cursor.idx;
                            if (index == null) return (tooltip.style.display = 'none');
                            const timestamp = self.data[0]?.[index];
                            const views = self.data[1]?.[index];
                            if (timestamp == null || views == null) return;
                            tooltip.style.display = 'block';
                            tooltip.style.left = `${(self.cursor.left ?? 0) + self.bbox.left}px`;
                            tooltip.style.top = `${(self.cursor.top ?? 0) + self.bbox.top - 10}px`;
                            tooltip.innerHTML = `<span class="block font-mono text-xs text-ink-muted">${dateLabel(timestamp)}</span><span class="block text-xs font-semibold text-ink">${formatViews(views)} views</span>`;
                        },
                    ],
                },
            },
            chartData(series()),
            host,
        );
        const observer = new ResizeObserver(() =>
            plot.setSize({ width: Math.max(1, host.clientWidth), height: height() }),
        );
        observer.observe(host);
        const unsubscribe = series.subscribe((points) => plot.setData(chartData(points)));

        return () => {
            unsubscribe();
            observer.disconnect();
            plot.destroy();
        };
    });
