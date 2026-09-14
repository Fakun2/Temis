# TEMIS ERD - notas de diseno

Este modelo interpreta el documento del 04/06/2026 como una base para una SaaS B2B de abogacia. Cada `tenant` representa un estudio juridico cliente de la plataforma, mientras que `clients` representa a los clientes juridicos que atiende ese estudio.

## Multitenancy

- La aplicacion usa una sola base de datos compartida.
- Todas las tablas operativas del negocio llevan `tenant_id`.
- `users` no lleva `tenant_id` porque representa una identidad global del sistema.
- `currencies` no lleva `tenant_id` porque funciona como catalogo global.
- Las FK entre tablas operativas deben validarse dentro del mismo tenant. Por ejemplo, un `case_id` usado en `expenses` debe pertenecer al mismo `tenant_id` de ese gasto.
- Se recomienda crear indices compuestos para busquedas frecuentes por tenant, por ejemplo `(tenant_id, id)`, `(tenant_id, status)` y `(tenant_id, client_id)`.

## RBAC por tenant

- La membresia de un usuario a un estudio se modela en `tenant_memberships`.
- `tenant_memberships.role_id` define el rol del usuario dentro de ese tenant.
- Un mismo usuario puede trabajar en varios estudios y tener un rol distinto en cada uno.
- Roles sugeridos:
  - `owner`: administra el tenant y la facturacion del estudio.
  - `admin`: administra usuarios, configuracion y datos operativos.
  - `lawyer`: gestiona causas, tareas, documentos y notificaciones.
  - `paralegal`: colabora con tareas, documentos y seguimiento operativo.
  - `accounting`: gestiona cuentas corrientes, gastos, caja y movimientos.
  - `viewer`: acceso de lectura.

## Decisiones de dominio

- `clients.type` distingue `human` y `legal_entity`. Los campos personales y juridicos conviven en la tabla para cubrir personas humanas y sociedades.
- `cases` representa causa o expediente. Los datos como jurisdiccion, fuero, radicacion, instancia, provincia y pais viven en esa tabla.
- Las listas del documento como `notification_id[]`, `task_id[]` y `gastos_id[]` se representan como relaciones 1:N desde `cases`.
- `case_participants` permite vincular una causa con clientes, contrarios u otros participantes. `procedural_role` cubre roles como demandante y demandado.
- `current_accounts` es 1:1 con `clients` dentro de un tenant mediante `unique(tenant_id, client_id)`.
- `account_movements` y `cash_movements` pueden relacionarse opcionalmente con causa y cliente para cubrir movimientos generales del estudio o movimientos asociados a un expediente.
- Las categorias de documentos, gastos, movimientos de cuenta corriente y movimientos de caja son tenant-scoped para que cada estudio configure sus propias opciones.

## Reglas de integridad recomendadas

- Impedir relaciones cruzadas entre tenants con FK compuestas o validaciones de aplicacion transaccionales.
- Usar soft status (`active`, `inactive`, `archived`, etc.) para entidades operativas en vez de borrar informacion historica.
- Mantener `tenant_memberships` unica por `(tenant_id, user_id)`.
- Mantener `current_accounts` unica por `(tenant_id, client_id)`.
- Evitar arrays de IDs en columnas; las relaciones deben representarse con tablas hijas o tablas puente.

## Validaciones esperadas

- El diagrama PlantUML debe compilar sin errores.
- Todas las tablas operativas deben tener `tenant_id`.
- `users` y `currencies` deben permanecer globales.
- RBAC debe permitir roles diferentes para el mismo usuario en tenants diferentes.
- El ERD debe separar visualmente tenancy/RBAC, dominio juridico, tareas/notificaciones/documentos y finanzas.
