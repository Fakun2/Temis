# Temis - Setup de GitHub Project

Guia para crear el Project real de Temis en GitHub y usarlo como tablero central de ejecucion. La documentacion vive en este repo y el Project debe consumir las issues reales.

## Objetivo del Project

Tener una vista unica para:

- Ver todo el backlog del producto.
- Ejecutar S2/S3 sin perder correlatividades.
- Separar trabajo por area: `web`, `api`, `database`, `auth`, `clients`, `cases`, `finance`, `integrations`, `qa`.
- Presentar avance al cliente por sprint.
- Trabajar como en `codigo-cuatro`: issues claras, PR por issue y evidencia en cada cierre.

## Nombre sugerido

`Temis - Product Delivery`

## Tipo de Project

Usar **GitHub Projects** nuevo, no Projects classic.

Ruta sugerida:

1. Entrar a GitHub.
2. Ir al perfil/owner `Fakun2`.
3. Abrir **Projects**.
4. Crear **New project**.
5. Elegir **Table**.
6. Nombre: `Temis - Product Delivery`.
7. Agregar el repositorio `Fakun2/Temis` como fuente.

## Campos obligatorios

| Campo | Tipo | Valores sugeridos |
| --- | --- | --- |
| `Status` | Single select | Backlog, Ready, In progress, Needs review, Blocked, Done |
| `Sprint` | Single select | S1 Demo Auth UI, S2 Auth, S3 Clientes, S4-S5 Expedientes, S6 Caja Estudio, S7 Caja Socio, S8 Tareas Calendar, S9 Drive, S10 Testing Deploy |
| `Phase` | Single select | Administrativo, Operacional, Integraciones, QA/Deploy |
| `Area` | Single select | Web, API, Database, Auth, Tenant, RBAC, Clients, Cases, Documents, Tasks, Finance, Integrations, QA, Infra, Docs |
| `Priority` | Single select | P0, P1, P2, P3 |
| `Size` | Single select | XS, S, M, L, XL |
| `Owner` | People | Responsable principal |
| `Start date` | Date | Fecha de inicio |
| `Target date` | Date | Fecha objetivo |
| `Blocked by` | Text | IDs de issues bloqueantes |
| `Evidence` | Text | PR, captura, deploy, comando o demo |

## Labels canonicos del repo

### Tipo

- `type:epic`
- `type:feature`
- `type:bug`
- `type:docs`
- `type:chore`
- `type:refactor`
- `type:test`
- `type:content`

### Area

- `area:web`
- `area:api`
- `area:database`
- `area:auth`
- `area:tenant`
- `area:rbac`
- `area:onboarding`
- `area:clients`
- `area:cases`
- `area:documents`
- `area:tasks`
- `area:finance`
- `area:integrations`
- `area:qa`
- `area:infra`
- `area:docs`

### Prioridad

- `priority:p0`
- `priority:p1`
- `priority:p2`
- `priority:p3`

### Estado auxiliar

- `status:ready`
- `status:in-progress`
- `status:needs-review`
- `status:blocked`

## Vistas del Project

### 1. Backlog general

- Layout: Table.
- Agrupar por: `Sprint`.
- Ordenar por: `Priority`, luego `Blocked by`.
- Uso: ver todo el proyecto completo.

### 2. Sprint actual

- Layout: Board.
- Filtro: `Sprint = S1 Demo Auth UI` o sprint activo.
- Columnas: `Status`.
- Uso: ejecucion diaria.

### 3. S2/S3 operativo

- Layout: Board.
- Filtro: `Sprint = S2 Auth OR Sprint = S3 Clientes`.
- Columnas: `Status`.
- Uso: preparar autenticacion y gestion de clientes.

### 4. Roadmap cliente

- Layout: Roadmap.
- Agrupar por: `Sprint`.
- Fechas: `Start date` y `Target date`.
- Uso: mostrar avance macro al cliente.

### 5. Por desarrollador

- Layout: Table.
- Agrupar por: `Owner`.
- Filtro opcional: `Status != Done`.
- Uso: division clara para 2 desarrolladores.

### 6. Bugs y bloqueos

- Layout: Table.
- Filtro: `Status = Blocked OR type:bug`.
- Uso: priorizar desbloqueos.

## Workflow obligatorio

1. Crear issue o tomar issue existente.
2. Completar `Status = Ready` si tiene criterios claros.
3. Crear branch desde `main` usando el nombre sugerido.
4. Al empezar: `Status = In progress`.
5. Abrir PR linkeando issue: `Closes BOG-XXX` si es issue real o `Refs BOG-XXX` si aun es catalogo.
6. Al abrir PR: `Status = Needs review`.
7. Al mergear: `Status = Done`.
8. Agregar evidencia en la issue/PR: comandos, capturas o deploy.

## Regla de correlatividad

Ninguna issue dependiente se inicia si la dependencia esta abierta o bloqueada, salvo que el PR sea solo de documentacion o contrato. Ejemplos:

- `BOG-015 API CRUD clientes` no arranca antes de `BOG-014 Migracion Prisma clientes`.
- `BOG-018 UI listado clientes` puede arrancar con mocks si `BOG-015` aun no esta, pero debe declararlo en el PR y no cerrar hasta integrar API real.
- `BOG-011 Guards RBAC` no debe cerrar sin `BOG-009 Matriz RBAC` y `BOG-010 Tenant context`.

## Comandos de control antes de cerrar PR

```bash
npm run typecheck
npm run lint
npm run build
```

Si algun comando falla por deuda previa del repo, documentar el error exacto en el PR y separar si corresponde una issue `type:bug` o `type:chore`.
