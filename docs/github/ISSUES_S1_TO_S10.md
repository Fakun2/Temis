# Temis - Catalogo de issues S1 a S10

Backlog operativo para crear issues reales y cargarlas al Project. El campo `Depends on` define la correlatividad minima.

| ID | Issue | Sprint | Priority | Area | Depends on | Branch sugerida | Criterio clave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BOG-001 | Rediseñar paleta login/register para demo cliente | S1 - Demo login/register | P0 | web, auth | - | feature/auth-ui-client-palette | Paleta centralizada en globals.css o tokens reutilizables. |
| BOG-002 | Reemplazar copy generico por lenguaje legaltech | S1 - Demo login/register | P0 | web, auth | BOG-001 | feature/auth-copy-legaltech | No quedan frases en ingles como Maximum Customization/User-Friendly Interface. |
| BOG-003 | Unificar layout visual de login y register | S1 - Demo login/register | P1 | web, auth | BOG-001 | feature/auth-layout-unification | Login usa composicion premium equivalente a register. |
| BOG-004 | QA rapido de demo login/register | S1 - Demo login/register | P0 | qa, web | BOG-001,BOG-002,BOG-003 | test/auth-ui-demo-check | Crear cuenta renderiza sin errores. |
| BOG-005 | Auditar contrato actual de autenticacion | S2 - Autenticacion | P0 | auth, api, web | BOG-004 | chore/auth-contract-audit | Mapa de endpoints auth documentado. |
| BOG-006 | Endurecer validaciones de register/login | S2 - Autenticacion | P0 | auth, web, api | BOG-005 | feature/auth-validation-hardening | Email laboral validado. |
| BOG-007 | Proteger rutas privadas del frontend | S2 - Autenticacion | P0 | web, auth | BOG-005 | feature/web-protected-routes | Usuario no autenticado vuelve a login. |
| BOG-008 | Implementar reset password MVP | S2 - Autenticacion | P1 | auth, web, api | BOG-005,BOG-006 | feature/auth-reset-password | Pantalla solicitar reset. |
| BOG-009 | Definir roles y permisos MVP | S2 - Autenticacion | P0 | rbac, auth | BOG-005 | docs/rbac-mvp-matrix | Matriz por recurso y accion. |
| BOG-010 | Aplicar tenant context por request | S2 - Autenticacion | P0 | tenant, api | BOG-009 | feature/tenant-context-request | tenantId validado contra membership. |
| BOG-011 | Aplicar guards RBAC en rutas protegidas | S2 - Autenticacion | P0 | rbac, api | BOG-009,BOG-010 | feature/rbac-guards | Decoradores o estrategia clara de permisos. |
| BOG-012 | Tests S2 autenticacion | S2 - Autenticacion | P1 | qa, auth | BOG-006,BOG-007,BOG-010,BOG-011 | test/auth-s2-coverage | Tests backend login/register/guard. |
| BOG-013 | Definir modelo cliente tenant-aware | S3 - Gestion de Clientes | P0 | database, clients | BOG-010 | feature/client-model | Campos MVP definidos: nombre, tipo, documento, email, telefono, domicilio, notas, estado. |
| BOG-014 | Crear migracion Prisma para clientes | S3 - Gestion de Clientes | P0 | database, clients | BOG-013 | feature/client-prisma-migration | Migracion creada. |
| BOG-015 | API CRUD clientes | S3 - Gestion de Clientes | P0 | api, clients | BOG-014,BOG-011 | feature/client-crud-api | POST/GET/PATCH/DELETE o equivalente. |
| BOG-016 | Busqueda y filtros de clientes | S3 - Gestion de Clientes | P0 | api, clients | BOG-015 | feature/client-search-api | Busqueda por nombre/documento/email. |
| BOG-017 | Historial de cliente backend | S3 - Gestion de Clientes | P1 | api, clients | BOG-015 | feature/client-history-api | Creacion/edicion/eliminacion generan evento o registro auditable. |
| BOG-018 | UI listado de clientes | S3 - Gestion de Clientes | P0 | web, clients | BOG-015,BOG-016 | feature/client-list-ui | Tabla/lista responsive. |
| BOG-019 | UI alta/edicion de cliente | S3 - Gestion de Clientes | P0 | web, clients | BOG-015 | feature/client-form-ui | Crear cliente exitoso. |
| BOG-020 | UI detalle de cliente con historial | S3 - Gestion de Clientes | P1 | web, clients | BOG-017,BOG-018 | feature/client-detail-history-ui | Datos principales visibles. |
| BOG-021 | Tests S3 clientes | S3 - Gestion de Clientes | P1 | qa, clients | BOG-015,BOG-018,BOG-019 | test/clients-s3-coverage | Tests backend service/controller. |
| BOG-022 | Modelo expedientes/casos | S4-S5 - Expedientes | P0 | database, cases | BOG-014 | feature/case-model | Campos MVP definidos: caratula, numero, jurisdiccion, fuero, estado, fechas. |
| BOG-023 | API CRUD expedientes | S4-S5 - Expedientes | P0 | api, cases | BOG-022,BOG-011 | feature/case-crud-api | CRUD tenant-aware. |
| BOG-024 | UI expedientes listado y formulario | S4-S5 - Expedientes | P0 | web, cases | BOG-023,BOG-018 | feature/case-ui | Listado con filtros. |
| BOG-025 | Timeline de expediente | S4-S5 - Expedientes | P1 | cases, web, api | BOG-023 | feature/case-timeline | Eventos manuales basicos. |
| BOG-026 | Modelo y metadatos de documentos | S4-S5 - Expedientes | P1 | documents, database | BOG-022 | feature/document-model | Modelo definido. |
| BOG-027 | Upload/download documentos MVP | S4-S5 - Expedientes | P2 | documents, api, web | BOG-026 | feature/document-upload-mvp | Upload basico. |
| BOG-028 | Modelo caja estudio y movimientos | S6 - Caja Estudio | P1 | finance, database | BOG-014 | feature/finance-model | Ingresos/gastos basicos. |
| BOG-029 | API caja estudio | S6 - Caja Estudio | P1 | finance, api | BOG-028,BOG-011 | feature/finance-api | Crear/listar movimientos. |
| BOG-030 | UI caja estudio y reportes simples | S6 - Caja Estudio | P1 | finance, web | BOG-029 | feature/finance-ui | Listado movimientos. |
| BOG-031 | Modelo caja socio/liquidaciones | S7 - Caja Socio | P2 | finance, database | BOG-028 | feature/partner-ledger-model | Modelo de socio o participante financiero definido. |
| BOG-032 | UI liquidaciones socios | S7 - Caja Socio | P2 | finance, web | BOG-031 | feature/partner-ledger-ui | Listado por socio. |
| BOG-033 | Modelo tareas y vencimientos | S8 - Tareas y Calendar | P1 | tasks, database | BOG-022 | feature/task-model | Responsable, fecha limite, estado, prioridad. |
| BOG-034 | API y UI tareas MVP | S8 - Tareas y Calendar | P1 | tasks, api, web | BOG-033 | feature/tasks-mvp | CRUD tareas. |
| BOG-035 | Preparar integracion Google Calendar | S8 - Tareas y Calendar | P2 | integrations, tasks | BOG-034 | docs/google-calendar-plan | Decision tecnica documentada. |
| BOG-036 | Preparar integracion Google Drive | S9 - Google Drive | P2 | integrations, documents | BOG-027 | docs/google-drive-plan | Estructura tenant/cliente/expediente definida. |
| BOG-037 | Adapter storage provider | S9 - Google Drive | P2 | documents, api | BOG-036 | feature/storage-provider-adapter | Interfaz StorageProvider. |
| BOG-038 | CI typecheck lint build | S10 - Testing y Deploy | P1 | infra, qa | BOG-012,BOG-021 | chore/ci-validation | Typecheck web/api/packages. |
| BOG-039 | Checklist deploy produccion | S10 - Testing y Deploy | P1 | infra | BOG-038 | docs/deploy-checklist | Variables env listadas. |
| BOG-040 | Documentacion final cliente | S10 - Testing y Deploy | P1 | docs | BOG-030,BOG-034,BOG-039 | docs/client-final-documentation | Resumen modulos implementados. |

## Reglas de uso

- Cada fila debe convertirse en una issue real de GitHub.
- Si `Depends on` tiene IDs, la issue queda en `Blocked` hasta que esas dependencias esten cerradas o haya contrato documentado.
- Cada PR debe referenciar la issue y adjuntar evidencia tecnica.
- Las issues P0 de S1/S2/S3 tienen prioridad sobre modulos posteriores.

## Foco inmediato

1. Cerrar `BOG-001` a `BOG-004` para la demo de login/register.
2. Ejecutar S2 con `BOG-005` a `BOG-012`.
3. Ejecutar S3 con `BOG-013` a `BOG-021`.
4. Recien despues tomar expedientes, documentos, caja e integraciones.
