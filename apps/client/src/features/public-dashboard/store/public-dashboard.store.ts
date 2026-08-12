import { derived } from '@grainular/grains';
import { resource } from '@grainular/resource';
import { query, unwrap } from '../../../core/services/query';

export type PublicSiteDashboard = {
    name: string;
    timeseries: { date: string; views: number }[];
    referrerCount: number;
};

const dashboardResource = resource<PublicSiteDashboard[]>(({ abortSignal }) =>
    query('/dashboard', { signal: abortSignal }, unwrap<PublicSiteDashboard[]>),
);

export const publicDashboardStore = {
    state: {
        // Preserve the previous result during refreshes. An empty list should
        // mean that the request completed with no public sites, not merely
        // that a route revisit started another request.
        sites: derived(dashboardResource.data, (data) => data ?? []),
        loading: dashboardResource.pending,
        error: dashboardResource.error,
    },
    actions: {
        load: () => {
            if (dashboardResource.data() !== undefined) dashboardResource.refresh();
        },
    },
};
