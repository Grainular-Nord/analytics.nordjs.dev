import { prisma } from '@analytics/db';

export type StatsRange = { from: Date; to: Date };

// All stats merge two sources: raw events (recent, within the retention
// window) and daily rollups (older, compacted). Counts come back from
// Postgres as bigint, hence the Number() conversions.

type DateViewsRow = { date: Date; views: bigint };
type PathViewsRow = { path: string; views: bigint };
type ReferrerViewsRow = { referrer: string; views: bigint };

export const getTimeseries = async (siteId: string, { from, to }: StatsRange) => {
    const [raw, rolled] = await Promise.all([
        prisma.$queryRaw<DateViewsRow[]>`
            SELECT date_trunc('day', timestamp)::date AS date, count(*) AS views
            FROM "Event"
            WHERE "siteId" = ${siteId} AND timestamp >= ${from} AND timestamp <= ${to}
            GROUP BY 1`,
        prisma.$queryRaw<DateViewsRow[]>`
            SELECT date, sum(views) AS views
            FROM "DailyPageStat"
            WHERE "siteId" = ${siteId} AND date >= ${from}::date AND date <= ${to}::date
            GROUP BY 1`,
    ]);

    const byDay = new Map<string, number>();
    for (const row of [...raw, ...rolled]) {
        const day = row.date.toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + Number(row.views));
    }

    // Fill the whole range so charts don't skip empty days
    const series: { date: string; views: number }[] = [];
    for (let cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const day = cursor.toISOString().slice(0, 10);
        series.push({ date: day, views: byDay.get(day) ?? 0 });
    }

    return series;
};

export const getPages = async (siteId: string, { from, to }: StatsRange) => {
    const [raw, rolled] = await Promise.all([
        prisma.$queryRaw<PathViewsRow[]>`
            SELECT path, count(*) AS views
            FROM "Event"
            WHERE "siteId" = ${siteId} AND timestamp >= ${from} AND timestamp <= ${to}
            GROUP BY 1`,
        prisma.$queryRaw<PathViewsRow[]>`
            SELECT path, sum(views) AS views
            FROM "DailyPageStat"
            WHERE "siteId" = ${siteId} AND date >= ${from}::date AND date <= ${to}::date
            GROUP BY 1`,
    ]);

    const byPath = new Map<string, number>();
    for (const row of [...raw, ...rolled]) {
        byPath.set(row.path, (byPath.get(row.path) ?? 0) + Number(row.views));
    }

    return [...byPath.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views);
};

export const getReferrers = async (siteId: string, { from, to }: StatsRange, path?: string) => {
    const [raw, rolled] = await Promise.all([
        path
            ? prisma.$queryRaw<ReferrerViewsRow[]>`
                SELECT COALESCE(referrer, '') AS referrer, count(*) AS views
                FROM "Event"
                WHERE "siteId" = ${siteId} AND timestamp >= ${from} AND timestamp <= ${to} AND path = ${path}
                GROUP BY 1`
            : prisma.$queryRaw<ReferrerViewsRow[]>`
                SELECT COALESCE(referrer, '') AS referrer, count(*) AS views
                FROM "Event"
                WHERE "siteId" = ${siteId} AND timestamp >= ${from} AND timestamp <= ${to}
                GROUP BY 1`,
        path
            ? prisma.$queryRaw<ReferrerViewsRow[]>`
                SELECT referrer, sum(views) AS views
                FROM "DailyReferrerStat"
                WHERE "siteId" = ${siteId} AND date >= ${from}::date AND date <= ${to}::date AND path = ${path}
                GROUP BY 1`
            : prisma.$queryRaw<ReferrerViewsRow[]>`
                SELECT referrer, sum(views) AS views
                FROM "DailyReferrerStat"
                WHERE "siteId" = ${siteId} AND date >= ${from}::date AND date <= ${to}::date
                GROUP BY 1`,
    ]);

    const byReferrer = new Map<string, number>();
    for (const row of [...raw, ...rolled]) {
        const referrer = row.referrer || 'direct';
        byReferrer.set(referrer, (byReferrer.get(referrer) ?? 0) + Number(row.views));
    }

    return [...byReferrer.entries()]
        .map(([referrer, views]) => ({ referrer, views }))
        .sort((a, b) => b.views - a.views);
};
