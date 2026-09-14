# Product decisions

Estas decisiones son fuente de verdad funcional para los proximos PRs.

## Marca

- Nombre definitivo: Temis (TEMIS en usos de marca en mayusculas).
- Dominio oficial: https://temis.ar.
- Paquetes internos: `@temis/*`.
- Las claves persistentes existentes se conservan por compatibilidad; no son marca publica.

## Owner y tenant

- El owner se crea o confirma en el paso 1.
- El tenant se crea recien al finalizar onboarding.
- Crear estudio debe crear tenant, membership owner, roles base, workspace
  settings y areas iniciales.
- No crear tenant sin owner.
- No dejar owner sin continuidad clara hacia tenant.

## CUIT / CUIL

- CUIT/CUIL es opcional en MVP.
- Si se completa, validar formato argentino basico.
- Sera obligatorio mas adelante para facturacion SaaS.

## Numeracion de causas

- La numeracion es configurable por tenant.
- MVP: `MANUAL` y `AUTO_SIMPLE`.
- Default: `MANUAL`.
- Post-MVP: prefijo, numeracion por anio, numeracion por area y formato
  personalizado.

## Almacenamiento de documentos

- Usar storage S3-compatible privado detras de la abstraccion backend.
- MVP: MinIO es el proveedor productivo recomendado y tambien el default local.
- Cloudflare R2 queda soportado por configuracion con `STORAGE_DRIVER=r2`.
- Upload, preview y download pasan por API proxy; no se exponen bucket ni keys
  al frontend.
- Google Drive queda post-MVP.

## MVP obligatorio

- Tenant onboarding.
- Auth.
- RBAC.
- Clientes.
- Expedientes / causas.
- Participantes.
- Documentos basicos.
- Tareas basicas.
- Notificaciones basicas.
- Dashboard inicial.

## Post-MVP

- Caja completa.
- Cuenta corriente avanzada.
- Caja socio.
- Google Calendar.
- Google Drive.
- IA.
- Facturacion SaaS.
- Planes de pago productivos.

## Multi-tenant

- La arquitectura es multi-tenant desde el dia cero.
- Todas las entidades operativas llevan tenant o relacion obligatoria con tenant.
- Todas las queries operativas filtran por tenant.
- Debe impedirse acceso cruzado entre estudios.

## Arquitectura

- Mantener monolito modular en NestJS.
- No migrar a microservicios en esta etapa.
- Crear limites claros por dominio para poder escalar despues.
