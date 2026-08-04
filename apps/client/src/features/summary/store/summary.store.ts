import { combined, derived } from '@grainular/grains';
import { resource } from '@grainular/resource';
import { as, query } from '../../../core/services/query';
import { sitesStore } from '../../sites/store/sites.store';

export type SiteOverview = { id: string; name: string; domain: string; views: number };

const REFERENCE_WINDOW_DAYS = 30;

// Public — a lightweight 30-day view count per tracked site, fetched in
// parallel (small scale, a handful of sites, so N parallel requests is
// fine). Depends on the site list, so it automatically re-runs whenever
// a site is added/removed/renamed elsewhere.
const overviewResource = resource<SiteOverview[]>(
    async ({ abortSignal }) => {
        const sites = sitesStore.state.sites();
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
    },
    [sitesStore.state.sites],
);

export const summaryStore = {
    state: {
        overviews: derived(combined([overviewResource.data, overviewResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        loading: derived(
            combined([sitesStore.state.loading, overviewResource.pending]),
            ([sitesLoading, overviewsPending]) => sitesLoading || overviewsPending,
        ),
        error: derived(
            combined([sitesStore.state.error, overviewResource.error]),
            ([sitesError, overviewsError]) => sitesError ?? overviewsError,
        ),
    },
    actions: { load: sitesStore.actions.fetchSites },
};
