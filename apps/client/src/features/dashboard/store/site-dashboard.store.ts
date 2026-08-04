import { combined, derived, grain } from '@grainular/grains';
import { resource } from '@grainular/resource';
import { query, unwrap } from '../../../core/services/query';

export type TimeseriesPoint = { date: string; views: number };
export type PageStat = { path: string; views: number };
export type ReferrerStat = { referrer: string; views: number };

export type Range = '7d' | '30d' | '90d';
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };
const VALID_RANGES: Range[] = ['7d', '30d', '90d'];

export const parseRange = (value: string | undefined): Range =>
    VALID_RANGES.includes(value as Range) ? (value as Range) : '30d';

// The current site + range are driven entirely by the URL (path param +
// `?range=` query) — set once by the router's load() hook, then every
// resource below re-fetches automatically off these two grains.
type DashboardSelection = { siteId: string | null; range: Range };

// Keep the URL-derived selection in one grain so a navigation updates the
// site and range atomically, producing one resource refresh per endpoint.
const currentSelection = grain<DashboardSelection>({ siteId: null, range: '30d' });
const currentSiteId = derived(currentSelection, (selection) => selection.siteId);
const currentRange = derived(currentSelection, (selection) => selection.range);

const windowFor = (value: Range, end: Date) => {
    const to = end;
    // Dashboard data is daily. Start at UTC midnight and include today, so
    // "30d" produces exactly 30 day labels rather than 31 partial days.
    const from = new Date(to);
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - RANGE_DAYS[value] + 1);
    return { from, to };
};

const currentParams = () => {
    const { from, to } = windowFor(currentSelection().range, new Date());
    return { from: from.toISOString(), to: to.toISOString() };
};

const previousParams = () => {
    const current = windowFor(currentSelection().range, new Date());
    // End the comparison window just before the current one begins, avoiding
    // an overlap at the boundary.
    const previous = windowFor(currentRange(), new Date(current.from.getTime() - 1));
    return { from: previous.from.toISOString(), to: previous.to.toISOString() };
};

// No siteId yet (before the router's load() hook runs once) means an
// empty result, not a request — every resource below guards on it.
const timeseriesResource = resource<TimeseriesPoint[]>(
    async ({ abortSignal }) => {
        const siteId = currentSelection().siteId;
        if (!siteId) return [];
        return query(
            `/stats/${siteId}/timeseries`,
            { params: currentParams(), signal: abortSignal },
            unwrap<TimeseriesPoint[]>,
        );
    },
    [currentSelection],
);

const previousTimeseriesResource = resource<TimeseriesPoint[]>(
    async ({ abortSignal }) => {
        const siteId = currentSelection().siteId;
        if (!siteId) return [];
        return query(
            `/stats/${siteId}/timeseries`,
            { params: previousParams(), signal: abortSignal },
            unwrap<TimeseriesPoint[]>,
        );
    },
    [currentSelection],
);

const pagesResource = resource<PageStat[]>(
    async ({ abortSignal }) => {
        const siteId = currentSelection().siteId;
        if (!siteId) return [];
        return query(`/stats/${siteId}/pages`, { params: currentParams(), signal: abortSignal }, unwrap<PageStat[]>);
    },
    [currentSelection],
);

const referrersResource = resource<ReferrerStat[]>(
    async ({ abortSignal }) => {
        const siteId = currentSelection().siteId;
        if (!siteId) return [];
        return query(
            `/stats/${siteId}/referrers`,
            { params: currentParams(), signal: abortSignal },
            unwrap<ReferrerStat[]>,
        );
    },
    [currentSelection],
);

const load = (siteId: string, rangeParam?: string) => {
    currentSelection.set({ siteId, range: parseRange(rangeParam) });
};

export const siteDashboardStore = {
    state: {
        currentSiteId,
        currentRange,
        timeseries: derived(combined([timeseriesResource.data, timeseriesResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        previousTotal: derived(
            combined([previousTimeseriesResource.data, previousTimeseriesResource.pending]),
            ([data, pending]) => (pending ? 0 : (data ?? []).reduce((total, point) => total + point.views, 0)),
        ),
        pages: derived(combined([pagesResource.data, pagesResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        referrers: derived(combined([referrersResource.data, referrersResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        loading: derived(
            combined([
                timeseriesResource.pending,
                previousTimeseriesResource.pending,
                pagesResource.pending,
                referrersResource.pending,
            ]),
            (states) => states.some(Boolean),
        ),
        error: derived(
            combined([
                timeseriesResource.error,
                previousTimeseriesResource.error,
                pagesResource.error,
                referrersResource.error,
            ]),
            (errors) => errors.find((error) => error != null) ?? null,
        ),
    },
    actions: { load },
};
