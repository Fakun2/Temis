# Temis - Plan operativo S2/S3

Este documento baja a ejecucion el trabajo inmediato de Temis. La prioridad actual es presentar hoy una version profesional de `login/register` y, despues de esa demo, avanzar con S2/S3: autenticacion y gestion de clientes.

## Estado de producto

- **Demo inmediata:** login/register con nueva identidad visual para cliente.
- **S2:** Autenticacion, roles, reset password, proteccion de rutas y seguridad por tenant.
- **S3:** Gestion de clientes con CRUD, busqueda e historial.
- **Regla de trabajo:** no mezclar redisenio visual, autenticacion y clientes en un mismo PR.

## Sprint 1 bis - Ajuste visual para demo cliente

### Objetivo

Cambiar la percepcion visual de la pantalla de inicio de sesion y registro sin tocar contratos funcionales de autenticacion.

### Alcance

1. Centralizar paleta legaltech premium.
2. Unificar lenguaje visual entre `/login` y `/create-account`.
3. Reemplazar textos genericos o en ingles por copy legaltech.
4. Mantener estados de formulario: loading, error, success y validaciones.

### Paleta propuesta

| Token | Color | Uso |
| --- | --- | --- |
| `--background` | `#F6F1E8` | fondo principal, tono papel/calido |
| `--foreground` | `#14110F` | texto principal |
| `--card` | `#FFFDF8` | formularios y paneles |
| `--primary` | `#8B6F2A` | CTA principal dorado sobrio |
| `--primary-foreground` | `#FFFFFF` | texto sobre CTA |
| `--secondary` | `#E9DDC7` | inputs, badges y botones secundarios |
| `--muted` | `#EFE7DA` | fondos suaves |
| `--muted-foreground` | `#6F665C` | texto secundario |
| `--border` | `#D6C4A3` | bordes premium |
| `--ring` | `#8B6F2A` | focus visible |

### Copy recomendado

- Badge: `Gestion juridica privada`
- Titulo register: `Crear cuenta`
- Descripcion register: `Configura tu acceso a Temis para gestionar clientes, expedientes y tareas del estudio en un solo lugar.`
- Titulo login: `Iniciar sesion`
- Descripcion login: `Accede al workspace de tu estudio juridico y continua con la gestion de clientes, expedientes y vencimientos.`
- Feature 1: `Clientes y expedientes ordenados`
- Feature 2: `Roles y permisos por estudio`

### PR sugerido

- Branch: `feature/auth-ui-client-palette`
- Titulo PR: `feat(web): update auth UI palette for client demo`
- Archivos principales:
  - `apps/web/app/globals.css`
  - `apps/web/app/login/page.tsx`
  - `apps/web/app/create-account/page.tsx`
  - `apps/web/app/create-account/_components/*`
  - `apps/web/app/create-account/_constants/create-account.constants.ts`

### Criterios de aceptacion

- No quedan colores morado/ambar de apariencia generica en el flujo principal de auth.
- `/login` y `/create-account` parecen parte del mismo producto.
- El texto habla de estudio juridico, clientes, expedientes, roles y seguridad.
- Login conserva `authControllerLogin` y `saveSession`.
- Register conserva el hook `useCreateAccountForm`.
- Mobile y desktop renderizan correctamente.

## S2 - Autenticacion

### Objetivo

Cerrar la base de acceso real del sistema: login, registro, roles, permisos, recuperacion de contrasena y proteccion de rutas.

### Entregables

1. Auditoria de contrato auth actual.
2. Validaciones frontend/backend alineadas.
3. Rutas privadas protegidas.
4. Reset password MVP.
5. Matriz RBAC MVP.
6. Tenant context por request.
7. Guards aplicados a endpoints operativos.
8. Tests minimos backend/frontend.

### Issues minimas

- `BOG-005` Auditar contrato actual de autenticacion.
- `BOG-006` Endurecer validaciones register/login.
- `BOG-007` Proteger rutas privadas frontend.
- `BOG-008` Implementar reset password MVP.
- `BOG-009` Definir roles y permisos MVP.
- `BOG-010` Aplicar tenant context por request.
- `BOG-011` Aplicar guards RBAC.
- `BOG-012` Tests S2 autenticacion.

## S3 - Gestion de Clientes

### Objetivo

Implementar el primer modulo operativo visible para el cliente: CRUD de clientes, busqueda y vista de historial.

### Entregables

1. Modelo `Client` tenant-aware.
2. Migracion Prisma.
3. API CRUD clientes.
4. Busqueda y filtros.
5. Historial de cliente.
6. UI listado clientes.
7. UI formulario cliente.
8. UI detalle + historial.
9. Tests minimos.

### Campos MVP de cliente

| Campo | Tipo | Requerido | Nota |
| --- | --- | --- | --- |
| `tenantId` | relation/id | si | separacion por estudio |
| `type` | enum | si | persona / empresa |
| `displayName` | string | si | nombre visible |
| `documentType` | string | no | DNI/CUIT/etc. |
| `documentNumber` | string | no | indexable |
| `email` | string | no | contacto |
| `phone` | string | no | contacto |
| `address` | string | no | domicilio |
| `status` | enum | si | activo / inactivo |
| `notes` | text | no | observaciones internas |

### Issues minimas

- `BOG-013` Definir modelo cliente tenant-aware.
- `BOG-014` Crear migracion Prisma para clientes.
- `BOG-015` API CRUD clientes.
- `BOG-016` Busqueda y filtros de clientes.
- `BOG-017` Historial de cliente backend.
- `BOG-018` UI listado de clientes.
- `BOG-019` UI alta/edicion de cliente.
- `BOG-020` UI detalle de cliente con historial.
- `BOG-021` Tests S3 clientes.

## Orden recomendado de trabajo

### Dev 1 - Backend / DB

1. `BOG-005`
2. `BOG-009`
3. `BOG-010`
4. `BOG-011`
5. `BOG-013`
6. `BOG-014`
7. `BOG-015`
8. `BOG-016`
9. `BOG-017`
10. `BOG-012` y `BOG-021` backend

### Dev 2 - Frontend / UX

1. `BOG-001`
2. `BOG-002`
3. `BOG-003`
4. `BOG-004`
5. `BOG-006`
6. `BOG-007`
7. `BOG-018`
8. `BOG-019`
9. `BOG-020`
10. `BOG-012` y `BOG-021` frontend

## Definition of Done por issue

- Branch propia creada desde `main`.
- Issue linkeada en PR.
- Criterios de aceptacion cumplidos.
- Evidencia de comandos agregada al PR: `npm run typecheck`, `npm run lint` y/o tests aplicables.
- Capturas cuando el cambio sea visual.
- Sin mezclar alcance de otro sprint.
