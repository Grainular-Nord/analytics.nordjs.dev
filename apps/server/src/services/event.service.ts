import { prisma } from '@analytics/db';
import { HTTPException } from 'hono/http-exception';

// Small cache so every beacon hit doesn't query the sites table
const SITE_CACHE_TTL_MS = 1000 * 60;
const siteCache = new Map<string, { site: { id: string; allowedOrigins: string[] } | null; expiresAt: number }>();

const getSiteByKey = async (key: string) => {
    const cached = siteCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.site;

    const site = await prisma.site.findUnique({
        where: { key },
        select: { id: true, allowedOrigins: true },
    });
    siteCache.set(key, { site, expiresAt: Date.now() + SITE_CACHE_TTL_MS });
    return site;
};

export const invalidateSiteCache = () => siteCache.clear();

const toOrigin = (value: string | null | undefined) => {
    if (!value) return null;
    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
};

// The whole GDPR story lives here: we accept only a site key, a path and a
// referrer. Path is stripped of query/hash, referrer is reduced to its
// origin. Nothing about the visitor (IP, UA, cookies) is read or stored.
//
// The beacon key is public by design, so these are best-effort metrics, not
// an authenticated audit trail. Origin validation protects browser use but
// cannot stop a non-browser client from forging a public event.
export const ingestEvent = async (
    origin: string | undefined,
    payload: { key?: unknown; path?: unknown; referrer?: unknown },
) => {
    const { key, path, referrer } = payload;
    if (typeof key !== 'string' || typeof path !== 'string') {
        throw new HTTPException(400, { message: 'Malformed event' });
    }

    const site = await getSiteByKey(key);
    if (!site) {
        throw new HTTPException(404, { message: 'Unknown site' });
    }

    if (!origin || !site.allowedOrigins.includes(origin)) {
        throw new HTTPException(403, { message: 'Origin not allowed for this site' });
    }

    const cleanPath = (path.split(/[?#]/)[0] || '/').slice(0, 512);
    let referrerOrigin = typeof referrer === 'string' ? toOrigin(referrer) : null;
    // Self-referrals (SPA navigation, reloads) are not interesting
    if (referrerOrigin === origin) referrerOrigin = null;

    await prisma.event.create({
        data: { siteId: site.id, path: cleanPath, referrer: referrerOrigin },
    });
};
