---
name: temis-pr-reviewer
description: >-
  Review Temis pull requests for issue alignment, BOG-### closure wording,
  GitHub Project workflow, dependency order, acceptance criteria, legaltech
  product quality, NestJS backend safety, Prisma/PostgreSQL migrations,
  frontend UX states, multi-tenant security, QA evidence, and reviewer-ready
  feedback. Use when preparing, reviewing, or deciding whether to approve a PR.
---

# Temis PR Reviewer

Use this skill in code-review stance for Temis PRs.

## Sources of truth

- Linked issue or BOG-### task.
- `docs/github/GITHUB_PROJECT_SETUP.md`
- `docs/github/CODERABBIT_GUIDELINES.md`
- `docs/product/ROADMAP.md`
- Architecture and database docs when touched by the PR.

## Review order

1. Confirm the PR links an issue with `Closes BOG-###`, `Refs BOG-###`, `Closes #N`, or `Refs #N` as appropriate.
2. Check dependency order and whether blocked issues are respected.
3. Compare implementation to acceptance criteria.
4. Review security, tenant isolation, RBAC, data integrity, and migration safety.
5. Review frontend states, validation, legal-domain copy, and responsive behavior.
6. Review tests and validation evidence.
7. Check docs updates when behavior, architecture, database, or process changed.

## Findings style

Lead with findings, ordered by severity. Use file and line references when available.

Severity guide:

- Critical: cross-tenant access, auth bypass, destructive data loss, secret exposure.
- High: acceptance criterion not met, broken migration, missing backend enforcement, unsafe document access.
- Medium: missing tests for important behavior, incomplete error state, unclear contract, dependency issue.
- Low: maintainability, naming, docs, minor UX polish.

## Approval bar

A PR is not ready if:

- it mixes unrelated modules or phases without clear justification;
- it closes an issue while acceptance criteria remain unvalidated;
- it touches auth, tenant context, RBAC, Prisma, or documents without tests or strong manual evidence;
- it changes `package-lock.json` or dependencies without explanation;
- it leaves frontend flows without loading, error, or empty states where required.

## Output format

Use:

```markdown
## Findings

## Open questions

## Validation reviewed

## Summary
```

If no issues are found, say that clearly and mention residual risk or test gaps.
