# Temis VPS Production Deploy

This guide prepares a single-VPS production deployment with Docker Compose, Nginx,
PostgreSQL, Redis and MinIO.

## 1. Server Prerequisites

- A Linux VPS with Docker and Docker Compose installed.
- DNS A record pointing your subdomain to the VPS public IP.
- Ports `80` and `443` open in the VPS firewall.
- SSH access with a non-root deploy user.

## 2. Clone And Configure

```bash
git clone <YOUR_REPOSITORY_URL> Temis
cd Temis
cp .env.production.example .env.production
```

Edit `.env.production` and replace every `CHANGE_ME` value.

The production domain in `infra/nginx/nginx.prod.conf` is:

```text
temis.ar
```

Use this domain consistently in every `server_name`, certificate path and public URL.
For an existing installation, follow [the rebrand notes](TEMIS_REBRAND.md) first.

Production values that must be reviewed before the first real login:

- `FRONTEND_PUBLIC_URL`, `API_PUBLIC_URL` and `API_CORS_ALLOWED_ORIGINS` must use
  the final HTTPS domain.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`,
  `RABBITMQ_PASSWORD`, `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`
  must be strong private values.
- For Google login, set `GOOGLE_AUTH_ENABLED=true` and use the same OAuth client
  id in `GOOGLE_AUTH_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. The Google
  OAuth client must allow the final frontend origin, for example
  `https://temis.ar`.
- For Google Calendar, set `GOOGLE_CALENDAR_ENABLED=true`, configure a separate
  Google OAuth Web client, and register `GOOGLE_CALENDAR_REDIRECT_URI` ending in
  `/api/integrations/google-calendar/callback`. Keep
  `GOOGLE_CALENDAR_CLIENT_SECRET` and
  `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` private and identical in API and worker.
  The `worker` service in Compose is the only process that consumes Google
  Calendar queues and must be redeployed after changing its image or secrets.
- For real AI responses, set `AI_PROVIDER=openai-compatible`,
  `AI_OPENAI_API_KEY` or `OPENAI_API_KEY`, and the selected model variables.
- For SAE Tucuman imports, set `SAE_TUCUMAN_LOGIN_URL`,
  `SAE_TUCUMAN_PROCEEDINGS_URL`, `SAE_TUCUMAN_ORIGIN` and optionally
  `SAE_TUCUMAN_USER_AGENT`.

## 3. Issue TLS Certificates

Before starting Nginx, generate the first Let's Encrypt certificate with Certbot:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  --profile certbot \
  run --rm --service-ports certbot \
  certonly --standalone \
  -d temis.ar \
  --email admin@temis.ar \
  --agree-tos \
  --no-eff-email
```

Replace the email with a monitored address before running. The certificate must cover `temis.ar`.

## 4. Build And Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Check status:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
```

## 5. Database Migrations And Base Seeds

Run migrations after the images are built and Postgres is healthy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api \
  npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

Seed required catalogs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api \
  node packages/database/prisma/seed-rbac.cjs

docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api \
  node packages/database/prisma/seed-practice-area-templates.cjs

docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api \
  node packages/database/prisma/seed-legal-catalogs.cjs
```

Create the Moreira tenant when needed:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api \
  node packages/database/prisma/seed-moreira-tenant.cjs
```

Do not run demo or volume seeds in production.

## 6. Certificate Renewal

Renew certificates periodically:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile certbot run --rm certbot renew
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload
```

Add the renewal command to cron/systemd once the first deploy is verified.

## 7. Backups

At minimum, back up:

- `postgres_data`
- `minio_data`
- `.env.production`
- the `letsencrypt` volume

PostgreSQL dump example:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > temis-$(date +%F).sql
```

Always test restore before trusting backups.

## 8. Production Notes

- Only Nginx publishes host ports.
- PostgreSQL, Redis and MinIO are internal Docker services.
- PostgreSQL uses the `pgvector/pgvector:pg16` image because AI legal corpus
  migrations require the `vector` extension.
- Auth cookies require HTTPS because `AUTH_COOKIE_SECURE=true`.
- The `/api` path intentionally goes through Next.js first, because Next owns
  httpOnly auth cookies, token refresh and tenant header forwarding.
- Keep `.env.production` out of Git. Commit only `.env.production.example`.
