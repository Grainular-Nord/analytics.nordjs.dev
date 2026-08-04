FROM oven/bun:1 AS base
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
# Prisma is needed both to generate the client at build time and to apply
# migrations at container startup, so it must be present in the runtime image.
RUN bun install --frozen-lockfile

COPY packages/db ./packages/db
COPY packages/auth ./packages/auth
COPY packages/ui ./packages/ui
COPY apps/server ./apps/server

RUN cd packages/db && bunx prisma generate

ENV NODE_ENV=production
WORKDIR /app/apps/server
EXPOSE 3000

# Apply pending migrations, then start
CMD ["sh", "-c", "cd /app/packages/db && bunx prisma migrate deploy && cd /app/apps/server && bun run src/index.ts"]
