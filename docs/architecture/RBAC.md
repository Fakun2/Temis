# RBAC

RBAC se resuelve por tenant mediante `tenant_memberships`.

## Roles MVP

- `owner`
- `admin`
- `lawyer`
- `paralegal`
- `accounting`
- `viewer`

## Permisos actuales en codigo

- `tenants:manage`
- `account:read`
- `account:self_manage`
- `account:ai_usage_read`
- `account:studio_manage`
- `account:membership_manage`
- `notifications:read`
- `notifications:update`
- `staff:read`
- `staff:create`
- `staff:update`
- `staff:delete`
- `staff:manage`
- `users:manage`
- `roles:read`
- `roles:create`
- `roles:update`
- `roles:delete`
- `roles:manage`
- `clients:read`
- `clients:create`
- `clients:update`
- `clients:delete`
- `cases:read`
- `cases:create`
- `cases:update`
- `cases:delete`
- `forums:read`
- `provinces:read`
- `documents:read`
- `documents:write`
- `tasks:read`
- `tasks:create`
- `tasks:update`
- `tasks:delete`
- `expenses:read`
- `expenses:create`
- `expenses:update`
- `expenses:delete`
- `hearings:read`
- `hearings:create`
- `hearings:update`
- `hearings:delete`
- `ai:case_chat`
- `finance:read`
- `finance:create`
- `finance:update`
- `finance:delete`
- `categories:read`
- `categories:create`
- `categories:update`
- `categories:delete`
- `currencies:read`
- `currencies:create` (reservado para super admin, no asignado a roles tenant)
- `currencies:update` (reservado para super admin, no asignado a roles tenant)
- `currencies:delete` (reservado para super admin, no asignado a roles tenant)
- `billing:manage`

Los permisos de autoservicio (`account:read`, `account:self_manage` y
`notifications:*`) se asignan a todos los roles, incluidos los custom: los
servicios los limitan al usuario autenticado y al tenant activo. Los permisos
de configuracion sensible se conservan segun la politica previa:
`tenants:manage` habilita IA y estudio; `tenants:manage` o `billing:manage`
habilita membresia/plan.

## Matriz esperada

### owner

Puede ver todo, gestionar tenant, usuarios, roles, configuracion, clientes,
causas, documentos, tareas, IA, finanzas, caja y auditoria.

### admin

Puede gestionar usuarios salvo transferir ownership, clientes, documentos,
tareas, reportes y configuracion limitada. No accede a expedientes ni gastos
del expediente por defecto.

### lawyer

Puede leer, crear y modificar expedientes; leer, crear, modificar y eliminar
tareas; y leer, crear, modificar y eliminar gastos asociados a tareas. No
gestiona roles ni tenant.

### paralegal

Puede leer expedientes, crear y modificar tareas, y leer, crear y modificar
gastos asociados a tareas. No elimina expedientes, tareas ni gastos.

### accounting

Tiene permisos de caja (`finance:*`) y gestiona categorias financieras
(`categories:*`). No accede a expedientes ni a gastos asociados a tareas por
defecto.

### viewer

Puede ver informacion autorizada. No crea, edita ni elimina.

## Estado actual

- Permisos se persisten como catalogo global en `permissions`.
- Roles de sistema viven en `roles` con `tenant_id = null`.
- Roles custom viven en `roles` con `tenant_id` del estudio activo.
- `roles.active` indica si un rol esta disponible para nuevas asignaciones.
- Si un rol custom se desactiva o elimina, las membresias asociadas quedan con
  `role_id = null` mediante un evento interno idempotente.
- `OnboardingService.start` upsertea permisos, roles y relaciones.
- `RolesGuard` valida rol requerido contra `request.user.tenantAccess`.
- `PermissionsGuard` valida permisos requeridos contra `request.user.tenantAccess`.
- `AccountController` y `NotificationsController` declaran permisos por ruta;
  no dependen del comportamiento permisivo de un handler sin metadata.

## Gaps

- Falta granularidad ABAC para causas/documentos asignados.
- Faltan modulos operativos donde aplicar permisos reales.
- `billing:manage` existe en permisos pero facturacion SaaS queda post-MVP.

## Decision

Para MVP, implementar RBAC base y documentar ABAC/permisos granulares como
post-MVP o como extension incremental cuando existan causas/documentos.

## Acceso de plataforma

`super_admin` no es un rol tenant y no vive en `roles` ni en
`tenant_memberships`. Su asignacion global se conserva en
`platform_role_assignments`, se provisiona solamente por CLI en VPS y se
valida por guards de plataforma contra la base.

Permisos activos:

- `platform:access`
- `platform:account:self_manage` (solo permite modificar el perfil y la contraseña propia)
- `platform:observability:read`
- `platform:users:read` (permite consultar métricas y el directorio global de usuarios, sin exponer contenido legal ni habilitar acciones sobre cuentas)
- `platform:announcements:manage` (permite crear, programar, publicar, editar borradores y cancelar comunicados globales o segmentados)

El mismo permiso controla la creación y gestión de newsletters y sus imágenes. Su lectura requiere `admin:access` y una membresía tenant activa; la API verifica también la audiencia y vigencia antes de entregar contenido o archivos. La lectura es individual por usuario y revisión.

Scope reservado: estudios, usuarios tenant, noticias, suscripciones SaaS y
revenue. El Super Admin no puede leer contenido legal tenant, impersonar
usuarios, operar infraestructura, consultar secretos o ejecutar billing en la
primera version.

El rol no basta para acceder: `PlatformGuard` exige una `platform_session`
activa cuyo `securityMode` coincida con `PLATFORM_SECURITY_MODE`. En `disabled`
la sesión usa `amr=["pwd"]`, no tiene dispositivo y las acciones sensibles
requieren contraseña reciente. En `required`, la sesión se liga al
`platform_device` presentado por mTLS y las acciones sensibles requieren una
verificación WebAuthn reciente. El login Google y la recuperación de contraseña
por correo no están habilitados para identidades de plataforma. Las rutas de
plataforma sólo se sirven bajo `/superadmin`; las rutas tenant permanecen bajo
`/admin` en el mismo origen. `TenantAuthGuard` rechaza JWT de
plataforma antes de evaluar tenant, y `PlatformGuard` rechaza JWT tenant antes
de comprobar permisos o dispositivo.
