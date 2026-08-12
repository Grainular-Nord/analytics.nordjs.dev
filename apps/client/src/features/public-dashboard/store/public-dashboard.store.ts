import { combined, derived } from '@grainular/grains';
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
        sites: derived(combined([dashboardResource.data, dashboardResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        loading: dashboardResource.pending,
        error: dashboardResource.error,
    },
    actions: {
        load: () => {
            if (dashboardResource.data() !== undefined) dashboardResource.refresh();
        },
    },
};
