---
name: temis-architecture-guardian
description: >-
  Guard Temis architecture decisions for a multi-tenant legaltech SaaS using
  NestJS, Prisma, PostgreSQL, Next.js frontend contracts, RBAC, tenant context,
  auditability, and roadmap constraints. Use when reviewing or designing
  architecture, data boundaries, module boundaries, integration strategy,
  RabbitMQ justification, scalability decisions, or changes that may affect
  long-term SaaS maintainability.
---

# Temis Architecture Guardian

Use this skill to evaluate architecture before implementation or during review.

## Sources of truth

- `docs/architecture/DECISIONS.md`
- `docs/architecture/MULTITENANCY.md`
- `docs/architecture/RBAC.md`
- `docs/architecture/AUDIT.md`
- `docs/database/DATABASE_SOURCE_OF_TRUTH.md`
- `docs/product/ROADMAP.md`

## Non-negotiables

- Temis is multi-tenant from day zero.
- Operational entities must be tenant-scoped directly or through mandatory tenant-scoped relationships.
- Backend must derive tenant context from authenticated request context, not from arbitrary client body input.
- Cross-tenant reads and writes must be impossible by default.
- RBAC is tenant-specific through memberships.
- Prisma schema changes require migrations and source-of-truth documentation updates.
- Legal-domain privacy and auditability are core architecture concerns.

## Architecture review checklist

- Tenant boundary: where is `tenantId` established, validated, propagated, and filtered?
- Authorization: which role or permission is required, and is it tenant-specific?
- Data model: are relationships normalized, indexed, and migration-safe?
- Transactions: can partial writes leave an inconsistent legal workspace?
- API contract: are DTOs explicit and compatible with frontend validation?
- Error handling: are failures clear without leaking sensitive data?
- Scale path: does the design work for larger firms without overbuilding MVP?
- Async: is RabbitMQ justified by retry, fan-out, long-running processing, or integration decoupling?
- Audit: should this action be logged for legal accountability?

## Guidance

- Prefer simple synchronous flows for MVP CRUD, onboarding, RBAC, clients, cases, documents, and tasks.
- Introduce queues only for justified integrations, notifications, bulk processing, long-running document work, or external provider retries.
- Keep modules aligned with legal domains: tenants, auth, RBAC, clients, cases, documents, tasks, finance, integrations.
- Do not approve architecture that relies on frontend-only access control.

## Output format

Return:

- Verdict: acceptable, acceptable with changes, or blocked.
- Key risks.
- Required changes.
- Tests or evidence needed.
- Documentation files that should be updated.
