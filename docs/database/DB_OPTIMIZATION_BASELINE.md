# Temis DB Optimization Baseline

Fecha: 2026-08-03.

Este baseline corresponde a la Fase 0 del plan de optimizacion de DB. La base
local tiene poco volumen, por lo que los planes no deben usarse para eliminar
indices. Si sirven como punto de partida para comparar cambios futuros.

## Comandos

```bash
npm run db:analyze
npm run db:inspect -- --json
```

Los scripts cargan `.env` y `.env.local`, pero no imprimen `DATABASE_URL`.

## Resultado De ANALYZE

- `ANALYZE` ejecutado correctamente.
- Tablas analizadas: 24.
- `DATABASE_URL` no fue impresa.

## Estado De RLS

RLS no esta activo en tablas de aplicacion.

- `rls_enabled = false`
- `rls_forced = false`
- `policy_count = 0`
- `pg_policies` no devuelve policies en `public`.

Tablas operativas relevantes sin RLS:

- `clients`
- `cases`
- `case_tasks`
- `case_expenses`
- `case_hearings`
- `case_expense_attachments`
- `case_participants`
- `practice_areas`
- `tenant_memberships`
- `tenant_profiles`
- `tenant_settings`
- `roles`

## Volumen Local

Resumen de tablas principales despues de `ANALYZE`:

| Tabla                | Filas vivas | Dead rows | Tamano total |
| -------------------- | ----------: | --------: | -----------: |
| `cases`              |           1 |         0 |       208 kB |
| `forum_templates`    |         149 |         0 |       192 kB |
| `case_expenses`      |           3 |         1 |       160 kB |
| `case_tasks`         |           2 |         2 |       160 kB |
| `case_hearings`      |           1 |         0 |       112 kB |
| `roles`              |           6 |         6 |       112 kB |
| `role_permissions`   |         115 |         0 |       104 kB |
| `tenant_memberships` |           2 |         1 |        88 kB |
| `provinces`          |          25 |        26 |        64 kB |
| `users`              |           4 |        22 |        64 kB |

## Indices

- No se detectaron indices duplicados exactos.
- Hay muchos indices con `idx_scan = 0`, pero la DB local no tiene volumen
  suficiente para decidir eliminaciones.
- Los indices mas usados en esta muestra pertenecen principalmente a:
  - `users`
  - `case_expenses`
  - `case_tasks`
  - `tenant_memberships`
  - `role_permissions`

## Queries Criticas Cubiertas Por `db:inspect`

El script captura `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` para:

- `cases:list-default`
- `cases:search`
- `cases:detail`
- `calendar:expenses`
- `calendar:tasks`
- `calendar:hearings`
- `roles:list`
- `staff:list`

Los UUIDs de tenant, case y user se sanitizan como `<uuid>`.

## Lecturas Iniciales

- En tablas chicas, PostgreSQL elige `Seq Scan` con frecuencia; esto es normal
  y no implica que falten o sobren indices.
- `roles:list` y `staff:list` muestran sorts y joins en memoria con volumen
  local minimo.
- `calendar:*` hoy ordena resultados por fecha/id y todavia depende de merge
  en memoria a nivel aplicacion para combinar tipos de eventos.
- RLS es el gap principal de seguridad a nivel DB.

## Siguiente Fase

La siguiente fase recomendada es Fase 1: indices seguros.

Antes de aplicar indices:

- Re-ejecutar `npm run db:inspect -- --json`.
- Guardar el output si se quiere comparar planes completos.
- No eliminar indices actuales sin evidencia con datos reales.

## Baseline Post-Trigram

Luego de implementar la Fase 2 se genero un nuevo reporte sanitizado:

- `docs/database/baselines/2026-08-03-db-inspect-after-trigram.json`

Ese reporte confirma la existencia de `pg_trgm` y de los indices GIN trigram.
Con el volumen local actual, PostgreSQL puede seguir eligiendo `Seq Scan`; la
validacion real de uso de GIN requiere datos representativos.
