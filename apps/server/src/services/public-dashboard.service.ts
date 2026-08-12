import { prisma } from '@analytics/db';

type SiteDateViewsRow = { siteId: string; date: Date; views: bigint };
type SiteReferrerRow = { siteId: string; referrer: string };

export type PublicSiteDashboard = {
    name: string;
    timeseries: { date: string; views: number }[];
    referrerCount: number;
};

const DAYS_TO_SHOW = 30;
const CACHE_TTL_MS = 60_000;

let cachedDashboard: { value: PublicSiteDashboard[]; expiresAt: number } | undefined;
let refreshInFlight: Promise<PublicSiteDashboard[]> | undefined;
let cacheVersion = 0;

const publicSites = () =>
    prisma.site.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
    });

const rangeForDashboard = () => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - DAYS_TO_SHOW + 1);
    from.setUTCHours(0, 0, 0, 0);
    return { from, to };
};

const emptyTimeseries = ({ from, to }: { from: Date; to: Date }) => {
    const series: { date: string; views: number }[] = [];
    for (let cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        series.push({ date: cursor.toISOString().slice(0, 10), views: 0 });
    }
    return series;
};

const buildPublicDashboard = async (): Promise<PublicSiteDashboard[]> => {
    const { from, to } = rangeForDashboard();
    const [sites, views, referrers] = await Promise.all([
        publicSites(),
        // Combining raw events and rollups in one query avoids per-site
        // fan-out while retaining the same source merge as private analytics.
        prisma.$queryRaw<SiteDateViewsRow[]>`
            SELECT "Event"."siteId" AS "siteId", date_trunc('day', "Event".timestamp)::date AS date, count(*) AS views
            FROM "Event"
            INNER JOIN "Site" ON "Site".id = "Event"."siteId"
            WHERE "Site"."isPublic" = true AND "Event".timestamp >= ${from} AND "Event".timestamp <= ${to}
            GROUP BY 1, 2
            UNION ALL
            SELECT "DailyPageStat"."siteId" AS "siteId", date, sum(views) AS views
            FROM "DailyPageStat"
            INNER JOIN "Site" ON "Site".id = "DailyPageStat"."siteId"
            WHERE "Site"."isPublic" = true AND date >= ${from}::date AND date <= ${to}::date
            GROUP BY 1, 2`,
        // The public page exposes only the number of distinct sources. UNION
        // de-duplicates a source appearing in both storage tiers.
        prisma.$queryRaw<SiteReferrerRow[]>`
            SELECT "Event"."siteId" AS "siteId", COALESCE(referrer, '') AS referrer
            FROM "Event"
            INNER JOIN "Site" ON "Site".id = "Event"."siteId"
            WHERE "Site"."isPublic" = true AND "Event".timestamp >= ${from} AND "Event".timestamp <= ${to}
            GROUP BY 1, 2
            UNION
            SELECT "DailyReferrerStat"."siteId" AS "siteId", referrer
            FROM "DailyReferrerStat"
            INNER JOIN "Site" ON "Site".id = "DailyReferrerStat"."siteId"
            WHERE "Site"."isPublic" = true AND date >= ${from}::date AND date <= ${to}::date
            GROUP BY 1, 2`,
    ]);

    const viewsBySite = new Map<string, Map<string, number>>();
    for (const row of views) {
        const day = row.date.toISOString().slice(0, 10);
        const siteViews = viewsBySite.get(row.siteId) ?? new Map<string, number>();
        siteViews.set(day, (siteViews.get(day) ?? 0) + Number(row.views));
        viewsBySite.set(row.siteId, siteViews);
    }

    const referrerCounts = new Map<string, number>();
    for (const row of referrers) {
        referrerCounts.set(row.siteId, (referrerCounts.get(row.siteId) ?? 0) + 1);
    }

    return sites.map((site) => ({
        name: site.name,
        timeseries: emptyTimeseries({ from, to }).map((point) => ({
            ...point,
            views: viewsBySite.get(site.id)?.get(point.date) ?? 0,
        })),
        referrerCount: referrerCounts.get(site.id) ?? 0,
    }));
};

export const getPublicDashboard = async () => {
    if (cachedDashboard && cachedDashboard.expiresAt > Date.now()) return cachedDashboard.value;
    if (refreshInFlight) return refreshInFlight;

    const version = cacheVersion;
    refreshInFlight = buildPublicDashboard()
        .then((dashboard) => {
            if (version === cacheVersion) {
                cachedDashboard = { value: dashboard, expiresAt: Date.now() + CACHE_TTL_MS };
            }
            return dashboard;
        })
        .finally(() => {
            refreshInFlight = undefined;
        });
    return refreshInFlight;
};

export const invalidatePublicDashboardCache = () => {
    cacheVersion += 1;
    cachedDashboard = undefined;
};
