import { prisma } from '@analytics/db';

// Compacts raw events older than the retention window into daily aggregate
// rows, then deletes them. After this runs, the only trace of those views is
// a per-day counter — which is also why events carry nothing identifiable to
// begin with.
export const runRollup = async () => {
    const retentionDays = Number(Bun.env.RETENTION_DAYS ?? 90);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const [pages, referrers, deleted] = await prisma.$transaction([
        prisma.$executeRaw`
            INSERT INTO "DailyPageStat" ("siteId", date, path, views)
            SELECT "siteId", date_trunc('day', timestamp)::date, path, count(*)
            FROM "Event"
            WHERE timestamp < ${cutoff}
            GROUP BY 1, 2, 3
            ON CONFLICT ("siteId", date, path)
            DO UPDATE SET views = "DailyPageStat".views + EXCLUDED.views`,
        prisma.$executeRaw`
            INSERT INTO "DailyReferrerStat" ("siteId", date, path, referrer, views)
            SELECT "siteId", date_trunc('day', timestamp)::date, path, COALESCE(referrer, ''), count(*)
            FROM "Event"
            WHERE timestamp < ${cutoff}
            GROUP BY 1, 2, 3, 4
            ON CONFLICT ("siteId", date, path, referrer)
            DO UPDATE SET views = "DailyReferrerStat".views + EXCLUDED.views`,
        prisma.$executeRaw`DELETE FROM "Event" WHERE timestamp < ${cutoff}`,
    ]);

    if (deleted > 0) {
        console.log(`Rollup: compacted ${deleted} events into ${pages} page / ${referrers} referrer rows`);
    }
};
