# Temis: identidad y despliegue

Nombre definitivo: **Temis**. Dominio: **https://temis.ar**.
La interfaz, metadatos, asistente IA, paquetes `@temis/*`, estilos, cliente
API generado, scripts y documentacion usan la nueva marca.

## Compatibilidad conservada

Las siguientes referencias son contratos tecnicos existentes, no marca publica:

- Cookies, localStorage y prefijo Redis de sesiones `bogaap.*` y preferencias
  de tema: mantienen sesiones y preferencias existentes.
- Proyecto Compose, nombres de contenedores, base PostgreSQL, credenciales de
  desarrollo, bucket y colas `bogaap.*`, y `CONTAINER_PREFIX=justinia-prod` en
  el ejemplo de produccion: mantienen acceso a los mismos recursos y volumenes.
  Los scripts Docker mantienen el mismo proyecto y staging por ese motivo.
- `AI_MODEL_JUSTINIA_LEGAL` y `AI_MODEL_BOGAPP_LEGAL`: fallback del nuevo
  `AI_MODEL_TEMIS_LEGAL`. El ID publico es `temis-legal`; la API acepta tambien
  `justinia-legal` de clientes abiertos durante el despliegue y lo normaliza.
- Correos de demo existentes y filtro `Demo BogApp`: evitan duplicar usuarios;
  la limpieza reconoce tanto el nombre previo como `Demo Temis`.
- Codigos `BOG-###` del backlog: referencias historicas a issues existentes.

No se modifican migraciones historicas ni datos reales. Renombrar recursos
persistentes requiere una migracion con backup independiente de la marca.

## Actualizar una instalacion existente

1. Integrar este cambio y ejecutar `npm ci` para actualizar los enlaces de
   workspaces `@temis/*`. Reconstruir API, worker y web juntos.
2. Conservar el archivo de entorno actual y los valores de proyecto Compose,
   contenedores, PostgreSQL, MinIO y RabbitMQ. No reemplazarlo por el ejemplo.
3. Configurar `PUBLIC_DOMAIN=temis.ar`, `FRONTEND_PUBLIC_URL=https://temis.ar`,
   `API_PUBLIC_URL=https://temis.ar/api`,
   `API_CORS_ALLOWED_ORIGINS=https://temis.ar` y, si se define,
   `NEXT_PUBLIC_APP_URL=https://temis.ar`.
4. Apuntar DNS de `temis.ar` al servidor y emitir el certificado TLS para ese
   nombre antes de iniciar Nginx con `infra/nginx/nginx.prod.conf`.
5. Si se usa Google OAuth, agregar `https://temis.ar` a los origenes permitidos
   del cliente. Revisar las URI de redireccion que use la instalacion.
6. Verificar login, expedientes, documentos, notificaciones y chat IA.

Este commit configura archivos del repositorio. No modifica DNS, certificados,
variables del VPS ni configuracion externa de Google. Las sesiones de un dominio
anterior no se transfieren a otro dominio: el usuario debe iniciar sesion alli.
