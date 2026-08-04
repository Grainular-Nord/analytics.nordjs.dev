import { combined, derived, grain } from '@grainular/grains';
import { resource } from '@grainular/resource';
import { query, unwrap } from '../../../core/services/query';
import type { Site } from './sites.store';

const currentSiteId = grain<string | null>(null);

const siteResource = resource<Site | null>(
    async ({ abortSignal }) => {
        const siteId = currentSiteId();
        if (!siteId) return null;
        return query(`/sites/${siteId}`, { signal: abortSignal }, unwrap<Site>);
    },
    [currentSiteId],
);

const load = (siteId: string) => currentSiteId.set(siteId);

export const siteSettingsStore = {
    state: {
        site: derived(combined([siteResource.data, siteResource.pending]), ([data, pending]) =>
            pending ? null : data,
        ),
        loading: siteResource.pending,
        error: siteResource.error,
    },
    actions: {
        load,
        // After a successful PATCH the caller already has the fresh record
        // — update in place instead of refetching.
        setLocal: siteResource.mutate,
    },
};
