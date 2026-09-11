---
name: temis-frontend
description: >-
  Implement and review Temis frontend web work for a professional legaltech
  SaaS using Next.js App Router, Tailwind CSS, shadcn/ui, Zod validation,
  legal-domain UX, API contracts, onboarding, clients, cases, documents, tasks,
  finance views, and tenant-aware workflows. Use when building or reviewing UI,
  forms, screens, state, API integration, responsive behavior, and frontend QA.
---

# Temis Frontend

Use this skill for Temis web UI implementation and review.

## Sources of truth

- `apps/web` for current frontend implementation.
- `docs/product/ONBOARDING_FLOW.md`, `docs/product/MVP_SCOPE.md`, and `docs/product/ROADMAP.md`.
- `docs/github/CODERABBIT_GUIDELINES.md` for frontend review criteria.
- Backend DTOs/OpenAPI or agreed contracts for API integration.

## UX principles

- Present Temis as a professional legaltech tool for small law firms scaling into SaaS.
- Use legal-domain language: estudio, cliente, expediente, parte contraria, tarea, vencimiento, caja.
- Favor dense, clear operational screens over marketing-style layouts.
- Every data screen needs loading, error, empty, and success states where relevant.
- Forms need validation before submit, clear errors, disabled/loading states, and no sensitive data stored unnecessarily.
- Preserve tenant context in navigation, API calls, and state assumptions.

## Implementation rules

- Follow existing Next.js App Router, Tailwind, shadcn/ui, and Zod patterns.
- Keep components small enough to review.
- Align frontend validation with backend DTOs.
- Mock only when a dependency is not ready; document the mock and do not mark the issue complete until real integration is done if acceptance requires it.
- Do not rely on frontend-only authorization; backend must enforce access.
- Include screenshots or manual QA notes for visual changes.

## Validation

Use relevant checks:

- `npm run typecheck`
- `npm run lint`
- frontend unit/component/e2e tests if present
- manual responsive check for changed views

For PR evidence, include commands run, screenshots for UI changes, and any known contract assumptions.
