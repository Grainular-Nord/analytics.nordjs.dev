import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// prisma.config.ts runs outside Bun's automatic .env loading, so parse it
// manually — reusing apps/server/.env instead of a second copy of DATABASE_URL
// kept in sync by hand.
const envPath = '../../apps/server/.env';
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
        const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
        if (!match?.[1] || match[2] === undefined) continue;
        process.env[match[1]] ??= match[2].replace(/^"(.*)"$/, '$1');
    }
}

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
