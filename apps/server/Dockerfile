FROM oven/bun:1.3.14-slim AS base
WORKDIR /app

# Build context is the repo root — copy workspace manifests first for layer
# caching. Every workspace member's package.json must be present (even ones
# the server doesn't depend on) or bun install's lockfile check fails, since
# it validates against the full workspace graph.
COPY package.json bun.lock* tsconfig.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/beacon/package.json ./packages/beacon/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json
# Only runtime packages are installed. Prisma is intentionally a production
# dependency of @analytics/db because migrations run when this container starts.
# Skip repository lifecycle scripts: Lefthook is for local Git checkouts only.
RUN bun install --production --frozen-lockfile --ignore-scripts

COPY packages/db ./packages/db
COPY packages/auth ./packages/auth
COPY apps/server ./apps/server

# Generation does not connect to Postgres, but the Prisma config requires a
# URL. The real value is supplied by Docker Compose at runtime.
RUN cd packages/db && DATABASE_URL="postgresql://analytics:placeholder@postgres:5432/analytics" bunx prisma generate

ENV NODE_ENV=production
WORKDIR /app/apps/server
EXPOSE 3000

# Apply pending migrations, then start
CMD ["sh", "-c", "cd /app/packages/db && bunx prisma migrate deploy && cd /app/apps/server && bun run src/index.ts"]
