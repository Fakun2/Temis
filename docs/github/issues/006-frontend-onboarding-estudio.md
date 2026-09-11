# Frontend - onboarding paso 2 estudio juridico

Milestone: M1 - Tenant onboarding

Labels: `type:feature`, `area:web`, `area:onboarding`, `priority:p0`

## Objetivo

Implementar pantalla `Estudio juridico` respetando el diseno actual.

## Campos

- Nombre comercial.
- Razon social / nombre legal.
- CUIT / CUIL.
- Pais.
- Provincia.
- Ciudad.
- Domicilio.
- Sitio web.
- Areas principales.
- Como conocio Temis.

## Criterios de aceptacion

- Validacion con Zod.
- CUIT/CUIL opcional.
- CUIT/CUIL validado si se completa.
- Areas separadas por coma.
- Estado persistente entre pasos.
- Resumen lateral actualizado.
- Boton siguiente bloqueado si faltan campos obligatorios.

## Dependencias

- EPIC 03.
