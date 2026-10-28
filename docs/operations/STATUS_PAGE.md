# Página pública de estado

`https://status.temis.ar` es el plano público de comunicación de disponibilidad
de Temis. Se ejecuta fuera del VPS principal para continuar accesible durante
una interrupción completa.

## Responsabilidades

- **OpenStatus** ejecuta monitores, calcula disponibilidad y almacena incidentes,
  actualizaciones y mantenimientos.
- **Vercel** sirve `apps/status` y consume el feed JSON público de OpenStatus.
- **Temis API** sólo expone chequeos agregados, sin autenticación ni información
  interna, bajo `/api/health/*`.
- **Super Admin** conserva la observabilidad técnica privada. No es la fuente de
  la página pública.

## Configuración de OpenStatus

Crear una página pública llamada `Temis` con historial de 30 días. Los nombres de
los componentes deben coincidir exactamente con esta tabla; la aplicación ignora
cualquier componente adicional para no publicar infraestructura interna.

| Componente                     | URL                                            | Frecuencia | Regiones     | Intentos |
| ------------------------------ | ---------------------------------------------- | ---------- | ------------ | -------- |
| Aplicación web                 | `https://temis.ar/login`                       | 10 min     | `gru`, `iad` | 3        |
| API                            | `https://temis.ar/api/health`                  | 10 min     | `gru`, `iad` | 3        |
| Inicio de sesión               | `https://temis.ar/api/health/authentication`   | 10 min     | `gru`, `iad` | 3        |
| Documentos                     | `https://temis.ar/api/health/documents`        | 10 min     | `gru`, `iad` | 3        |
| Notificaciones e integraciones | `https://temis.ar/api/health/async-processing` | 10 min     | `gru`, `iad` | 3        |

Para los cuatro endpoints JSON exigir HTTP `200` y que el cuerpo contenga
`"status":"operational"`. Para la aplicación web exigir HTTP `200` y el texto
`Temis`. Configurar un umbral de latencia degradada de 2 segundos para web, API y
autenticación, y de 4 segundos para documentos y procesamiento asíncrono.

Copiar la URL pública terminada en `/feed/json`; no generar ni almacenar una API
key en la aplicación de estado.

## Despliegue independiente en Vercel

1. Importar el repositorio como un proyecto nuevo con Root Directory
   `apps/status` y habilitar la inclusión de archivos externos al directorio raíz
   para resolver `packages/brand-ui` y el lockfile del monorepo.
2. Usar Node.js 22 y los comandos del workspace:
   - Install: `cd ../.. && npm install`
   - Build: `cd ../.. && npm run build --workspace @temis/status`

   La app usa el builder Webpack de Next.js para evitar depender del runtime
   experimental de Turbopack durante el build de Vercel.

3. Configurar en Preview y Production:
   - `OPENSTATUS_FEED_URL=https://<slug>.openstatus.dev/feed/json`
   - `NEXT_PUBLIC_STATUS_SITE_URL=https://status.temis.ar`
   - `NEXT_PUBLIC_MAIN_APP_URL=https://temis.ar`
4. Asociar `status.temis.ar` al proyecto y crear en DNS el CNAME exacto indicado
   por Vercel. No crear un bloque Nginx para este host.
5. Verificar `/`, `/historial`, un detalle `/incidentes/<id>` y el footer antes de
   promover Production.

La página regenera contenido cada 60 segundos. Si una regeneración falla, Vercel
conserva la última versión válida; un arranque sin feed muestra un estado
desconocido y nunca afirma que los sistemas funcionan.

## Comunicación de incidentes

Los incidentes se administran exclusivamente en OpenStatus para que el equipo
pueda comunicar aun cuando Temis esté caído.

1. Confirmar el impacto antes de publicar; una alerta automática no obliga a
   comunicar si es un falso positivo.
2. Crear un status report con título orientado al usuario y los componentes
   afectados.
3. Publicar actualizaciones breves con la secuencia `Investigando`,
   `Identificado`, `Monitoreando` y `Resuelto`.
4. Usar `degraded_performance`, `partial_outage` o `major_outage` según el impacto
   real. Al resolver, devolver todos los componentes a `operational`.
5. Para tareas planificadas, crear un mantenimiento con inicio, fin y componentes;
   no abrir un incidente salvo que el trabajo exceda la ventana o provoque una
   falla no prevista.

No publicar nombres de hosts, bases, colas, buckets, credenciales, trazas,
identificadores de tenants ni datos de expedientes.

## Verificación y respuesta a fallas

- Si el VPS no responde, `status.temis.ar` debe seguir cargando desde Vercel y el
  siguiente ciclo de 10 minutos, más reintentos, debe reflejar la interrupción.
- Si OpenStatus no responde, comprobar que Vercel conserva el último render. En
  un despliegue frío la UI debe indicar “Estado temporalmente desconocido”.
- Si sólo falla la página de estado, revisar primero Vercel y DNS; no modificar el
  VPS ni el certificado principal.
- Los endpoints públicos deben responder únicamente `component`, `status` y
  `checkedAt`. Cualquier detalle adicional es una regresión de seguridad.
