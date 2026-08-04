# Analytics

A self-hosted, privacy-friendly analytics dashboard. It stores aggregate page views without cookies, visitor IDs, IP addresses, or user-agent data.

## Application architecture

The client is a small Nørd application organized by feature. Each page is a function returning an `html` template; shared visual pieces live in `packages/ui`, while each feature keeps its store and page together.

- **Grains** hold mutable state; **derived grains** expose computed values such as totals, selected tabs, and display-ready rows. Components interpolate grains directly, so only the affected DOM updates.
- **Resources** turn an async fetcher plus its input grains into abortable, reactive data. Stores expose resource data alongside `loading` and `error` grains; `AsyncBoundary` uses those to render one of the loading, error, or settled page states.
- **Router loaders** translate URL parameters into store state. The dashboard keeps its URL-derived site and time range in one selection grain, ensuring every navigation refreshes data coherently.
- **Directives** contain imperative browser integrations. For example, the analytics chart directive owns uPlot's DOM setup, reactive data subscription, resize handling, and disposal, leaving the page template declarative.

This separation keeps templates focused on layout, stores focused on data flow, and directives focused on DOM lifecycle work.

## Run in production

Docker Compose runs PostgreSQL and an immutable, prebuilt API image. CI deploys the Vite client as static files for your existing Caddy instance.

1. Point the DNS `A`/`AAAA` records for the client and API hostnames to this server and allow inbound ports 80 and 443 to your existing Caddy instance.
2. Create the server-side deployment directories and configuration. The server only needs a CI-managed Compose file, its protected runtime environment file, and persistent Docker data; it does not need a repository checkout or Bun installed.

    ```sh
    export SERVER_PATH="/opt/analytics"
    export DEPLOY_PATH="/var/www/analytics"
    export RUNTIME_ENV_PATH="/etc/analytics/runtime.env"
    sudo mkdir -p "$SERVER_PATH" "$DEPLOY_PATH"
    sudo install -D -m 600 .env.example "$RUNTIME_ENV_PATH"
    sudo chown "$USER" "$RUNTIME_ENV_PATH"
    openssl rand -hex 32
    openssl rand -hex 32
    ```

3. Put one generated value in `POSTGRES_PASSWORD` and the other in `JWT_SECRET` in `RUNTIME_ENV_PATH`. Set `CLIENT_URL`, `CLIENT_ORIGINS`, and `RP_ID` to your hostnames. For example, when using `analytics.nordjs.dev` and `api.analytics.nordjs.dev`:

    ```env
    CLIENT_URL="https://analytics.nordjs.dev"
    CLIENT_ORIGINS="https://analytics.nordjs.dev"
    RP_ID="analytics.nordjs.dev"
    ```

4. Configure Caddy to serve `DEPLOY_PATH` (replace `/var/www/analytics` below if you chose another path) and proxy the API, then reload Caddy:

    ```caddy
    analytics.nordjs.dev {
        root * /var/www/analytics
        try_files {path} /index.html
        file_server
    }

    api.analytics.nordjs.dev {
        reverse_proxy 127.0.0.1:3000
    }
    ```

5. Configure CI as described below, then set its deployment configuration variables to the values chosen above. Merge or push to `main`; the first deployment publishes the API image, writes the rendered Compose file to `SERVER_PATH`, starts the stack with `RUNTIME_ENV_PATH`, and copies the built client to `DEPLOY_PATH`.

6. Open `https://analytics.nordjs.dev`, request a magic link, and retrieve it from the self-hosted server logs:

    ```sh
    docker compose --env-file "$RUNTIME_ENV_PATH" -f "$SERVER_PATH/compose.yml" logs --since 20m server
    ```

PostgreSQL is not exposed on host ports. The API listens on the loopback-only `API_PORT` (default `3000`), so only the host's reverse proxy can reach it. If you change `API_PORT`, use the same port in Caddy's `reverse_proxy` directive. The first server start applies pending Prisma migrations automatically.

## Rollups

Raw events older than `RETENTION_DAYS` are compacted into daily aggregate rows by `bun run rollup`, a one-shot script — not a timer inside the server process. Schedule it with a host crontab entry, for example hourly:

