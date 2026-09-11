# Temis

SaaS B2B para estudios juridicos.

Nombre definitivo del producto: **Temis**. Dominio oficial: **https://temis.ar**.
Los paquetes internos usan `@temis/*`. Ver
[`docs/deployment/TEMIS_REBRAND.md`](docs/deployment/TEMIS_REBRAND.md) para la
compatibilidad con instalaciones existentes y la configuracion del dominio.

## Stack

- Turborepo con npm workspaces.
- Backend: NestJS + TypeScript.
- Frontend: Next.js App Router + Tailwind CSS + shadcn/ui.
- Validacion: Zod.
- API client: Orval desde OpenAPI.
- ORM: Prisma.
- DB principal: PostgreSQL.
- Cache DB: Redis.
- Infra local: Docker Compose + Nginx reverse proxy.

## Estructura

- `apps/api`: monolito modular NestJS.
- `apps/web`: frontend Next.js.
- `packages/database`: Prisma schema, client y migraciones.
- `packages/api-client`: cliente TypeScript generado por Orval.
- `docs/product`: alcance MVP, roadmap, onboarding y decisiones funcionales.
- `docs/database`: fuente de verdad de base de datos y gaps contra Prisma/ERD.
- `docs/architecture`: auditoria, decisiones tecnicas, multitenancy y RBAC.
- `docs/github`: backlog, milestones, labels, project board e issues listas para copiar.
- `docs/diagrams`: PlantUML ERD y notas de diseno.
- `TODO.md`: inventario historico. La fuente de verdad actual esta en `docs/`.

## Fuente de verdad

Antes de implementar modulos grandes, usar estos documentos:

- Producto: `docs/product/ROADMAP.md`
- MVP: `docs/product/MVP_SCOPE.md`
- Onboarding: `docs/product/ONBOARDING_FLOW.md`
- Decisiones: `docs/product/PRODUCT_DECISIONS.md`
- Base de datos: `docs/database/DATABASE_SOURCE_OF_TRUTH.md`
- Gaps: `docs/database/gaps.md`
- Arquitectura: `docs/architecture/DECISIONS.md`
- Multitenancy: `docs/architecture/MULTITENANCY.md`
- RBAC: `docs/architecture/RBAC.md`
- Backlog: `docs/github/ISSUES_BACKLOG.md`

## Primer objetivo tecnico

Construir y endurecer la base multitenant y RBAC:

- `tenants`
- `users`
- `roles`
- `tenant_memberships`

## Setup

```bash
npm install
npm run db:generate
npm run typecheck
```

## Desarrollo local con hot reload

Para iterar rapido, usar Docker solo para infraestructura y correr backend/frontend en
terminales separadas:

```bash
npm run docker:dev:infra
npm run db:migrate:dev:infra
```

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev:web
```

URLs de desarrollo:

- Frontend Next.js: `http://localhost:3000`
- API NestJS: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/api/docs`

En este modo no se usa Nginx. Next proxyea `/api/*` hacia `http://localhost:3001`.
El Postgres de dev infra usa `pgvector/pgvector:pg16`; correr
`db:migrate:dev:infra` aplica las migraciones contra el puerto local configurado
en `.env.local` sin usar el `DATABASE_URL` de produccion.

## Base de datos

Configurar `DATABASE_URL` copiando `.env.example` a `.env`.

```bash
npm run db:generate
npm run db:migrate
```

## OpenAPI y Orval

```bash
npm run api:openapi
npm run api-client:generate
```

La API expone Swagger en:

- `http://localhost:3001/api/docs`
- `http://localhost:3001/api/docs-json`

## Docker

```bash
npm run docker:up
```

Servicios principales:

- Web via Nginx: `http://localhost`
- API via Nginx: `http://localhost/api/health`
- Swagger via Nginx: `http://localhost/api/docs`
