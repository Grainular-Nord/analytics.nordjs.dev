import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { isBotUserAgent } from '../lib/bot-filter';
import { ingestEvent } from '../services/event.service';

export const eventRoutes = new Hono().post('/', async (ctx) => {
    // Silent drop, not a rejection — indistinguishable from a normal
    // ingest to anything probing for a detection signal.
    if (isBotUserAgent(ctx.req.header('User-Agent'))) {
        return ctx.body(null, 204);
    }

    // navigator.sendBeacon sends text/plain to stay a CORS "simple request",
    // so the body is parsed manually instead of via ctx.req.json()
    let payload: unknown;
    try {
        payload = JSON.parse(await ctx.req.text());
    } catch {
        throw new HTTPException(400, { message: 'Malformed event' });
    }

    await ingestEvent(ctx.req.header('Origin'), payload as Record<string, unknown>);
    return ctx.body(null, 204);
});
