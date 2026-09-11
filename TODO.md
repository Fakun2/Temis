# TEMIS TODO

Inventario historico basado en `docs/diagrams/temis-er.puml`.

La fuente de verdad actual para planificacion esta en:

- `docs/product/ROADMAP.md`
- `docs/product/MVP_SCOPE.md`
- `docs/database/DATABASE_SOURCE_OF_TRUTH.md`
- `docs/database/gaps.md`
- `docs/github/ISSUES_BACKLOG.md`

Mantener este archivo solo como referencia heredada hasta cerrar la migracion de
roadmap a issues/milestones.

## 1. Base SaaS multitenant

- [ ] Crear estructura base del proyecto.
- [ ] Configurar entorno TypeScript.
- [ ] Configurar variables de entorno.
- [ ] Modelar `tenants`.
- [ ] Modelar `users`.
- [ ] Modelar `roles`.
- [ ] Modelar `tenant_memberships`.
- [ ] Permitir que un usuario pertenezca a varios estudios juridicos.
- [ ] Permitir roles distintos por usuario y tenant.

## 2. RBAC y seguridad de acceso

- [ ] Crear contexto de tenant activo por request.
- [ ] Crear middleware/guard para validar `tenant_id`.
- [ ] Crear validacion de permisos por rol.
- [ ] Filtrar todas las consultas operativas por `tenant_id`.
- [ ] Impedir acceso cruzado entre estudios juridicos.
- [ ] Definir roles iniciales: `owner`, `admin`, `lawyer`, `paralegal`, `accounting`, `viewer`.

## 3. Clientes juridicos y contrarios

- [ ] Modelar `clients`.
- [ ] Soportar `clients.type`: `human` y `legal_entity`.
- [ ] Modelar `opposing_parties`.
- [ ] Modelar `practice_areas`.
- [ ] Crear CRUD de clientes juridicos.
- [ ] Crear CRUD de partes contrarias.
- [ ] Crear CRUD de areas del estudio.

## 4. Causas / expedientes

- [ ] Modelar `cases`.
- [ ] Modelar `case_participants`.
- [ ] Crear causa con cliente principal.
- [ ] Asociar participantes a una causa.
- [ ] Registrar caratula, carpeta, objeto, numero, jurisdiccion, fuero, radicacion e instancia.
- [ ] Listar causas por tenant, cliente, estado y area.

## 5. Documentos

- [ ] Modelar `document_categories`.
- [ ] Modelar `documents`.
- [ ] Asociar documentos a causas.
- [ ] Asociar documentos opcionalmente a clientes.
- [ ] Registrar metadatos de archivo y usuario que sube el documento.
- [ ] Definir proveedor de almacenamiento.

## 6. Tareas y notificaciones

- [ ] Modelar `tasks`.
- [ ] Modelar `task_responsibles`.
- [ ] Modelar `notifications`.
- [ ] Crear tareas con emisor, supervisor opcional y vencimiento.
- [ ] Asignar multiples responsables por tarea.
- [ ] Crear notificaciones asociadas a causas.
- [ ] Listar vencimientos proximos por tenant y usuario.

## 7. Gastos

- [ ] Modelar `expense_categories`.
- [ ] Modelar `expenses`.
- [ ] Registrar gastos por causa.
- [ ] Asociar gastos opcionalmente a cliente y contrario.
- [ ] Filtrar gastos por tenant, causa, cliente, categoria y fecha.

## 8. Cuenta corriente del cliente

- [ ] Modelar `currencies` como catalogo global.
- [ ] Modelar `current_accounts`.
- [ ] Modelar `account_movement_categories`.
- [ ] Modelar `account_movements`.
- [ ] Crear cuenta corriente 1:1 por cliente dentro del tenant.
- [ ] Registrar movimientos con moneda, factura, importe y saldo resultante.

## 9. Caja del estudio

- [ ] Modelar `cash_boxes`.
- [ ] Modelar `cash_movement_categories`.
- [ ] Modelar `cash_movements`.
- [ ] Registrar ingresos y egresos directos.
- [ ] Asociar movimientos de caja opcionalmente a cliente y causa.
- [ ] Separar caja del estudio de cuenta corriente del cliente.

## Prioridad MVP

- [ ] Multitenancy + usuarios + RBAC.
- [ ] Clientes juridicos.
- [ ] Causas / expedientes.
- [ ] Participantes de causa.
- [ ] Documentos basicos.
- [ ] Tareas y notificaciones.
- [ ] Gastos simples.
- [ ] Cuenta corriente.
- [ ] Caja del estudio.
