# RBAC en Temis

Este documento explica como funciona el sistema RBAC de Temis en backend y UI, y que pasos seguir para asegurar una nueva feature.

## Principios

- El backend es la fuente real de seguridad.
- La UI solo mejora la experiencia: oculta vistas, acciones y navegacion que el usuario no puede usar.
- Todo permiso se evalua contra el tenant activo.
- El cliente no envia `tenantId` en el body. El tenant activo llega por contexto de sesion y headers internos.
- Los roles custom pertenecen a un tenant. Los roles de sistema son globales.

## Modelo

Tablas principales:

- `permissions`: catalogo global de permisos.
- `roles`: roles globales de sistema o roles custom por tenant.
- `role_permissions`: relacion entre roles y permisos.
- `tenant_memberships`: relacion usuario-tenant, con rol, estado y jerarquia efectiva.

Convenciones:

- Permisos con formato `resource:action`, por ejemplo `staff:read`.
- Roles de sistema: `roles.tenantId = null`.
- Roles custom: `roles.tenantId = activeTenantId`.
- Un usuario puede estar en varios tenants, pero cada request usa un tenant activo.

## Permisos Importantes

Acceso base:

- `admin:access`: permite entrar al dashboard admin. Debe estar en todos los roles asignables.

Staff:

- `staff:read`
- `staff:create`
- `staff:update`
- `staff:delete`

Roles:

- `roles:read`
- `roles:create`
- `roles:update`
- `roles:delete`

Los permisos de roles y catalogos legales sensibles solo pertenecen al rol `owner`.
Los roles custom no deben recibir permisos `roles:*`, `forums:*` ni `provinces:*`
por defecto.

## Jerarquia

La jerarquia actual controla que roles o personas puede modificar/asignar un usuario:

- `3`: owner. Puede hacer todo.
- `2`: administrador. Puede gestionar personal de jerarquia inferior.
- `1`: operativo. No gestiona staff.

Reglas esperadas:

- Un usuario solo puede asignar roles de jerarquia inferior, salvo owner.
- Un usuario no owner no puede cambiar su propio rol desde Staff.
- Un usuario no puede modificar/eliminar personal de igual o mayor jerarquia.
- Owner puede gestionar todos los roles/personas.

## Backend

Antes de levantar la aplicacion en un ambiente nuevo, correr:

```bash
npm run db:prepare
```

Ese comando aplica migraciones pendientes y ejecuta la seed RBAC con permisos y roles de sistema. Si solo hace falta re-sincronizar RBAC:

```bash
npm run db:seed:rbac
```

Los endpoints protegidos deben usar guards en este orden:

```ts
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
```

Y declarar permisos con:

```ts
@Permissions("staff:read")
```

Responsabilidades:

- `JwtAuthGuard`: valida sesion.
- `TenantGuard`: valida tenant activo.
- `PermissionsGuard`: valida permisos contra el tenant activo.
- Servicios: validan reglas de negocio extra, como jerarquia, pertenencia al tenant y estado.

Ejemplo:

```ts
@Get("staff")
@Permissions("staff:read")
list(@ActiveTenant() tenantId: string) {
  return this.staffService.list(tenantId);
}
```

Reglas para servicios:

- Nunca confiar en `tenantId` enviado por el cliente.
- Filtrar queries por `activeTenantId`.
- Validar que relaciones elegidas pertenezcan al tenant activo.
- Validar jerarquia cuando la accion afecta usuarios, staff o roles.
- No devolver `password` ni `passwordHash`.
- Responder `403` para permiso insuficiente y `404` solo cuando el recurso realmente no existe o no pertenece al tenant.

## Frontend

La UI usa helpers centralizados:

- `hasPermission(session, permission)`
- `hasAnyPermission(session, permissions)`
- `hasAllPermissions(session, permissions)`
- `hasPermissions(session, permissions, mode)`
- `getActiveTenantAccess(session)`

Componentes:

- `RequirePermission`: protege una vista completa.
- `Can`: protege acciones chicas, botones o items de menu.

Ejemplo:

```tsx
<RequirePermission permissions={["staff:read"]} fallback={<RestrictedStaff />}>
  <StaffPage />
</RequirePermission>
```

Ejemplo de accion:

```tsx
<Can permissions={["staff:create"]}>
  <CreateStaffSheet />
</Can>
```

## Sidebar y Command Palette

La navegacion se declara con permisos:

```ts
{
  href: "/admin/staff",
  label: "Staff",
  requiredPermissions: ["staff:read"]
}
```

Luego se filtra con `getAuthorizedNavSections`.

Reglas:

- Items `soon` no aparecen.
- Items sin permisos no aparecen.
- Secciones vacias no aparecen.
- La command palette usa la misma logica conceptual que la sidebar.

## Requests desde UI

Las vistas del dashboard deben usar TanStack Query con helpers globales:

- `useDashboardQuery`
- `useDashboardMutation`

Estos helpers:

- leen sesion del dashboard;
- revisan permisos antes de ejecutar;
- usan tenant activo;
- evitan requests cuando el usuario no esta autorizado.

Ejemplo:

```ts
useDashboardQuery({
  permission: "staff:read",
  queryKey: staffKeys.list(params),
  queryFn: listStaff
});
```

## Como Asegurar una Nueva Feature

1. Definir permisos.

Usar formato `resource:action`:

- `clients:read`
- `clients:create`
- `clients:update`
- `clients:delete`

2. Agregar permisos al catalogo backend.

Actualizar `RBAC_PERMISSIONS` y crear migracion si la DB existente necesita esos permisos.

3. Asignar permisos a roles base.

Actualizar `RBAC_ROLES` o la normalizacion por jerarquia si corresponde.

4. Proteger endpoints.

Agregar `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)` y `@Permissions(...)`.

5. Validar tenant en servicio.

Toda query debe filtrar por `activeTenantId` o validar pertenencia antes de modificar.

6. Validar reglas extra.

Si la accion involucra usuarios, roles, staff, documentos o expedientes, agregar validaciones de jerarquia o pertenencia.

7. Proteger la vista en frontend.

Usar `RequirePermission` en la pagina.

8. Proteger acciones.

Usar `Can` en botones, menus y acciones de tabla.

9. Registrar en navegacion.

Agregar `requiredPermissions` en sidebar y command palette.

10. Usar query/mutation global.

No usar `fetch` directo en dashboard protegido. Usar `useDashboardQuery` o `useDashboardMutation`.

11. Probar.

Verificar:

- usuario con permiso puede ver y ejecutar;
- usuario sin permiso no ve sidebar/action;
- navegacion manual muestra estado restringido;
- backend devuelve `403`;
- otro tenant no puede acceder a datos;
- roles custom respetan permisos y jerarquia.

## Checklist Rapido

- [ ] Permiso creado en backend.
- [ ] Migracion de datos si aplica.
- [ ] Rol base actualizado.
- [ ] Endpoint con `JwtAuthGuard`, `TenantGuard`, `PermissionsGuard`.
- [ ] Endpoint con `@Permissions`.
- [ ] Servicio filtra por tenant activo.
- [ ] Servicio valida relaciones del mismo tenant.
- [ ] UI protegida con `RequirePermission`.
- [ ] Acciones protegidas con `Can`.
- [ ] Query/mutation usa helpers globales.
- [ ] Sidebar/command palette declaran permisos.
- [ ] Tests o QA manual cubren autorizado, no autorizado y tenant isolation.
