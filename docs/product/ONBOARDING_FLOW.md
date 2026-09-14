# Onboarding flow

El onboarding visible tiene 3 pasos y debe respetar la direccion visual actual:
minimalista, fondo claro, cards blancas, bordes negros finos, botones negros,
inputs limpios, sidebar izquierda con progreso y panel principal derecho.

## Paso 1 - Identidad / Cuenta owner

Objetivo: crear o confirmar la identidad del owner del estudio.

Campos minimos:

- Nombre del owner.
- Email.
- Password si el usuario todavia no existe.
- Confirmacion de password si aplica.
- Aceptacion de terminos si aplica.

Reglas:

- El tenant se crea recien al finalizar onboarding.
- No crear tenant sin owner.
- Si auth ya existe antes del onboarding, el paso 1 puede confirmar la cuenta
  existente en vez de crear otra.
- Evitar que el owner quede como usuario suelto sin una continuacion clara hacia
  tenant.

## Paso 2 - Tenant / Estudio juridico

Titulo: `Estudio juridico`

Subtitulo: `Datos legales y ubicacion del estudio dentro del SaaS.`

Campos:

- Nombre comercial, obligatorio.
- Razon social / nombre legal, obligatorio.
- CUIT / CUIL, opcional en MVP.
- Pais, obligatorio.
- Provincia, obligatorio.
- Ciudad, obligatorio.
- Domicilio, opcional.
- Sitio web, opcional.
- Areas principales, separadas por coma.
- Como conocio Temis, opcional.

Reglas:

- Si CUIT/CUIL se completa, validar formato argentino basico.
- El resumen lateral actualiza estudio, provincia y areas.
- Mantener copy publico con marca Temis.

## Paso 3 - Configuracion / Workspace

Titulo: `Workspace`

Subtitulo: `Preferencias iniciales para operar causas, equipo y documentos.`

Campos:

- Areas de practica iniciales, obligatorio.
- Rol por defecto para invitaciones, obligatorio.
- Numeracion de causas, obligatorio.
- Almacenamiento de documentos, obligatorio.

Reglas:

- Boton principal: `Crear estudio`.
- Mostrar loading al crear.
- Mostrar error si falla.
- Redirigir al dashboard si se crea correctamente.

## Creacion final esperada

Al finalizar, el backend debe crear en transaccion:

- Tenant.
- Owner user si corresponde.
- Tenant membership owner.
- Rol owner.
- Roles base.
- Configuracion del workspace.
- Areas iniciales.
- Audit log inicial si existe entidad de auditoria.

## Gaps actuales detectados

- El frontend actual ya renderiza 3 pasos y envia a `/api/onboarding/start`.
- El backend actual tiene endpoint `POST /api/onboarding/start` transaccional.
- CUIT/CUIL esta requerido en frontend/backend actual, pero la decision de MVP
  lo define como opcional con validacion si se completa.
- Numeracion actual usa `manual` y `automatic`; la decision de producto pide
  `MANUAL` y `AUTO_SIMPLE` como conceptos de MVP.
- Storage actual contempla `local` y `s3`; la decision de producto pide
  abstraccion `StorageProvider` y preparar Supabase/S3 productivo.
