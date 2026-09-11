---
name: temis-security
description: >-
  Review and guide Temis security for a legaltech SaaS handling sensitive law
  firm data, including multi-tenant isolation, auth, RBAC, permission checks,
  data privacy, audit logs, secure DTO validation, secrets, file/document
  access, dependency risk, and secure PR acceptance. Use when implementing or
  reviewing security-sensitive backend, frontend, database, document, tenant,
  auth, or integration changes.
---

# Temis Security

Use this skill when security, privacy, authorization, or sensitive legal data is involved.

## Sources of truth

- `docs/architecture/MULTITENANCY.md`
- `docs/architecture/RBAC.md`
- `docs/architecture/AUDIT.md`
- `docs/github/CODERABBIT_GUIDELINES.md`
- Current auth, guard, Prisma, and API implementation.

## Security priorities

- Prevent cross-tenant access.
- Enforce backend authorization for every operational action.
- Validate input explicitly before persistence or external calls.
- Avoid leaking sensitive legal data in logs, errors, screenshots, or test fixtures.
- Treat document storage and downloads as sensitive operations.
- Keep secrets out of code, docs, examples, and PR screenshots.
- Prefer least privilege in roles and permissions.

## Review checklist

- Auth: is the endpoint protected?
- Tenant: is active tenant validated against membership and status?
- RBAC: are role and permission checks tenant-specific?
- Data access: are reads and writes filtered by tenant?
- Relationships: can a tenant link to another tenant's client, case, document, or task?
- Validation: are DTOs strict enough and aligned with frontend Zod?
- Errors: do messages help the user without exposing internals or other tenants?
- Logs: do logs avoid tokens, PII, privileged legal content, and secrets?
- Documents: are upload/download permissions enforced and scoped?
- Dependencies: does a new dependency add risk or require justification?

## Blockers

Block or flag any change that:

- accepts `tenantId` from client body for operational writes;
- relies on frontend-only access control;
- adds operational entities without tenant scoping;
- changes auth, RBAC, or tenant context without tests or explicit validation;
- stores credentials or sensitive legal data in plain logs;
- expands permissions without updating RBAC docs.

## Output format

Return findings by severity, with file references when reviewing code, and include required tests or evidence.
