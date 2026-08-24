# Database source of truth

Este documento define como interpretar las fuentes de base de datos hasta que
los modelos MVP esten completos.

## Fuentes revisadas

- `packages/database/prisma/schema.prisma`: schema implementado y migrable hoy.
- `packages/database/prisma/migrations/20260611125720_onboarding_foundation/migration.sql`:
  migracion inicial existente.
- `docs/diagrams/bogaap-er.puml`: modelo objetivo amplio del dominio.
- `docs/diagrams/bogaap-er-notes.md`: reglas de diseno del ERD.
- `TODO.md`: inventario historico.
- Backend actual en `apps/api/src`.
- Frontend actual en `apps/web/app/onboarding`.

## Autoridad actual

1. Para codigo ejecutable y migraciones actuales, la autoridad es Prisma.
2. Para direccion de dominio, la autoridad es el ERD PlantUML y este documento.
3. Para planificacion, la autoridad es `docs/product/ROADMAP.md` y
   `docs/github/ISSUES_BACKLOG.md`.
4. Si hay conflicto, documentarlo en `docs/database/gaps.md` antes de tocar
   Prisma.

## Entidades implementadas en Prisma

- `Tenant` -> `tenants`
- `User` -> `users`
- `TenantProfile` -> `tenant_profiles`
- `TenantSettings` -> `tenant_settings`
- `PracticeAreaTemplate` -> `practice_area_templates`
- `PracticeArea` -> `practice_areas`
- `Province` -> `provinces`
- `ForumTemplate` -> `forum_templates`
- `JudicialCenter` -> `judicial_centers`
- `JudicialCenterForum` -> `judicial_center_forums`
- `Client` -> `clients` (definido en Prisma en #19; migracion pendiente en #20)
- `Case` -> `cases`
- `CaseParticipant` -> `case_participants`
- `DocumentCategory` -> `document_categories`
- `DocumentFolder` -> `document_folders`
- `Document` -> `documents`
- `DocumentImportJob` -> `document_import_jobs`
- `DocumentImportItem` -> `document_import_items`
- `CaseTask` -> `case_tasks`
- `CaseExpense` -> `case_expenses`
- `CaseExpenseAttachment` -> `case_expense_attachments`
- `CaseExpenseCashboxSyncJob` -> `case_expense_cashbox_sync_jobs`
- `NotificationReminder` -> `notification_reminders`
- `NotificationReminderRecipient` -> `notification_reminder_recipients`
- `AsyncOutboxEvent` -> `async_outbox_events`
- `Currency` -> `currencies`
- `GlobalFinanceCategory` -> `global_finance_categories`
- `TenantFinanceCategory` -> `tenant_finance_categories`
- `CashboxMovement` -> `cashbox_movements`
- `Role` -> `roles`
- `Permission` -> `permissions`
- `RolePermission` -> `role_permissions`
- `TenantMembership` -> `tenant_memberships`
- `AiChatRun` -> `ai_chat_runs`
- `AiLegalDocument` -> `ai_legal_documents`
- `AiLegalDocumentVersion` -> `ai_legal_document_versions`
- `AiLegalNormUnit` -> `ai_legal_norm_units`
- `AiLegalNormChunk` -> `ai_legal_norm_chunks`

## Entidades objetivo del ERD aun no implementadas

MVP:

- `opposing_parties`
- `task_responsibles`

Post-MVP o despues del core legal:

- `expense_categories`
- `expenses`
- `current_accounts`
- `account_movement_categories`
- `account_movements`
- `cash_movement_categories`
- `audit_logs`

## Reglas obligatorias

- Toda entidad operativa debe llevar `tenant_id` o relacion obligatoria con una
  entidad tenant-scoped.
- `clients` es tenant-aware mediante `tenant_id` y pertenece a `tenants`.
- `opposing_parties` sigue siendo una entidad separada de `clients`; no mezclar
  partes contrarias con clientes del estudio.
- `case_participants` permite cargar sujetos procesales manuales en v1 mediante
  `participant_kind`, `display_name`, `role` y datos de contacto. `client_id`
  queda opcional para vincular clientes existentes; `opposing_parties` se
  mantiene como entidad futura separada.
- `case_tasks` representa tareas operativas tenant-scoped asociadas a un
  expediente; no almacena costos contables.
- `case_expenses` representa gastos tenant-scoped del expediente. Puede
  asociarse opcionalmente a una tarea mediante `task_id`; guarda `currency_code`
  como moneda activa del estudio y las metricas de gastos del expediente se
  calculan desde esta tabla, excluyendo gastos cancelados.
- `case_expense_attachments` representa comprobantes privados asociados a gastos.
  Guarda metadata tenant-scoped y el `object_key` del storage S3-compatible; el
  acceso al archivo se resuelve desde API, no exponiendo bucket/key al frontend.
- `document_categories` representa categorias configurables tenant-scoped para
  ordenar documentos. En v1 la categoria es opcional.
- `document_folders` representa carpetas jerarquicas tenant-scoped de la
  biblioteca del estudio. Los nombres son unicos por tenant y carpeta padre,
  comparados case-insensitive desde indice funcional de PostgreSQL.
- `documents` representa archivos privados de la biblioteca del estudio. Guarda
  metadata tenant-scoped, carpeta opcional, expediente opcional, categoria
  opcional y referencia privada S3-compatible; upload, preview y download se
  resuelven por API proxy sin exponer bucket/key al frontend. `status =
deleting` oculta documentos cuyo borrado definitivo esta esperando cleanup de
  storage.
- `document_storage_cleanup_jobs` es el outbox durable para borrar objetos del
  storage externo sin depender de una transaccion distribuida con PostgreSQL.
  Los workers reclaman jobs de forma atomica con locks de base de datos para
  soportar multiples instancias.
- `document_import_jobs` y `document_import_items` registran importaciones
  masivas tenant-scoped desde carpetas locales. El job conserva progreso y cada
  item documenta resultado por archivo (`completed`, `skipped_duplicate`,
  `rejected`, `failed`, `canceled`) sin mezclar datos entre estudios.
- `case_expense_cashbox_sync_jobs` es un outbox persistente tenant-scoped para
  sincronizar gastos pagados con caja. Cada gasto tiene como maximo un job activo
  por `case_expense_id`; los fallos guardan `last_error`, incrementan
  `attempts` y quedan disponibles para reintento sin bloquear la edicion del
  gasto.
- `notification_reminders` es el outbox persistente tenant-scoped para
  recordatorios in-app de tareas, gastos, audiencias y futuras reuniones. Cada
  recurso tiene como maximo un recordatorio activo por tenant, programado con
  `scheduled_at`/`next_run_at`, estado operativo, intentos y error normalizado.
- `notification_reminder_recipients` materializa los destinatarios al momento de
  programar el recordatorio. Soporta destinatarios por creador, tenant completo,
  area de trabajo o miembros especificos; el inbox consulta por
  `tenant_id`, `recipient_membership_id` y `read_at`.
- `ai_chat_runs` registra auditoria minima tenant-scoped de ejecuciones IA.
  Guarda metadata operativa, modelo, herramienta, tokens, estado y error
  normalizado; no guarda prompts ni respuestas completas.
- La base IA usa `pgvector` mediante la extension PostgreSQL `vector`.
  Prisma representa embeddings como `Unsupported("vector(1536)")`; las busquedas
  vectoriales deben hacerse con SQL parametrizado y siempre filtradas por tenant
  cuando el chunk no sea publico.
- `ai_legal_documents`, `ai_legal_document_versions`,
  `ai_legal_norm_units` y `ai_legal_norm_chunks` representan el corpus legal
  vectorizable. Las filas con `tenant_id = null` son corpus publico compartido;
  las filas con `tenant_id` son privadas del estudio y quedan protegidas por
  RLS.
- La chunkificacion normativa no usa tamano fijo como criterio primario. La
  unidad estable es `ai_legal_norm_units` y el chunk tecnico de embedding vive
  en `ai_legal_norm_chunks`. La regla inicial es una unidad normativa por chunk
  cuando sea posible: no mezclar leyes, articulos ni versiones normativas dentro
  de un mismo chunk.
- `users` es global y no lleva `tenant_id`.
- `currencies` es global y no lleva `tenant_id`.
  El catalogo global guarda `name`, `code`, `symbol` y `active`; los tenants lo
  referencian desde configuraciones y futuros modulos financieros.
- `global_finance_categories` es catalogo global read-only para tenants.
  `tenant_finance_categories` guarda categorias custom del estudio con
  `tenant_id`; ambas usan `kind` (`income`, `expense`, `both`) para futuros
  filtros de caja, gastos y cuenta corriente.
- `cashbox_movements` representa los movimientos tenant-scoped de caja
  multimoneda. Ingresos y egresos pueden referenciar categorias globales o del
  estudio mediante validacion de aplicacion; conversiones se guardan como dos
  movimientos vinculados por `conversion_group_id`. Los movimientos creados por
  gastos de expediente guardan `case_expense_id`, se administran desde
  expedientes y exponen un link de lectura hacia `/admin/cases/[uuid]`.
- En conversiones, el operador ingresa una cotizacion manual legible, por
  ejemplo `1 USD = 1500 ARS`. La aplicacion calcula la tasa efectiva
  origen-destino y la guarda como snapshot en `cashbox_movements.exchange_rate`;
  no existe catalogo persistente de tasas.
- `permissions` es catalogo global. `roles` mezcla roles de sistema globales
  (`tenant_id = null`) y roles custom por estudio (`tenant_id` definido).
  `roles.active` define si un rol esta disponible para nuevas asignaciones.
- `tenant_memberships.role_id` puede quedar null cuando un rol custom se
  desactiva o elimina; eso representa personal sin rol asignado.
- `PracticeAreaTemplate` es catalogo global; `PracticeArea` representa las areas
  disponibles para un tenant, sean derivadas del catalogo o custom.
- `Province` es catalogo global seeded; no se modifica desde la app.
- `Province.case_catalog_strategy` define la estrategia de captura judicial en
  expedientes. `manual` usa centro judicial texto + fuero por provincia;
  `center_forum` usa centros judiciales catalogados y tabla puente
  centro-fuero.
- `ForumTemplate` representa fueros del sistema asociados a una provincia; todos
  los tenants consumen este catalogo global directamente.
- `JudicialCenter` representa centros judiciales globales asociados a una
  provincia. `JudicialCenterForum` es la tabla puente que habilita fueros por
  centro judicial sin duplicar `ForumTemplate`.
- En expedientes, `Case.judicial_center_forum_id` referencia opcionalmente la
  combinacion centro-fuero cuando la provincia usa strategy `center_forum`.
  `Case.judicial_center_text` guarda el centro manual para provincias con
  strategy `manual`. `court` queda como texto ingresado por el usuario hasta
  modelar juzgados/tribunales.
- La asignacion de areas de trabajo a miembros del tenant vive en
  `tenant_membership_practice_areas`.
- Evitar arrays de IDs como columnas; usar relaciones 1:N o tablas puente.
- Las FK entre entidades operativas deben impedir cruces de tenant mediante FK
  compuestas o validacion transaccional en aplicacion.
- Toda modificacion de Prisma requiere migracion.
- La regla general de migraciones no se debilita: PR #19 fue una excepcion
  documentada porque solo definio el modelo `Client` previo a su migracion.
- PR #20 debe generar y validar inmediatamente la migracion Prisma para
  `clients`.
- Backend/API no debe usar `Client` hasta que PR #20 este resuelta.

## MVP vs post-MVP

MVP obligatorio:

- Tenancy y RBAC.
- Onboarding de tenant.
- Clientes y partes contrarias.
- Causas y participantes.
- Documentos basicos.
- Tareas y notificaciones basicas.

Post-MVP:

- Finanzas avanzadas.
- Caja completa.
- Cuenta corriente avanzada.
- Integraciones externas.
- Facturacion SaaS.
- IA.

## Decisiones de naming pendientes

- Producto publico: BogApp.
- Paquetes internos actuales: `@bogaap/*`.
- ERD actual: `bogaap-er`.
- La alineacion de marca debe hacerse en una tarea dedicada.

## Plan de migraciones

1. PR 1: documentar fuente de verdad y gaps. Sin cambios Prisma.
2. PR 2/3: alinear contratos de onboarding, sin agregar dominios grandes.
3. PR #19: definir `Client` tenant-aware en Prisma, sin generar migracion como
   excepcion documentada previa a la migracion.
4. PR #20: generar y validar inmediatamente la migracion Prisma para `clients`.
5. PRs posteriores: agregar finanzas e integraciones por dominio.

## Estado de comandos

- `npm run db:generate`: paso despues de permitir descarga del query engine de
  Prisma.
- `npm run db:migrate`: falla localmente por falta de `DATABASE_URL`.
- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `npm run test:e2e`: pasa para 5 tests de auth.
