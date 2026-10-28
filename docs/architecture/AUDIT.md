# Technical audit

Auditoria realizada para PR 1 en la rama
`chore/project-organization-and-roadmap`.

## Repo map

- `apps/api`: backend NestJS modular.
- `apps/web`: frontend Next.js App Router.
- `packages/database`: Prisma schema, migraciones y cliente.
- `packages/api-client`: cliente TypeScript generado por Orval.
- `docs/diagrams`: ERD PlantUML y notas de diseno.
- `infra/nginx`: reverse proxy local.
- `scripts`: scripts PowerShell de Docker.

## Stack confirmado

- Turborepo con npm workspaces.
- Backend: NestJS + TypeScript.
- Frontend: Next.js App Router + Tailwind CSS + shadcn/ui.
- Validacion: Zod y nestjs-zod.
- API client: Orval desde OpenAPI.
- ORM: Prisma.
- DB principal: PostgreSQL.
- Cache DB: Redis.
- Infra local: Docker Compose + Nginx.

## Modulos backend actuales

- `auth`
- `database`
- `health`
- `identity`
- `onboarding`
- `rbac`
- `redis`
- `tenancy`

## Pantallas frontend actuales

- Home.
- Crear cuenta.
- Login.
- Onboarding en 3 pasos.

## Prisma actual

Modelos:

- `Tenant`
- `User`
- `TenantProfile`
- `TenantSettings`
- `PracticeArea`
- `Currency`
- `Role`
- `Permission`
- `RolePermission`
- `TenantMembership`

## Comandos ejecutados

| Comando                                                  | Resultado                                              |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `git checkout -b chore/project-organization-and-roadmap` | OK                                                     |
| `npm install`                                            | OK despues de reintentos                               |
| `npm run db:generate`                                    | OK con red aprobada para descargar query engine        |
| `npm run typecheck`                                      | OK, 4 paquetes                                         |
| `npm run lint`                                           | OK, 4 paquetes                                         |
| `npm run test:e2e`                                       | OK, 5 tests de auth                                    |
| `npm run api:openapi`                                    | OK                                                     |
| `npm run api-client:generate`                            | OK; solo produjo ruido de line endings y se dejo fuera |
| `npm run db:migrate`                                     | Falla por falta de `DATABASE_URL`                      |
| `npm run format:check`                                   | Falla por deuda existente de formato en 103 archivos   |
| `npx prettier --check ...` sobre archivos de PR 1        | OK                                                     |

## Detalle de resultados

- `npm install` primero fallo porque npm no pudo escribir logs/cache fuera del
  sandbox. Con permisos aprobados quedo sin tiempo, luego mostro `ENOTEMPTY` en
  `node_modules/next/dist` y finalmente paso.
- `npm install` reporto 17 vulnerabilidades: 2 moderate y 15 high.
- `db:generate` fallo inicialmente por descarga del binario de Prisma y paso
  despues de permitir red.
- `db:migrate` no pudo correr porque falta `DATABASE_URL`.
- `format:check` global falla sobre muchos archivos existentes. Para no meter un
  refactor de formato masivo en PR 1, se aplico Prettier solo a archivos
  modificados/agregados por este PR y el check dirigido paso.
- No se corrio un servidor local ni se hizo QA visual en este PR porque el
  alcance fue documentacion y fuente de verdad.

## Riesgos tecnicos

- Seguridad multi-tenant aun no esta completamente verificada: el guard actual
  no valida membership contra DB.
- CUIT/CUIL esta requerido en el codigo actual aunque el MVP lo define opcional.
- Falta store de onboarding y redireccion a dashboard al finalizar.
- No existe core legal en Prisma ni backend: clientes, causas, documentos,
  tareas y notificaciones.
- No existe abstraccion `StorageProvider`.
- Vulnerabilidades npm pendientes de triage.
- No hay `DATABASE_URL` local para probar migraciones.

## Fuente de verdad tecnica

- Implementado hoy: `packages/database/prisma/schema.prisma`.
- Dominio objetivo: `docs/diagrams/temis-er.puml`.
- Plan y alcance: `docs/product/ROADMAP.md` y `docs/product/MVP_SCOPE.md`.
- Gaps: `docs/database/gaps.md`.

## Comunicados de plataforma

Las altas, ediciones, publicaciones, programaciones y cancelaciones de comunicados generan registros en `platform_announcement_events` con actor, revisión y fecha. Los cambios de audiencia se ejecutan en la misma transacción que el comunicado para impedir estados parciales. Los comunicados no se eliminan físicamente desde la consola.

Las newsletters utilizan el mismo registro de eventos para creación, edición, carga de imágenes, programación, publicación y cancelación. Las lecturas se registran por usuario y revisión en `platform_announcement_reads`; la lectura no representa aceptación de políticas. Los archivos se asocian a un borrador global y se sirven a usuarios de estudios únicamente cuando la publicación está vigente, dirigida a su estudio y hace referencia al archivo.
