# MVP scope

Este documento define el alcance minimo profesional de Temis. Todo lo que no
este aca debe tratarse como post-MVP salvo decision explicita.

## Incluido en MVP

- Tenant onboarding.
- Auth.
- RBAC base por tenant.
- Clientes juridicos.
- Expedientes / causas.
- Participantes de causas.
- Documentos basicos.
- Tareas basicas.
- Notificaciones basicas.
- Dashboard inicial.
- Storage provider con local para desarrollo y proveedor productivo preparado.
- Multitenancy desde el dia cero.

## No incluido en MVP

- Caja completa.
- Cuenta corriente avanzada.
- Caja socio.
- Google Calendar.
- Google Drive como storage principal.
- IA.
- Facturacion SaaS productiva.
- Planes de pago productivos.

## Criterios MVP

- Ninguna entidad operativa queda sin `tenantId` o sin relacion obligatoria con
  tenant.
- Ninguna query operativa accede a datos sin filtro de tenant.
- El alta de estudio crea tenant, owner, membership owner, roles base,
  configuracion y areas iniciales en una operacion consistente.
- El MVP puede usarse por un estudio piloto sin bloquear la arquitectura
  multi-tenant.

## Regla de corte

Si una funcionalidad no es necesaria para crear, proteger y operar clientes,
causas, documentos, tareas y notificaciones basicas, queda post-MVP.
