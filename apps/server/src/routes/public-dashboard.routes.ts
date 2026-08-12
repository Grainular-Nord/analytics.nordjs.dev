import { Hono } from 'hono';
import { getPublicDashboard } from '../services/public-dashboard.service';

export const publicDashboardRoutes = new Hono().get('/', async (ctx) => {
    // Aggregate public analytics do not need real-time delivery. This allows
    // browsers and intermediaries to avoid repeatedly waking the API.
    ctx.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=60');
    return ctx.json(await getPublicDashboard());
});
