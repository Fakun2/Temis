# Temis DB Optimization Plan

Este documento deja preparado el plan por fases para optimizar queries,
indices, aislamiento multi-tenant, RLS y RBAC a nivel base de datos.

Fecha de baseline: 2026-08-03.

## Baseline Actual

- `ANALYZE` fue ejecutado correctamente en la DB local.
- La DB local tiene poco volumen, por lo que los planes con `Seq Scan` no son
  concluyentes para eliminar indices.
- No se detectaron indices duplicados exactos.
- No hay RLS activo en tablas de la aplicacion:
  - `rls_enabled = false`
  - `policy_count = 0`
- La separacion por tenant hoy depende principalmente de NestJS/Prisma usando
  `tenantId` en queries y guards de RBAC.

## Objetivos

- Mejorar performance de listados, calendario, busquedas y writes frecuentes.
- Reducir trabajo en memoria en endpoints que pueden crecer.
- Agregar defensa de tenant isolation a nivel PostgreSQL con RLS.
- Mantener RBAC en NestJS y preparar una segunda capa opcional en DB.
- Integrar cada mejora por fases testeables y reversibles.

## Fase 0: Baseline Y Observabilidad

Objetivo: medir antes de tocar comportamiento.

Tareas:

- Crear script seguro `db:analyze` para ejecutar `ANALYZE`.
- Crear script `db:inspect` para reportar:
  - tamanos de tablas
  - indices
  - uso de indices
  - estado de RLS
  - policies existentes
- Documentar queries criticas actuales:
  - listado de expedientes
  - detalle de expediente
  - calendario
  - gastos
  - tareas
  - audiencias
  - staff
  - roles/RBAC
- Guardar `EXPLAIN ANALYZE` base para esas queries.
- Evaluar slow query logging en local/staging.

Validacion:

- `npm run typecheck`
- `npx prisma validate --schema packages/database/prisma/schema.prisma`
- `db:analyze` ejecuta sin exponer secretos.
- `db:inspect` no imprime `DATABASE_URL`.

## Fase 1: Indices Seguros

Objetivo: mejorar queries frecuentes sin cambiar comportamiento funcional.

