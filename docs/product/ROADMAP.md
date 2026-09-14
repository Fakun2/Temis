# Temis roadmap

Este roadmap organiza el trabajo por milestones incrementales. La regla base es
no mezclar organizacion, cambios de producto y modulos grandes en un mismo PR.

## Estado actual

- Branch de PR 1: `chore/project-organization-and-roadmap`.
- Stack confirmado: Turborepo, npm workspaces, NestJS, Next.js App Router,
  Tailwind CSS, shadcn/ui, Zod, Orval, Prisma, PostgreSQL, Redis, Docker Compose
  y Nginx.
- Base implementada: auth, onboarding inicial, tenancy guard, RBAC base,
  Prisma con tenants/users/roles/permissions/memberships/profile/settings/areas.
- Base pendiente: clientes, partes contrarias, causas, documentos, tareas,
  notificaciones, gastos, cuenta corriente, caja, audit logs, storage provider.

## Milestones

### M0 - Auditoria y organizacion

Objetivo: entender el repo, validar stack, ordenar docs y definir fuente de
verdad.

Entregables:

- Docs de producto, arquitectura, base de datos y GitHub.
- Backlog inicial con issues copiables.
- Milestones y labels preparados.
- Resultado de comandos minimos.
- Riesgos tecnicos documentados.

### M1 - Tenant onboarding

Objetivo: hacer funcional el alta real del estudio juridico.

Entregables:

- Onboarding en 3 pasos conectado a contrato real.
- Store o estado centralizado del flujo.
- Validaciones Zod alineadas con backend.
- Endpoint bootstrap tenant transaccional.
- Dashboard inicial post alta.

### M2 - Auth, RBAC y seguridad

Objetivo: proteger rutas, roles, permisos y separacion por tenant.

Entregables:

- Tenant context por request validado contra membership.
- Guards de roles/permisos aplicados en rutas protegidas.
- Tests de no acceso cross-tenant.
- Matriz de permisos MVP documentada y cubierta.

### M3 - Clientes y expedientes

Objetivo: implementar la operacion legal central.

Entregables:

- CRUD clientes.
- CRUD partes contrarias.
- CRUD areas de practica.
- CRUD causas/expedientes.
- Participantes de causa.
- Filtros por tenant, cliente, area, estado y fechas.

### M4 - Documentos

Objetivo: asociar documentos a clientes y causas con storage provider.

Entregables:

- Categorias de documentos por tenant.
- Metadatos de documentos.
- Abstraccion `StorageProvider`.
- Upload/download basico.
- Preparacion productiva para S3 o Supabase.

### M5 - Tareas, agenda y notificaciones

Objetivo: implementar operacion diaria, vencimientos y seguimiento.

Entregables:

- Tareas con emisores, supervisores y responsables.
- Notificaciones basicas.
- Vista de vencimientos proximos.
- Agenda queda post-MVP salvo vista minima necesaria.

### M6 - Caja, cuenta corriente y reportes

Objetivo: implementar control financiero base.

Entregables:

- Gastos simples.
- Cuenta corriente por cliente.
- Caja del estudio.
- Reportes iniciales.

### M7 - Integraciones

Objetivo: preparar integraciones externas sin acoplar el MVP.

Entregables:

- Google Drive post-MVP.
- Google Calendar post-MVP.
- Facturacion SaaS post-MVP.
- IA post-MVP.

### M8 - QA, deploy y escalabilidad

Objetivo: robustecer lanzamiento y crecimiento.

Entregables:

- Tests unitarios/e2e suficientes.
- CI/CD.
- Deploy documentado.
- Observabilidad.
- Runbooks operativos.

## Trabajo por PR

1. PR 1 - Organizacion y fuente de verdad.
2. PR 2 - Onboarding UI y store.
3. PR 3 - Bootstrap backend tenant.
4. PR 4 - Integracion frontend/backend.
5. PR 5 - RBAC y tenant guards.

## Division para 2 desarrolladores

Dev 1 - Backend / DB / Infra:

- Prisma, migraciones, NestJS modules, auth, RBAC, tenant context, bootstrap,
  storage provider, tests backend, Docker y CI.

Dev 2 - Frontend / UX / Integracion:

- Next.js, UI onboarding, forms, Zod schemas, store, consumo de API, dashboard,
  componentes y tests frontend/e2e.

Contrato de trabajo:

- El frontend no queda bloqueado por falta de API: primero se acuerdan DTOs y
  OpenAPI cuando haga falta.
- El backend no queda bloqueado por falta de UI: primero se implementan DTOs,
  servicios y tests directos.
