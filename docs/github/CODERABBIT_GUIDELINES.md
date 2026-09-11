# CodeRabbit Guidelines - Temis

## Contexto del producto

Temis es un SaaS B2B para estudios jurídicos. El sistema debe permitir gestionar estudios, usuarios, roles, clientes, expedientes, documentos, tareas, calendario, caja y reportes.

## Prioridades de revisión

CodeRabbit debe priorizar:

1. Seguridad y privacidad de datos jurídicos.
2. Separación multi-tenant.
3. Validaciones consistentes entre frontend y backend.
4. Código mantenible para equipo de 2 desarrolladores.
5. PRs pequeños, revisables y linkeados a issues.
6. No mezclar sprints ni módulos en una misma PR.

## Reglas para backend

- Todo endpoint operativo debe validar usuario autenticado.
- Toda entidad operativa debe respetar tenantId.
- No permitir acceso cross-tenant.
- Usar DTOs y validaciones explícitas.
- Los errores deben ser claros y consistentes.
- Evitar lógica de negocio pesada en controllers.

## Reglas para frontend

- Cada pantalla debe manejar loading, error y empty state.
- Los formularios deben validar antes de enviar.
- El copy debe hablar en términos jurídicos: estudio, cliente, expediente, tarea, vencimiento, caja.
- Evitar componentes demasiado grandes.
- Mantener una estética LegalTech profesional.

## Reglas para Prisma/base de datos

- No crear entidades operativas sin relación con tenant.
- Agregar índices para búsquedas por tenant, nombre, documento, estado y fechas cuando aplique.
- Evitar migraciones destructivas sin explicación.
- Revisar relaciones y cascadas antes de aprobar.

## Reglas para PRs

Cada PR debe incluir:

- Issue linkeada con `Closes #N` o `Refs #N`.
- Resumen del cambio.
- Evidencia de validación.
- Capturas si modifica UI.
- Comandos ejecutados.
- Notas de deuda técnica si queda algo pendiente.

## Criterio de rechazo

CodeRabbit debe marcar como riesgo cualquier PR que:

- mezcle frontend, backend y database sin necesidad;
- no respete dependencias de issues;
- implemente clientes o expedientes sin tenant;
- modifique autenticación sin tests o validación manual clara;
- toque `package-lock.json` sin justificación;
- agregue lógica sensible sin controles de acceso.
