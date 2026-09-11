# Temis repo-scoped skills

These skills are local to this repository and are intended to help Codex manage Temis as a professional legaltech product.

## Skills

| Skill | Use it when |
| --- | --- |
| `temis-project-manager` | Planning roadmap phases, GitHub Project flow, dependencies, sprint execution, and two-developer coordination. |
| `temis-issue-factory` | Creating, splitting, refining, or validating BOG-### issues with labels, dependencies, acceptance criteria, and evidence. |
| `temis-architecture-guardian` | Reviewing architecture decisions for multi-tenancy, RBAC, data boundaries, RabbitMQ justification, and SaaS scalability. |
| `temis-backend-nestjs` | Implementing or reviewing NestJS, Prisma/PostgreSQL, tenant context, RBAC, migrations, DTOs, and backend tests. |
| `temis-frontend` | Implementing or reviewing Next.js UI, legaltech UX, forms, Zod validation, frontend state, and API integration. |
| `temis-testing-qa` | Planning tests, mapping acceptance criteria to evidence, validating tenant isolation, and preparing QA notes. |
| `temis-security` | Reviewing legaltech security, tenant isolation, auth, RBAC, privacy, document access, secrets, and audit concerns. |
| `temis-pr-reviewer` | Reviewing PRs for issue alignment, dependency order, acceptance criteria, code quality, security, QA evidence, and docs. |

## Invocation examples

```text
$temis-project-manager Decime cual deberia ser el proximo issue listo para M2 y por que.
```

```text
$temis-issue-factory Crea un issue BOG-021 para CRUD de partes contrarias, con dependencias y criterios de aceptacion.
```

```text
$temis-architecture-guardian Revisa si conviene usar RabbitMQ para notificaciones de vencimientos en el MVP.
```

```text
$temis-backend-nestjs Implementa el endpoint de clientes respetando tenant context y RBAC.
```

```text
$temis-frontend Arma la pantalla de listado de expedientes con estados loading, error y empty.
```

```text
$temis-testing-qa Define la matriz de pruebas para BOG-010 tenant context.
```

```text
$temis-security Revisa este cambio de documentos y storage por riesgos de privacidad.
```

```text
$temis-pr-reviewer Revisa el PR actual contra su issue BOG-###.
```

## Maintenance

- Keep descriptions specific; Codex uses `name` and `description` to decide when a skill applies.
- Update skills when the roadmap, GitHub Project fields, labels, architecture decisions, or stack conventions change.
- Prefer updating the relevant existing skill over creating overlapping skills.
- Keep each `SKILL.md` concise and procedural.
- Do not store secrets, customer data, or private legal content in skills.
- When process docs change, check whether the matching skill should change too.

## Detection check

From the repository root, start a new Codex session or reload the current one, then invoke a skill with `$skill-name`. Codex should read the matching `.agents/skills/<skill-name>/SKILL.md` before acting.