```sh
crontab -e
```

```cron
0 * * * * docker compose --env-file "$RUNTIME_ENV_PATH" -f "$SERVER_PATH/compose.yml" exec -T server bun run rollup >> /var/log/analytics-rollup.log 2>&1
```

`$RUNTIME_ENV_PATH` and `$SERVER_PATH` are shell variables here for readability — use the actual paths chosen above, since cron does not read your shell's exported variables.

## Caddy

The client is plain static output; CI copies it into `DEPLOY_PATH`, and Caddy owns all TLS certificates. The API proxy shown above uses the loopback port published by Docker Compose. Keep `VITE_API_URL` as the public API URL embedded in the client and copied into each inline beacon.

## Add a tracked site

Create a site in **Manage sites**, configure its allowed origin, then use **Copy script**. The copied tag includes the full beacon source inline—there is no CDN dependency or published beacon package.

## CI and deployment

GitHub Actions verifies every pull request and deploys `main` after the checks pass. It builds the static client and an API image tagged with the exact commit SHA. Deployment copies the static artifact and a Compose file rendered with that image tag over SSH, then starts it with the server-only runtime environment file.

Create these GitHub repository variables, the production environment variables, and the SSH secrets:

| Name                     | Type                            | Purpose                                                                                       |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------- |
| `ANALYTICS_API_URL`      | Repository variable             | Public API URL embedded in the static client, for example `https://api.analytics.nordjs.dev`. |
| `ANALYTICS_APP_TITLE`    | Repository variable             | Product name embedded in the static client, for example `nordjs analytics`.                   |
| `DEPLOY_HOST`            | Production environment variable | Server hostname or IP address.                                                                |
| `DEPLOY_USER`            | Production environment variable | Dedicated SSH deployment user.                                                                |
| `DEPLOY_PATH`            | Production environment variable | Static-site directory served by Caddy, for example `/var/www/analytics`.                      |
| `SERVER_PATH`            | Production environment variable | Directory where CI writes `compose.yml`, for example `/opt/analytics`.                        |
| `RUNTIME_ENV_PATH`       | Production environment variable | Server-only configuration file, for example `/etc/analytics/runtime.env`.                     |
| `DEPLOY_SSH_PRIVATE_KEY` | Production environment secret   | Private key authorized for the deployment user.                                               |
| `DEPLOY_SSH_KNOWN_HOSTS` | Production environment secret   | The server's pinned `known_hosts` entry.                                                      |

The deployment user needs write access to `DEPLOY_PATH` and `SERVER_PATH`, plus read access to `RUNTIME_ENV_PATH` and permission to run Docker Compose. CI never reads or replaces the runtime environment file.

The API image is published to GitHub Container Registry as `ghcr.io/<owner>/analytics-server:<commit-sha>`. Make that package public, or authenticate the server to GHCR once with a token that has `read:packages` permission:

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
```

`bun install` installs Lefthook locally. Pre-commit hooks format and lint staged files; commit messages must follow Conventional Commits, for example `feat: add site export` or `fix: reject expired magic links`.

## Backups

The `postgres-data` Docker volume holds all persistent data. Take regular volume snapshots, or create a logical dump:

```sh
docker compose --env-file "$RUNTIME_ENV_PATH" -f "$SERVER_PATH/compose.yml" exec -T postgres pg_dump -U analytics analytics > analytics-$(date +%F).sql
```

Store backups outside the host. Restoring a dump replaces database state, so test the procedure before relying on it.

## Local development

```sh
bun install
bun run db:up
bun run db:migrate
bun run dev:server
bun run dev:client
```

`bun run db:up` starts a throwaway Postgres via `docker-compose.dev.yml` — self-contained dev credentials, no env file required. The local environment files under `apps/server` and `apps/client` contain the matching development defaults (`packages/db`'s Prisma commands reuse `apps/server/.env`, so there's only one `DATABASE_URL` to keep current). This is separate from `docker-compose.yml`, the production stack driven entirely by the server-only runtime environment file selected by `RUNTIME_ENV_PATH` — the root `.env.example` is that production template, not a local dev file.
