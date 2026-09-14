# Multitenancy

Temis debe ser multi-tenant desde el dia cero aunque el primer uso sea un solo
estudio piloto.

## Modelo

- `tenants` representa estudios juridicos clientes del SaaS.
- `users` representa identidades globales.
- `tenant_memberships` vincula usuarios con tenants y roles.
- Entidades operativas deben tener `tenant_id` o relacion obligatoria con una
  entidad tenant-scoped.
- `currencies` es catalogo global.

## Tenant activo

Estado actual:

- El backend usa header `x-tenant-id`.
- `TenantGuard` exige usuario autenticado, membership activa para el tenant
  solicitado y tenant con estado `active` antes de asignar
  `request.activeTenantId`.
- `RolesGuard` y `PermissionsGuard` consultan el payload JWT para rol/permisos.

La validacion contra la base complementa el payload JWT: una membresia revocada
o un tenant desactivado dejan de poder usar rutas operativas aun si el token no
expira de inmediato.

## Reglas de queries

- Toda query operativa debe filtrar por `tenantId`.
- Toda creacion operativa debe setear `tenantId` desde contexto autenticado, no
  desde input libre del cliente.
- Toda relacion entre entidades operativas debe comprobar mismo tenant.
- No usar tenant hardcodeado.

## Entidades globales permitidas

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `currencies`
- `global_finance_categories`

## Entidades tenant-scoped

Implementadas:

- `tenant_profiles`
- `tenant_settings`
- `practice_areas`
- `tenant_memberships`
- `tenant_finance_categories`
- `cashbox_movements`
- `notification_reminders`
- `notification_reminder_recipients`

Pendientes:

- `clients`
- `opposing_parties`
- `cases`
- `case_participants`
- `document_categories`
- `documents`
- `tasks`
- `task_responsibles`
- entidades financieras restantes.

## Criterios de aceptacion futuros

- Tests de no acceso cross-tenant.
- Rechazo de membership inactiva o tenant inactivo desde `TenantGuard`.
- Guards aplicados en rutas operativas.
- Servicios no aceptan `tenantId` arbitrario desde body.
- Errores claros para tenant ausente, inactivo o no autorizado.
