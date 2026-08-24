# Database gaps

Este archivo lista diferencias detectadas entre ERD, Prisma, backend, frontend
y decisiones de producto. No corregir todas en un mismo PR.

## Gaps criticos para MVP

### CUIT/CUIL requerido vs opcional

- Decision de producto: CUIT/CUIL opcional en MVP y validado si se completa.
- Estado actual: `tenant.taxId` esta requerido en schemas frontend/backend.
- Impacto: el onboarding puede bloquear altas MVP sin CUIT/CUIL.
- Resolver en: PR 2/3.

### Numeracion de causas

- Decision de producto: conceptos MVP `MANUAL` y `AUTO_SIMPLE`.
- Estado actual Prisma/backend/frontend: `manual` y `automatic`.
- Impacto: naming ambiguo para futuras estrategias de numeracion.
- Resolver en: PR de onboarding/DB antes de implementar causas.

### Storage provider

- Decision de producto: storage S3-compatible privado con MinIO productivo
  recomendado y Cloudflare R2 soportado por configuracion.
- Estado actual: existe abstraccion backend para MinIO/R2 y documentos de
  expediente usan acceso proxyado por API.
- Impacto: `DocumentStorageMode` historico sigue limitado a `local` y `s3` en
  settings, pero no gobierna aun la seleccion runtime del provider.
- Resolver en: PR settings/storage por tenant.

### Tenant guard incompleto

- Decision de arquitectura: impedir acceso cruzado por tenant.
- Estado actual: `TenantGuard` toma `x-tenant-id` y lo asigna como
  `activeTenantId`, pero no valida membership ni existencia de tenant.
- Impacto: la seguridad real depende de guards posteriores y payload JWT.
- Resolver en: PR 5.

### Entidades legales MVP faltantes

- ERD objetivo incluye clientes, contrarios, causas, participantes, documentos,
  tareas y notificaciones.
- `clients`: modelo definido en #19 como tenant-aware.
- `clients`: migracion y validacion pendientes en #20.
- La base migrada actual todavia solo cubre onboarding foundation y templates de
  areas de practica.
- `opposing_parties`, `cases`, `current_accounts` y `account_movements` siguen
  fuera de este follow-up.
- Impacto: no existe aun core operativo legal.
- Resolver en: M3/M4/M5, con migraciones separadas para el resto del core legal.

### Campo bancario de cliente

- Decision #19: usar `cbu` para cuenta bancaria del cliente.
- No usar `clu` porque no esta definido en el repo ni en el dominio actual.
- Si aparece un significado legal u operativo para `clu`, debe evaluarse en una
  issue futura con definicion de negocio explicita.

## Gaps de ERD vs Prisma

Implementado en Prisma y presente en ERD:

- `tenants`
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `tenant_memberships`
- `tenant_profiles`
- `tenant_settings`
- `practice_area_templates`
- `practice_areas`
- `tenant_membership_practice_areas`
- `currencies`

Presente en ERD y no implementado en Prisma:

- `opposing_parties`
- `task_responsibles`
- `expense_categories`
- `expenses`
- `current_accounts`
- `account_movement_categories`
- `account_movements`
- `cash_boxes`
- `cash_movement_categories`
- `cash_movements`

Definido en Prisma y pendiente de migracion:

- `clients`

Implementado en Prisma y no conflictivo:

- No se detectan entidades Prisma ajenas al modelo objetivo. `TenantProfile` y
  `TenantSettings` existen en ERD.

## Gaps de backend

- `OnboardingService.start` ya usa transaccion y crea tenant, user, profile,
  settings, areas, roles/permisos y membership.
- No hay audit log general porque no existe entidad `audit_logs`. IA cuenta con
  auditoria especifica minima en `ai_chat_runs`.
- La DB ya tiene fundacion vectorial para corpus legal con `pgvector`,
  documentos legales versionados, unidades normativas y chunks de embedding.
  Todavia faltan el worker de indexacion, carga del corpus inicial, generacion
  real de embeddings y retrieval hibrido desde el chat.
- `AuthService.createAccount` permite crear usuario global sin tenant; debe
  quedar integrado con una continuacion clara hacia onboarding.
- `IdentityController` expone respuestas minimas; falta modelo de usuario/tenant
  mas rico para dashboard.
- No existen modulos completos de `tasks` operativas globales ni `audit-logs`.
  Las notificaciones in-app de tareas, gastos y audiencias existen como outbox
  persistente del modulo operativo.

## Gaps de frontend

- El onboarding actual renderiza 3 pasos en un unico componente.
- Falta store dedicado para persistir y limpiar estado del onboarding.
- El paso 1 no tiene confirmacion de password.
- La marca visible aun aparece como BOGAP en pantallas.
- El flujo de exito muestra resultado en pantalla; la decision pide redireccion
  a dashboard.

## Gaps de comandos/entorno

- `npm install` paso, pero primero tuvo fallos por cache/logs de npm y un
  `ENOTEMPTY` posterior al timeout.
- `npm install` reporta 17 vulnerabilidades (2 moderate, 15 high).
- `npm run db:migrate` falla sin `DATABASE_URL`.
- No se verifico migracion contra PostgreSQL real en PR 1.

## Gaps de documentacion historica

- `TODO.md` queda como inventario historico.
- La fuente de verdad actual se mueve a `docs/product`, `docs/database`,
  `docs/architecture` y `docs/github`.
