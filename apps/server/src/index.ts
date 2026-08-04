import { Hono } from 'hono';
import { authRoutes } from './lib/auth';
import { handleCors, handleIngestCors } from './middlewares/cors.middleware';
import { exceptionFilter } from './middlewares/exception-filter.middleware';
import { eventRoutes } from './routes/event.routes';
import { siteRoutes } from './routes/site.routes';
import { statsRoutes } from './routes/stats.routes';

const app = new Hono()
    .onError(exceptionFilter)

    // Public, per-site origin whitelist enforced in the service. The beacon
    // is copied inline from the dashboard, so this API serves data only.
    .use('/event/*', handleIngestCors())
    .use('/event', handleIngestCors())
    .route('/event', eventRoutes)

    // Dashboard API, restricted to the SPA origins
    .use('*', handleCors())
    .route('/auth', authRoutes)
    .route('/sites', siteRoutes)
    .route('/stats', statsRoutes)

    .get('/health', (ctx) => ctx.json({ ok: true }));

const port = Number(Bun.env.PORT ?? 3000);
console.log(`analytics server listening on :${port}`);

export default {
    port,
    fetch: app.fetch,
};
