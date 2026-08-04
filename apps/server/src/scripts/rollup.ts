import { prisma } from '@analytics/db';
import { runRollup } from '../services/rollup.service';

// One-shot entry point for the rollup cron job — see README for the crontab
// entry. Runs, then exits, instead of the server keeping its own timer.
try {
    await runRollup();
} catch (error) {
    console.error('Rollup failed', error);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
