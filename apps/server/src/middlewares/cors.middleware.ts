import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

// CORS for the dashboard API — only the SPA origins may call it
export const handleCors = (): MiddlewareHandler => {
    const origins = Bun.env.CLIENT_ORIGINS.split(',').map((origin) => origin.trim());

    return cors({
        origin: origins,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
};

// CORS for the public ingest endpoint — origins are whitelisted per site in
// the DB, so we reflect any origin here and enforce the whitelist in the
// route handler itself. No credentials are ever involved.
export const handleIngestCors = (): MiddlewareHandler => {
    return cors({
        origin: (origin) => origin,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
        credentials: false,
    });
};
