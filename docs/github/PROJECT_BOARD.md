# GitHub project board

Tablero sugerido para organizar Temis por milestones y PRs chicos.

## Vistas

### Roadmap

Agrupar por milestone:

- M0 - Auditoria y organizacion
- M1 - Tenant onboarding
- M2 - Auth, RBAC y seguridad
- M3 - Clientes y expedientes
- M4 - Documentos
- M5 - Tareas, agenda y notificaciones
- M6 - Caja, cuenta corriente y reportes
- M7 - Integraciones
- M8 - QA, deploy y escalabilidad

### Kanban

Columnas:

- Backlog
- Ready
- In progress
- Needs review
- Blocked
- Done

### Areas

Agrupar por label `area:*`.

### Prioridad

Agrupar por label `priority:*`.

## Workflow de issue

1. Crear issue con template.
2. Asignar milestone.
3. Agregar labels `type:*`, `area:*`, `priority:*`.
4. Marcar `status:ready` cuando tenga criterios claros.
5. Pasar a `status:in-progress` al abrir branch.
6. Pasar a `status:needs-review` con PR abierto.
7. Cerrar con PR mergeado y evidencia de comandos.

## PRs sugeridos

| PR   | Branch sugerida                          | Alcance                                       |
| ---- | ---------------------------------------- | --------------------------------------------- |
| PR 1 | `chore/project-organization-and-roadmap` | Docs, roadmap, templates, fuente de verdad    |
| PR 2 | `feature/onboarding-ui-store`            | UI onboarding, store, validaciones            |
| PR 3 | `feature/tenant-bootstrap-api`           | DTO, service transaccional, controller, tests |
| PR 4 | `feature/onboarding-api-integration`     | Consumo API, Orval, dashboard redirect        |
| PR 5 | `feature/rbac-tenant-guards`             | Tenant context, guards, cross-tenant tests    |

## Sprint inicial para 2 devs

Dev 1 - Backend / DB / Infra:

- EPIC 02
- Backend bootstrap tenant
- RBAC base
- Tenant context
- Modelos MVP tenant-aware

Dev 2 - Frontend / UX / Integracion:

- Onboarding paso 1
- Onboarding paso 2
- Onboarding paso 3
- Onboarding store
- QA frontend de flujo

## Labels canonicales

Tipos:

- `type:epic`
- `type:feature`
- `type:bug`
- `type:docs`
- `type:chore`
- `type:refactor`
- `type:test`

Areas:

- `area:api`
- `area:web`
- `area:database`
- `area:auth`
- `area:tenant`
- `area:rbac`
- `area:onboarding`
- `area:clients`
- `area:cases`
- `area:documents`
- `area:tasks`
- `area:finance`
- `area:integrations`
- `area:qa`
- `area:infra`

Prioridad:

- `priority:p0`
- `priority:p1`
- `priority:p2`
- `priority:p3`

Estado:

- `status:blocked`
- `status:ready`
- `status:in-progress`
- `status:needs-review`
