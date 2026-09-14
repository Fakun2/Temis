# Architecture decisions

Este archivo registra decisiones tecnicas activas. Nuevas decisiones deben
agregarse aca antes de implementar cambios grandes.

## ADR-001 - Monorepo con Turborepo

Decision: mantener monorepo con npm workspaces.

Motivo: permite evolucionar backend, frontend, database y api-client con
contratos compartidos y comandos unificados.

Estado: aceptado.

## ADR-011 - Integracion unidireccional con Google Calendar

Decision: Google Calendar se integra por usuario y tenant, con OAuth separado
del login, calendario secundario `Justinia`, scopes minimos y flujo Justinia hacia
Google Calendar. Los tokens se cifran y las operaciones externas usan
outbox/RabbitMQ.

Motivo: mantiene la fuente de verdad en BogApp, limita la exposicion de datos
legales y permite reintentos sin bloquear la operacion del estudio.

Estado: aceptado para la integracion MVP.

La API conserva el handshake OAuth, RBAC, estado y outbox. Un unico
`apps/worker` ejecuta las llamadas a proveedores, renovacion de tokens,
provision de calendarios, sincronizacion, reintentos y desconexion. Los
mensajes contienen identificadores y nunca credenciales.

Las solicitudes de sincronización se guardan como `sync_requested`; el worker
reclama un lease antes de pasar a `syncing`. El worker recupera
sincronizaciones sin lease o vencidas como `error`, para que sean reintentables.
El mismo lease protege provisioning y se renueva entre recursos durante una
sincronización inicial. Una reconexión conserva el `calendarId` previo y lo
reclama de forma atómica: si ese calendario ya no existe o Google rechaza el
acceso, el proceso finaliza en `error` con un mensaje accionable, nunca queda
en un estado transitorio permanente.

## ADR-002 - Monolito modular en NestJS

Decision: mantener backend como monolito modular NestJS.

Motivo: el producto esta en etapa MVP y necesita limites claros por dominio sin
sobrecosto de microservicios.

Estado: aceptado.

## ADR-003 - PostgreSQL compartido multi-tenant

Decision: usar una sola base PostgreSQL compartida, con `tenant_id` como
frontera logica para entidades operativas.

Motivo: simplifica operacion inicial y mantiene escalabilidad SaaS B2B.

Estado: aceptado.

## ADR-004 - Prisma como schema ejecutable

Decision: Prisma es la fuente ejecutable para modelos y migraciones.

Motivo: schema tipado, migraciones versionadas y cliente TS.

Estado: aceptado.

## ADR-005 - Zod para validaciones de contrato

Decision: usar Zod en frontend y backend, con `nestjs-zod` para DTOs.

Motivo: reduce divergencia entre validacion de UI y API.

Estado: aceptado.

## ADR-006 - OpenAPI + Orval para cliente

Decision: generar cliente TypeScript desde OpenAPI con Orval.

Motivo: evita clientes manuales y mantiene contratos trazables.

Estado: aceptado.

## ADR-007 - RBAC base por tenant

Decision: roles globales y membresias por tenant. El rol efectivo de un usuario
se resuelve desde `tenant_memberships`.

Motivo: un usuario puede pertenecer a varios estudios con roles distintos.

Estado: aceptado.

## ADR-008 - Storage provider abstracto

Decision: documentos no deben acoplarse directamente a Google Drive.

Motivo: el MVP necesita local/dev y proveedor productivo preparado; Google Drive
queda como integracion post-MVP.

Estado: propuesto para PR documentos.

## ADR-009 - GitHub como sistema operativo del proyecto

Decision: roadmap, milestones, labels, issues y templates quedan documentados en
`docs/github` y `.github`.

Motivo: permite trabajar por PRs pequenos y coordinados.

Estado: aceptado.

## ADR-010 - Frontend por feature modules y query global

Decision: organizar pantallas complejas de `apps/web` como feature modules con
`_api`, `_components`, `_hooks`, `_types`, `_constants` y `_utils`, y consumir
datos del dashboard mediante `useDashboardQuery`.

Motivo: separa UI de logica de negocio, centraliza tenant/auth/permisos para
TanStack Query y mantiene componentes pequenos con un componente por archivo.

Estado: aceptado.

## ADR-012 - Biblioteca separada de archivos de dominio

Decision: `documents` y `document_folders` conservan storage compartido, pero
declaran un ambito obligatorio (`library` o `case`). La Biblioteca solo expone
recursos `library`; los archivos de expediente solo se operan desde el modulo
de expedientes. Los comprobantes de gastos permanecen en
`case_expense_attachments`.

Motivo: evita mezclar navegacion y permisos operativos sin migrar binarios ni
duplicar la infraestructura de storage.

Estado: aceptado.
