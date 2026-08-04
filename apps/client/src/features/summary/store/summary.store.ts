import { combined, derived } from '@grainular/grains';
import { resource } from '@grainular/resource';
import { as, query, unwrap } from '../../../core/services/query';
import type { SiteSummary } from '../../sites/store/sites.store';

export type SiteOverview = SiteSummary & { views: number };

const REFERENCE_WINDOW_DAYS = 30;

// The summary owns its data flow. Each route load first reads the current site
// list, then fetches the overview totals for that exact snapshot.
const overviewResource = resource<SiteOverview[]>(async ({ abortSignal }) => {
    const sites = await query('/sites', { signal: abortSignal }, unwrap<SiteSummary[]>);
    const to = new Date();
    const from = new Date(to.getTime() - REFERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const params = { from: from.toISOString(), to: to.toISOString() };

    return Promise.all(
        sites.map(async (site) => {
            const response = await query(
                `/stats/${site.id}/timeseries`,
                { params, signal: abortSignal },
                as<{ views: number }[]>,
            );
            const views = response.ok ? response.data.reduce((total, point) => total + point.views, 0) : 0;
            return { ...site, views };
        }),
    );
});

export const summaryStore = {
    state: {
        overviews: derived(combined([overviewResource.data, overviewResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        loading: overviewResource.pending,
        error: overviewResource.error,
    },
    actions: {
        load: () => {
            // The first fetch starts when this route's module is loaded. Each
            // later visit explicitly refreshes the existing resource.
            if (overviewResource.data() !== undefined) overviewResource.refresh();
        },
    },
};
