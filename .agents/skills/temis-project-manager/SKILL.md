---
name: temis-project-manager
description: >-
  Manage Temis as a professional legaltech product using the repo roadmap,
  GitHub Project fields, BOG-### issue flow, dependencies, phases, sprint
  planning, PR-by-issue execution, acceptance criteria, and two-developer
  coordination. Use when planning work, prioritizing backlog, sequencing
  phases, preparing sprint execution, updating delivery process docs, or
  deciding what should be built next without changing application code.
---

# Temis Project Manager

Use this skill to manage Temis delivery as a SaaS-oriented legaltech product.

## Sources of truth

Read only what is needed for the task:

- `docs/product/ROADMAP.md` for milestones M0-M8 and developer split.
- `docs/github/GITHUB_PROJECT_SETUP.md` for Project fields, labels, status flow, and dependency rules.
- `docs/github/ISSUES_BACKLOG.md` and `docs/github/issues/` for planned issues.
- `docs/product/MVP_SCOPE.md` and `docs/product/PRODUCT_DECISIONS.md` for product boundaries.
- `docs/architecture/DECISIONS.md` for accepted technical decisions.

## Operating rules

- Keep work tied to one issue or one epic at a time.
- Preserve BOG-### correlation and dependency order.
- Do not start a dependent issue while its blocker is open, except documentation or contract-only work.
- Prefer small PRs with one behavioral purpose.
- Separate product planning, backend, frontend, database, QA, and docs changes unless a thin vertical slice is explicitly justified.
- Treat multi-tenancy, RBAC, privacy, auditability, and legal-domain language as product requirements, not optional hardening.
- Use RabbitMQ only when asynchronous processing is justified by clear workflow needs, not as default architecture.

## Planning workflow

1. Identify the active phase or milestone.
2. Check dependencies and whether the issue can be `Ready`.
3. Confirm area, labels, priority, size, owner, and evidence expectation.
4. Define acceptance criteria that are observable and testable.
5. Suggest branch naming based on issue scope.
6. Call out risks, blocked-by issues, and documentation updates.

## Output format

For planning responses, include:

- Decision or recommended next issue.
- Dependency check.
- Acceptance criteria.
- Suggested GitHub Project fields.
- Validation evidence expected before closing.

Do not make commits or push branches unless the user explicitly requests it.
