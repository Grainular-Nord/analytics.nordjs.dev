import type { AuthEnv } from '@analytics/auth/server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { handleAuth } from '../lib/auth';
import { getSite } from '../services/site.service';
import { getPages, getReferrers, getTimeseries, type StatsRange } from '../services/stats.service';

const MAX_RANGE_DAYS = 366;

const parseRange = (from?: string, to?: string): StatsRange => {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new HTTPException(400, { message: 'Invalid date range' });
    }
    if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
        throw new HTTPException(400, { message: `Range must be at most ${MAX_RANGE_DAYS} days` });
    }

    // Rollups are stored per UTC date. Aligning the lower boundary prevents a
    // partial first day from combining a whole rollup row with a raw-event
    // slice of that same day.
    start.setUTCHours(0, 0, 0, 0);
    return { from: start, to: end };
};

export const statsRoutes = new Hono<AuthEnv>()
    .get('/:siteId/timeseries', ...handleAuth, async (ctx) => {
        const site = await getSite(ctx.req.param('siteId'), ctx.get('session').sub);
        const range = parseRange(ctx.req.query('from'), ctx.req.query('to'));
        return ctx.json(await getTimeseries(site.id, range));
    })
    .get('/:siteId/pages', ...handleAuth, async (ctx) => {
        const site = await getSite(ctx.req.param('siteId'), ctx.get('session').sub);
        const range = parseRange(ctx.req.query('from'), ctx.req.query('to'));
        return ctx.json(await getPages(site.id, range));
    })
    .get('/:siteId/referrers', ...handleAuth, async (ctx) => {
        const site = await getSite(ctx.req.param('siteId'), ctx.get('session').sub);
        const range = parseRange(ctx.req.query('from'), ctx.req.query('to'));
        return ctx.json(await getReferrers(site.id, range, ctx.req.query('path')));
    });