Indices recomendados:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS cases_tenant_created_id_idx
  ON cases (tenant_id, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS cases_tenant_status_created_id_idx
  ON cases (tenant_id, status, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS case_expenses_tenant_case_created_id_idx
  ON case_expenses (tenant_id, case_id, created_at DESC, id ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS case_expenses_tenant_case_status_payment_id_idx
  ON case_expenses (tenant_id, case_id, status, payment_date, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS case_hearings_tenant_case_date_time_id_idx
  ON case_hearings (tenant_id, case_id, date, time, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS case_tasks_tenant_case_status_end_id_idx
  ON case_tasks (tenant_id, case_id, status, end_date, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS case_tasks_tenant_case_status_start_id_idx
  ON case_tasks (tenant_id, case_id, status, start_date, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS case_expenses_pending_due_idx
  ON case_expenses (tenant_id, case_id, payment_date)
  WHERE status = 'pending';
```

Notas:

- En migraciones Prisma normales no usar `CONCURRENTLY` dentro de una
  transaccion. Si se requiere `CONCURRENTLY`, ejecutar fuera de transaction o
  usar una migracion manual controlada.
- No eliminar indices actuales hasta tener volumen real y evidencia de uso.

Validacion:

- `prisma migrate deploy` local.
- `ANALYZE`.
- `EXPLAIN ANALYZE` antes/despues.
- QA manual en:
  - `/admin/cases`
  - `/admin/cases/[id]`
  - calendario
  - gastos
  - tareas
  - audiencias

## Fase 2: Busqueda Con Trigram

Objetivo: evitar que `contains` case-insensitive escale con scans caros.

Estado: implementada el 2026-08-03 en la migracion
`20260803133000_search_trigram_indexes`.

Tareas:

- Habilitar extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

- Agregar indices GIN trigram para:
  - `cases.caption`
  - `cases.case_number`
  - `cases.subject`
  - `users.full_name`
  - `case_expenses.concept`
  - `case_tasks.name`
  - `case_hearings.description`
  - `cases.court`
  - `cases.judicial_center_text`
  - `forum_templates.name`
  - `judicial_centers.name`

Los ultimos cuatro indices se agregaron porque el codigo actual tambien usa
busquedas `contains` case-insensitive sobre esos campos.

Ejemplo:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS cases_caption_trgm_idx
  ON cases USING gin (caption gin_trgm_ops);
```

Validacion:

- Busqueda por caratula.
- Busqueda por numero de expediente.
- Staff por nombre.
- Calendario con busqueda.
- Gastos/tareas/audiencias con busqueda.
- `EXPLAIN ANALYZE` confirma uso de GIN en tablas con volumen suficiente.

## Fase 3: Calendario Escalable

Objetivo: dejar de paginar eventos en memoria.

Estado: implementada el 2026-08-03 en
`apps/api/src/cases/use-cases/case-expenses.use-case.ts`.

Problema actual:

- El calendario consulta gastos, tareas y audiencias.
- Luego mergea, ordena y pagina en memoria.
- Para expedientes grandes, el modo `list` puede crecer mal.

Tareas:

- Mantener filtrado de permisos por tipo antes de consultar.
- Implementar modo `list` con SQL `UNION ALL`.
- Unificar columnas:
  - `event_type`
  - `id`
  - `title`
  - `date`
  - `status`
  - `amount`
  - `hearing_type`
  - `time`
- Aplicar `ORDER BY date ASC, id ASC LIMIT n + 1` en DB.
- Mantener cursor por `date + id`.
- Evaluar si el modo mensual debe seguir devolviendo todos los eventos del mes
  o si necesita limites por tipo.

Implementacion:

- `mode=month` mantiene el comportamiento anterior y devuelve todos los eventos
  del mes para pintar el grid.
- `mode=list` ahora ejecuta una sola query SQL con `UNION ALL` sobre:
  - `case_expenses`
  - `case_tasks`
  - `case_hearings`
- La query solo incluye branches habilitados por RBAC y por el filtro `types`.
- La paginacion por cursor se aplica dentro de Postgres usando `(date, id)`.
- La busqueda `search` se aplica en SQL con `ILIKE` escapando comodines para
  preservar semantica de contains.

Validacion:

- Calendario solo gastos.
- Calendario solo tareas.
- Calendario solo audiencias.
- Calendario combinado.
- Calendario con busqueda.
- Paginacion por cursor.
- RBAC por tipo de evento:
  - sin `expenses:read`, no aparecen gastos.
  - sin `tasks:read`, no aparecen tareas.
  - sin `hearings:read`, no aparecen audiencias.

Validado:

- `npm --workspace @temis/api run typecheck`
- `node --test -r ts-node/register -r tsconfig-paths/register test/case-calendar-list.use-case.spec.ts`
- `node --test -r ts-node/register -r tsconfig-paths/register test/cases-hearings.e2e-spec.ts`

## Fase 4: Recalculo De Gastos Vencidos

Objetivo: sacar writes de endpoints de lectura.

Estado: implementada el 2026-08-03.

Problema actual:

- `markOverdueExpenses` se ejecuta en reads como listados, detalle, summary y
  calendario.

Opciones:

- MVP simple: endpoint/job interno manual.
- Recomendado: job diario.
- Alternativa: calcular `overdue` virtualmente en reads y persistir solo cuando
  sea necesario.

Propuesta:

- Crear `ExpenseOverdueUseCase`.
- Ejecutar job diario o endpoint interno:

```sql
UPDATE case_expenses
SET status = 'overdue'
WHERE status = 'pending'
  AND (
    payment_date < current_date
    OR expense_date > payment_date
  );
```

- Usar indice parcial `case_expenses_pending_due_idx`.
- Remover writes automaticos de endpoints read.

Implementacion:

- Se removio el recalculo automatico de vencidos desde:
  - listado de gastos
  - detalle de gasto
  - resumen de gastos
  - calendario
- Se agrego `ExpenseOverdueUseCase` como punto unico de recalculo.
- Se expuso `POST /cases/:caseId/expenses/recalculate-overdue` protegido por:
  - `cases:read`
  - `expenses:update`
- El use case soporta recalculo por expediente y por tenants activos.
- Se agrego `ExpenseOverdueScheduler`, que ejecuta un recalculo diario a las
  `00:10` de `America/Argentina/Buenos_Aires`.
- El recalculo diario usa `pg_try_advisory_xact_lock` para evitar ejecuciones
  duplicadas cuando haya mas de una instancia del API.
- El scheduler se puede desactivar con
  `EXPENSE_OVERDUE_SCHEDULER_ENABLED=false`.
- Se agrego la migracion
  `20260803143000_case_expenses_overdue_recalculation_index` con el indice
  parcial `case_expenses_pending_due_idx`.

Validacion:

- Gasto pendiente vencido pasa a `overdue`.
- Gasto pagado no cambia.
- Gasto cancelado no cambia.
- Endpoints read no ejecutan updates.
- Tests de borde:
  - payment date hoy.
  - expense date posterior a payment date.
  - multiples tenants.

Validado:

- `npm --workspace @temis/api run typecheck`
- `node --test -r ts-node/register -r tsconfig-paths/register test/expense-overdue.use-case.spec.ts`
- `node --test -r ts-node/register -r tsconfig-paths/register test/case-calendar-list.use-case.spec.ts`
- `node --test -r ts-node/register -r tsconfig-paths/register test/cases-hearings.e2e-spec.ts`
- `npx prisma validate --schema packages/database/prisma/schema.prisma`
- `node scripts/with-root-env.cjs npx prisma migrate deploy --schema packages/database/prisma/schema.prisma`
- `npm run db:analyze`

## Fase 5: RLS Tenant-Scoped

Objetivo: agregar defensa real en PostgreSQL contra fugas cross-tenant.

Estado: foundation implementada el 2026-08-03 en la migracion
`20260803153000_rls_tenant_scoped_foundation`.

Nota de seguridad operativa:

- En esta fase se activan RLS y policies, pero no se usa
  `FORCE ROW LEVEL SECURITY`.
- El enforcement forzado se mueve a Fase 6, junto con `runWithTenant`, porque
  Prisma todavia no setea `app.tenant_id` por transaccion.
- Forzar RLS antes de Fase 6 podria romper requests normales, seeds y el
  scheduler diario de gastos vencidos.
- El scheduler diario ahora llama a la funcion controlada
  `recalculate_overdue_expenses_for_active_tenants(today_date)` en vez de
  ejecutar el `UPDATE` cross-tenant inline.

Funcion base:

```sql
CREATE OR REPLACE FUNCTION tenant_scoped(row_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT row_tenant_id::text = current_setting('app.tenant_id', true)
$$;
```

Tablas operativas directas para activar RLS:

- `clients`
- `cases`
- `case_tasks`
- `case_expenses`
- `case_hearings`
- `case_expense_attachments`
- `practice_areas`
- `tenant_memberships`
- `tenant_profiles`
- `tenant_settings`

Policy base:

```sql
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_tenant_isolation
  ON cases
  USING (tenant_scoped(tenant_id))
  WITH CHECK (tenant_scoped(tenant_id));
```

Roles:

```sql
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation
  ON roles
  USING (tenant_id IS NULL OR tenant_scoped(tenant_id))
  WITH CHECK (tenant_id IS NULL OR tenant_scoped(tenant_id));
```

`case_participants`:

- Actualmente no tiene `tenant_id`.
- Fase inicial: policy por relacion con `cases`.
- La policy tambien valida `client_id`, cuando existe, contra el mismo tenant.

```sql
CREATE POLICY case_participants_tenant_isolation
  ON case_participants
  USING (
    EXISTS (
      SELECT 1
      FROM cases
      WHERE cases.id = case_participants.case_id
        AND tenant_scoped(cases.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cases
      WHERE cases.id = case_participants.case_id
        AND tenant_scoped(cases.tenant_id)
    )
  );
```

Validacion:

- Query sin `app.tenant_id` no devuelve datos operativos.
- Tenant A no ve datos de tenant B.
- Inserts con `tenant_id` incorrecto fallan.
- Updates cross-tenant fallan.
- Deletes cross-tenant fallan.
- Seeds/migrations siguen funcionando con rol adecuado o contexto explicito.

Implementado:

- Funcion `tenant_scoped(row_tenant_id uuid)`.
- Funcion `recalculate_overdue_expenses_for_active_tenants(today_date date)`.
- RLS enabled y policies tenant-scoped para:
  - `clients`
  - `cases`
  - `case_tasks`
  - `case_expenses`
  - `case_hearings`
  - `case_expense_attachments`
  - `practice_areas`
  - `tenant_memberships`
  - `tenant_profiles`
  - `tenant_settings`
  - `roles`
  - `role_permissions`
  - `case_participants`
  - `tenant_membership_practice_areas`

Validado:

- `npm --workspace @temis/api run typecheck`
- `node --test -r ts-node/register -r tsconfig-paths/register test/expense-overdue.use-case.spec.ts`
- `npx prisma validate --schema packages/database/prisma/schema.prisma`
- `node scripts/with-root-env.cjs npx prisma migrate deploy --schema packages/database/prisma/schema.prisma`
- `npm run db:inspect -- --no-explain`
- `npm run db:analyze`

## Fase 6: Tenant Context En Prisma

Objetivo: que RLS funcione correctamente en runtime.

Estado: implementacion incremental iniciada el 2026-08-03.

Nota operativa:

- `runWithTenant(tenantId, callback)` ya existe en `PrismaService`.
- El helper abre una transaccion interactiva y setea `app.tenant_id` con
  `set_config(..., true)`, por lo que el valor queda limitado a esa
  transaccion.
- Se migro el flujo de audiencias del expediente a `runWithTenant`:
  - listar audiencias
  - crear audiencia
  - actualizar audiencia
  - eliminar audiencia
  - calendario de audiencias
- Se migro el recalculo manual tenant-scoped de gastos vencidos a
  `runWithTenant`.
- El scheduler diario cross-tenant sigue usando la funcion DB controlada
  `recalculate_overdue_expenses_for_active_tenants(today_date)` con advisory
  lock.
- Todavia no se activa `FORCE ROW LEVEL SECURITY`, porque faltan servicios
  operativos con Prisma directo.

Tareas:

- Crear helper `runWithTenant(tenantId, callback)`. Implementado.
- Dentro de una transaccion, setear:

```sql
SELECT set_config('app.tenant_id', $1, true);
```

- Ejecutar queries operativas dentro de esa transaccion.
- Migrar servicios operativos por modulo:
  - cases: iniciado con audiencias y recalculo manual de vencidos.
  - clients: pendiente.
  - staff: pendiente.
  - rbac: pendiente.
  - onboarding/status: pendiente.
- Evitar queries tenant-scoped fuera del helper.
- Activar `FORCE ROW LEVEL SECURITY` solo despues de migrar los servicios
  operativos a `runWithTenant`.
- Mantener jobs cross-tenant, como recalculo diario de gastos vencidos, en
  funciones DB controladas o en un contexto de mantenimiento explicito.

Validacion:

- Request normal funciona.
- Request sin tenant context falla o no devuelve datos.
- Tenant A no ve tenant B aunque falte un `where tenantId`.
- Tests unit/e2e para cross-tenant.

Validado:

- `npm --workspace @temis/api run typecheck`
- `node --test -r ts-node/register -r tsconfig-paths/register test/expense-overdue.use-case.spec.ts`
- `node --test -r ts-node/register -r tsconfig-paths/register test/cases-hearings.e2e-spec.ts`

## Fase 7: RBAC En DB Para Operaciones Sensibles

Objetivo: reforzar permisos criticos sin reemplazar los guards de Nest.

Mantener:

- RBAC en NestJS como primera capa.
- `PermissionsGuard` y `RolesGuard` como contrato principal de API.

Agregar opcionalmente:

```sql
CREATE OR REPLACE FUNCTION has_permission(permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT permission_code = ANY(
    string_to_array(current_setting('app.permissions', true), ',')
  )
$$;
```

Setear en runtime:

```sql
SELECT set_config('app.permissions', 'cases:read,expenses:read', true);
```

Prioridad para policies RBAC en DB:

1. Documentos/comprobantes.
2. Casos.
3. Gastos.
4. Tareas.
5. Audiencias.
6. Staff/Roles.

Validacion:

- Sin permiso read no hay SELECT.
- Sin permiso create no hay INSERT.
- Sin permiso update no hay UPDATE.
- Sin permiso delete no hay DELETE.
- Backend sigue devolviendo errores claros sin filtrar datos sensibles.

## Fase 8: Normalizacion Final Para RLS

Objetivo: simplificar policies y performance futura.

Tareas:

- Agregar `tenant_id` directo a `case_participants`.
- Evaluar `tenant_id` en tablas puente donde simplifique policies.
- Revisar indices redundantes con datos reales.
- Actualizar docs:
  - `docs/database/DATABASE_SOURCE_OF_TRUTH.md`
  - `docs/architecture/MULTITENANCY.md`
  - `docs/architecture/RBAC.md`
  - `docs/diagrams/temis-er.puml`

Validacion:

- Migracion con backfill seguro.
- Constraints tenant-safe.
- RLS simplificado.
- Tests cross-tenant para participantes.

## Orden Recomendado

1. Fase 0: baseline y observabilidad.
2. Fase 1: indices seguros.
3. Fase 3: calendario escalable.
4. Fase 4: recalculo de gastos vencidos.
5. Fase 5: RLS tenant-scoped.
6. Fase 6: tenant context en Prisma.
7. Fase 2: busqueda con trigram.
8. Fase 7: RBAC en DB para operaciones sensibles.
9. Fase 8: normalizacion final.

## Criterio De No-Regresion

Cada fase debe incluir:

- Migracion revisable.
- Tests positivos y negativos.
- Caso cross-tenant negativo cuando aplique.
- `ANALYZE` posterior.
- `EXPLAIN ANALYZE` antes/despues para queries afectadas.
- Evidencia de:
  - `npm run typecheck`
  - `npm run build`
  - tests backend relevantes
  - `npx prisma validate --schema packages/database/prisma/schema.prisma`

## Riesgos

- RLS con Prisma requiere asegurar que `app.tenant_id` se setea en la misma
  conexion/transaccion que ejecuta la query.
- Policies demasiado estrictas pueden romper seeds, migraciones o jobs.
- `CONCURRENTLY` no puede correr dentro de transacciones de migracion normales.
- Trigram mejora busquedas, pero agrega costo de escritura y storage.
- RBAC en DB puede duplicar logica con Nest; conviene introducirlo solo donde
  el riesgo lo justifique.
