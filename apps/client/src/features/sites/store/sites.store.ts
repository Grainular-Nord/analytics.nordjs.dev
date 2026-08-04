import { combined, derived } from '@grainular/grains';
import { as, query, queryResource } from '../../../core/services/query';

// Returned by the authenticated listing (GET /sites), scoped to the session.
export type SiteSummary = { id: string; name: string; domain: string };

// Returned by the authenticated single-site routes (create/update/get by id).
export type Site = SiteSummary & {
    key: string;
    allowedOrigins: string[];
    createdAt: string;
};

// Fixed, non-cycling accent order for the site tab dots — decorative
// identity, not a data-series legend, so a 4th+ site repeats the last hue.
export const SITE_DOTS = ['var(--color-accent)', 'var(--color-teal)', 'var(--color-violet)'];
export const dotFor = (index: number) => SITE_DOTS[index % SITE_DOTS.length];

// Backs the summary page, the per-site dashboard's site switcher, and site
// management. The API scopes the result to the signed-in user.
const sitesResource = queryResource<SiteSummary[]>('/sites');

// -- Authenticated site management --

const createSite = async (input: { name: string; domain: string; allowedOrigins: string[] }) => {
    const response = await query('/sites', { method: 'POST', body: JSON.stringify(input) }, as<Site>);
    if (response.ok) sitesResource.refresh();
    return response;
};

const updateSite = async (siteId: string, input: Partial<Pick<Site, 'name' | 'domain' | 'allowedOrigins'>>) => {
    const response = await query(`/sites/${siteId}`, { method: 'PATCH', body: JSON.stringify(input) }, as<Site>);
    if (response.ok) sitesResource.refresh();
    return response;
};

const deleteSite = async (siteId: string) => {
    const response = await query(`/sites/${siteId}`, { method: 'DELETE' }, as<{ ok: true }>);
    if (response.ok) sitesResource.refresh();
    return response;
};

export const sitesStore = {
    state: {
        // A refresh represents a new view of the collection. Do not render
        // the previous result alongside the loading state.
        sites: derived(combined([sitesResource.data, sitesResource.pending]), ([data, pending]) =>
            pending ? [] : (data ?? []),
        ),
        loading: sitesResource.pending,
        error: sitesResource.error,
    },
    actions: {
        fetchSites: sitesResource.refresh,
        createSite,
        updateSite,
        deleteSite,
    },
};
