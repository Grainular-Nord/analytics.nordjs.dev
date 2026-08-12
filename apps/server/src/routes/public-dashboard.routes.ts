import { Hono } from 'hono';
import { listPublicDashboardSites } from '../services/site.service';
import { getReferrers, getTimeseries } from '../services/stats.service';

const DAYS_TO_SHOW = 30;

export const publicDashboardRoutes = new Hono().get('/', async (ctx) => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - DAYS_TO_SHOW + 1);
    from.setUTCHours(0, 0, 0, 0);

    const sites = await listPublicDashboardSites();
    const dashboard = await Promise.all(
        sites.map(async (site) => {
            const [timeseries, referrers] = await Promise.all([
                getTimeseries(site.id, { from, to }),
                getReferrers(site.id, { from, to }),
            ]);
            return { name: site.name, timeseries, referrerCount: referrers.length };
        }),
    );

    return ctx.json(dashboard);
});
