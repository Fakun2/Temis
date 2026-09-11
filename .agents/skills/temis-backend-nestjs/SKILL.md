---
name: temis-backend-nestjs
description: >-
  Implement and review Temis backend work in NestJS with Prisma/PostgreSQL,
  tenant context, RBAC guards, DTO validation, transactions, migrations,
  OpenAPI-compatible contracts, and legaltech domain modules. Use when changing
  API modules, services, controllers, Prisma models, migrations, auth, tenant
  bootstrap, clients, cases, documents, tasks, finance, or backend tests.
---

# Temis Backend NestJS

Use this skill for backend implementation and backend code review.

## Sources of truth

- `apps/api/src` for current NestJS implementation.
- `packages/database/prisma/schema.prisma` and migrations for executable data model.
- `docs/database/DATABASE_SOURCE_OF_TRUTH.md` for DB authority rules.
- `docs/architecture/MULTITENANCY.md` and `docs/architecture/RBAC.md`.
- `docs/product/ROADMAP.md` for phase boundaries.

## Backend rules

- Keep controllers thin; business logic belongs in services.
- Use DTOs and explicit validation for request bodies, params, and query inputs.
- Require authenticated user and active tenant for operational endpoints.
- Set `tenantId` from tenant context, not from client body.
- Filter all tenant-scoped queries by tenant.
- Validate same-tenant relationships before writes.
- Use transactions for multi-entity operations such as tenant bootstrap, case creation with participants, or document metadata plus storage references.
- Avoid destructive migrations unless the issue explicitly calls for them and docs explain the risk.

## Prisma/PostgreSQL rules

- Add indexes for tenant-scoped lookup fields, status fields, dates, document numbers, names, and foreign keys when relevant.
- Prefer relations and join tables over arrays of IDs.
- Keep global catalogs explicit: users, roles, permissions, role_permissions, currencies.
- Update database docs or gaps when Prisma diverges from target ERD.

## RabbitMQ rule

Do not add RabbitMQ for normal request/response CRUD. Consider it only for notifications, external integrations, retries, long-running jobs, bulk processing, or document workflows where async behavior is a requirement.

## Validation

Run the smallest relevant checks available:

- `npm run typecheck`
- `npm run lint`
- targeted backend tests if present
- migration generation or Prisma validation when schema changes

If a command fails due to known repo setup, capture the exact failure and recommend a follow-up issue instead of hiding it.
