---
name: temis-testing-qa
description: >-
  Plan, implement, and review Temis testing and QA for a legaltech SaaS,
  covering acceptance criteria, tenant isolation, RBAC, backend DTO/service
  tests, frontend validation, onboarding flows, API integration, e2e checks,
  regression risk, and PR evidence. Use when designing test strategy, adding
  tests, validating issues, preparing QA evidence, or deciding whether a PR can
  close a BOG-### issue.
---

# Temis Testing QA

Use this skill to convert acceptance criteria into validation evidence.

## Sources of truth

- Issue acceptance criteria in `docs/github/issues/` or GitHub.
- `docs/github/GITHUB_PROJECT_SETUP.md` for required close-out evidence.
- `docs/architecture/MULTITENANCY.md` and `docs/architecture/RBAC.md`.
- Existing test files in `apps/api`, `apps/web`, and repo scripts.

## QA priorities

1. Tenant isolation and no cross-tenant access.
2. Auth and RBAC behavior.
3. Data integrity for legal-domain workflows.
4. Frontend validation and error states.
5. Regression coverage for acceptance criteria.
6. Clear PR evidence for reviewers.

## Test planning

Map each acceptance criterion to at least one validation method:

- Unit test for pure validation or mapping.
- Service test for business rules and tenant filtering.
- Controller/API test for auth, DTOs, and response contracts.
- Frontend component or form test for validation and states.
- E2E test for onboarding, tenant bootstrap, login, or high-value legal workflows.
- Manual QA evidence for visual states where automation is not available.

## Required cases for tenant features

- Tenant missing.
- Tenant inactive or unauthorized.
- User belongs to tenant A but tries tenant B.
- Same-tenant success path.
- Cross-tenant relationship write attempt.
- Role or permission missing.

## PR evidence format

Include:

- Commands run.
- Tests added or intentionally not added with reason.
- Manual QA notes.
- Screenshots for UI changes.
- Remaining risk and follow-up issue when applicable.

Do not mark a BOG-### issue complete if the acceptance criteria are not validated.
