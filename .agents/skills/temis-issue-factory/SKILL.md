---
name: temis-issue-factory
description: >-
  Create, refine, split, and validate Temis GitHub issues using BOG-###
  correlation, GitHub Project fields, dependencies, roadmap phases, labels,
  acceptance criteria, branch names, evidence requirements, and PR closure
  wording. Use when drafting new issues, converting backlog docs into GitHub
  issues, splitting epics into implementation tasks, or checking whether an
  issue is ready for two-developer execution.
---

# Temis Issue Factory

Use this skill to produce implementation-ready Temis issues.

## Sources of truth

- `docs/github/GITHUB_PROJECT_SETUP.md`
- `docs/github/ISSUES_BACKLOG.md`
- `docs/github/issues/`
- `docs/product/ROADMAP.md`
- `docs/database/DATABASE_SOURCE_OF_TRUTH.md` when the issue touches Prisma or data model.
- `docs/architecture/MULTITENANCY.md` and `docs/architecture/RBAC.md` when the issue touches tenant access or permissions.

## Issue template

Use this structure unless the user provides another template:

```markdown
## Context

## Goal

## Scope

## Out of scope

## Dependencies

## Acceptance criteria

## Technical notes

## Validation evidence

## Suggested branch
```

## Required metadata

Every issue should have:

- BOG-### identifier or an explicit note if the real GitHub issue number is not known yet.
- Milestone or roadmap phase.
- Labels for type, area, priority, and optional status.
- `Blocked by` values when dependencies exist.
- Clear acceptance criteria, not vague intent.
- Evidence required to close: commands, screenshots, tests, demo, migration output, or PR link.
- Suggested branch name, for example `feature/bog-018-client-list`.

## Quality bar

- One issue should be independently reviewable.
- Avoid mixing backend, frontend, database, and QA unless the task is intentionally a vertical slice.
- Include tenant and RBAC implications for all operational legal-domain entities.
- For frontend tasks, include loading, error, empty state, validation, and legaltech copy requirements.
- For backend tasks, include DTOs, authorization, tenant filtering, transaction behavior, and tests.
- For database tasks, include Prisma migration, indexes, tenant relationship, and source-of-truth docs.
- Do not add RabbitMQ unless the issue has a real async processing need.

## Readiness check

Before marking an issue as ready, verify:

- Dependencies are closed or the task can proceed with an explicit mock/contract limitation.
- Acceptance criteria can be tested.
- The task fits the current phase or is explicitly justified.
- Scope is small enough for a PR review by a two-developer team.
