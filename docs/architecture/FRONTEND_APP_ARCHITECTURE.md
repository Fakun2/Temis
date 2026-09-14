# Frontend app architecture

Este documento define la arquitectura activa de `apps/web` para vistas del
dashboard. La meta es mantener UI, estado local, contratos de API y reglas de
tenant separados, con componentes chicos y faciles de revisar.

## Capas

### App Router

Las rutas viven bajo `apps/web/app`. Una ruta debe orquestar la pantalla, no
contener detalles de tabla, formularios o mapeos grandes. En features complejas,
`page.tsx` debe conectar hooks y componentes de alto nivel.

### Feature modules

Cada pantalla operativa puede tener carpetas privadas con prefijo `_`:

- `_api`: adaptadores del cliente generado por Orval y armado de query params.
- `_components`: componentes visuales agrupados por responsabilidad.
- `_constants`: defaults de la feature.
- `_hooks`: estado local, queries y composicion de comportamiento.
- `_types`: aliases o tipos propios de la feature.
- `_utils`: helpers puros de formato, filtros o mapping.

Una feature no debe importar internals privados de otra feature. Si algo se
repite entre pantallas, debe subir a `components`, `lib` o una carpeta de dominio
compartida.

## API y datos

El contrato de backend se consume desde `@temis/api-client`, generado con
Orval desde OpenAPI. Los endpoints no se escriben a mano en componentes.

Las credenciales de autenticacion viven en cookies `HttpOnly` creadas por route
handlers de Next. El browser no debe leer ni persistir access/refresh tokens en
`localStorage`.

Las llamadas autenticadas pasan por `lib/api/authenticated-fetch.ts` y por el
proxy server-side de Next, que agrega:

- `Authorization: Bearer <accessToken>` desde cookie `HttpOnly`.
- `x-tenant-id` desde el tenant activo del token.
- Normalizacion de paths generados por el cliente.

El cliente no debe enviar `tenantId` como dato de formulario o filtro. El tenant
activo se resuelve desde la sesion y viaja como contexto de request.

## TanStack Query

`lib/query/query-provider.tsx` instala el `QueryClientProvider` global.
`lib/query/use-dashboard-query.ts` es el hook base para pantallas del dashboard.

El hook base centraliza:

- lectura de sesion;
- seleccion del tenant activo;
- chequeo de permiso requerido;
- `queryKey` aislada por tenant;
- `enabled` cuando falta sesion, tenant o permiso.

Las features deben crear hooks finos encima de `useDashboardQuery`, por ejemplo
`useStaffQuery`, y no repetir esta logica en cada componente.

## Componentes

La regla para features nuevas es un componente por archivo. Un archivo de
componente puede mapear colecciones para renderizar items, pero no debe declarar
otros componentes locales si esos componentes tienen nombre, props o
responsabilidad propia.

Separacion esperada:

- componentes de layout de feature: componen secciones grandes;
- componentes de control: botones, filtros, selects, toolbar;
- componentes de tabla: card, toolbar, table, header, row, pagination, states;
- hooks: estado de filtros, paginacion, orden y drafts de formularios;
- utils: funciones puras sin React.

## Ejemplo: `/admin/staff`

`/admin/staff` sigue esta estructura:

- `page.tsx`: orquesta la pantalla.
- `_hooks/use-staff-page-state.ts`: filtros draft/aplicados, sort y paginacion.
- `_hooks/use-staff-query.ts`: query tenant-aware con permiso `staff:read`.
- `_api/staff.api.ts`: adaptador del endpoint generado por Orval.
- `_components/filters`: filtros y acciones de busqueda.
- `_components/metrics`: cards de metricas.
- `_components/table`: card de tabla, toolbar, sort, filas, estados y paginacion.
- `_components/create-staff`: sheet de alta y campos internos.
- `_components/access`: estado restringido por permiso.

## Reglas de seguridad frontend

El frontend puede ocultar acciones cuando falta permiso, pero no es una frontera
de seguridad. El backend debe seguir validando JWT, tenant activo y permisos.

No guardar datos sensibles fuera de cookies `HttpOnly` ni duplicar tokens en
estado de feature. `localStorage` puede mantener solo una snapshot no sensible
de usuario/permisos para hidratar UI. Las queries del dashboard deben usar el
hook global para preservar aislamiento multi-tenant.

## RBAC frontend

Los permisos del dashboard se resuelven desde el primer `tenantAccess` de la
sesion hasta que exista selector real de workspace. La logica compartida vive en
`lib/auth/permissions.ts` y debe usarse para vistas, queries, mutaciones,
acciones y navegacion.

El middleware de Next valida server-side el access token firmado antes de dejar
entrar a rutas `/admin`. Esta validacion mejora UX y reduce exposicion de vistas,
pero las operaciones siguen dependiendo de los guards del backend.

La navegacion admin declara `requiredPermissions`, `permissionMode` y `status`
en sus configs. Sidebar y command palette deben filtrarse con helpers puros, no
con condiciones inline por componente. Los items `soon` no se muestran.

Para vistas y acciones se usan guards reutilizables:

- `RequirePermission`: protege una vista o seccion grande.
- `Can`: oculta acciones puntuales como botones o menus.

Estos guards mejoran UX, pero no reemplazan los guards del backend.
