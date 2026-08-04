import type { AuthEnv } from '@analytics/auth/server';
import { Hono } from 'hono';
import { handleAuth } from '../lib/auth';
import { createSite, deleteSite, getSite, listSites, updateSite } from '../services/site.service';

export const siteRoutes = new Hono<AuthEnv>()
    .get('/', ...handleAuth, async (ctx) => ctx.json(await listSites(ctx.get('session').sub)))

    .post('/', ...handleAuth, async (ctx) =>
        ctx.json(await createSite(ctx.get('session').sub, await ctx.req.json()), 201),
    )
    .get('/:siteId', ...handleAuth, async (ctx) =>
        ctx.json(await getSite(ctx.req.param('siteId'), ctx.get('session').sub)),
    )
    .patch('/:siteId', ...handleAuth, async (ctx) =>
        ctx.json(await updateSite(ctx.req.param('siteId'), ctx.get('session').sub, await ctx.req.json())),
    )
    .delete('/:siteId', ...handleAuth, async (ctx) => {
        await deleteSite(ctx.req.param('siteId'), ctx.get('session').sub);
        return ctx.json({ ok: true });
    });
