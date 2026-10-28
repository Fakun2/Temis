# Runbook de seguridad del panel Super Admin

## Frontera de acceso

- `https://temis.ar/admin` sirve el producto tenant.
- `https://temis.ar/superadmin` sirve el panel Super Admin y el enrolamiento;
  la aplicación no requiere otro host para seleccionar la sesión.
- Las cookies son host-only. En producción la cookie de plataforma es
  `__Host-temis-platform`, `Secure`, `HttpOnly` y `SameSite=Strict`.
- `PLATFORM_SECURITY_MODE` sólo admite `disabled` o `required`. El cambio se
  realiza en el entorno de despliegue y requiere recrear API, web y Nginx; no
  existe interruptor web ni fallback silencioso.

## DNS y TLS

1. Crear el registro DNS de `temis.ar` apuntando al VPS.
2. Emitir un certificado TLS público para `temis.ar`. El volumen de
   Let's Encrypt debe exponerlo como `/etc/letsencrypt/live/temis.ar/`.
3. Mantener la CA pública de certificados de dispositivo en
   `infra/nginx/client-ca/opswat-ca.pem`. No versionar la CA privada.
4. Validar las dos variantes antes de desplegar:

   ```bash
   PLATFORM_SECURITY_MODE=disabled docker compose -f docker-compose.prod.yml --env-file .env.production config
   PLATFORM_SECURITY_MODE=required docker compose -f docker-compose.prod.yml --env-file .env.production config
   ```

En modo `required`, un ingress de confianza debe reemplazar los headers internos
de dispositivo antes de llegar al BFF. La selección de sesión sigue dependiendo
del prefijo `/superadmin`, no del host. Nunca se aceptan esos headers directamente
del cliente.

## Modo disabled

Configurar explícitamente:

```dotenv
PLATFORM_SECURITY_MODE=disabled
PLATFORM_PUBLIC_URL=https://temis.ar
PLATFORM_WEBAUTHN_RP_ID=temis.ar
PLATFORM_WEBAUTHN_ORIGINS=https://temis.ar
```

El Super Admin entra con email y contraseña. Las sesiones siguen siendo
rotatorias y revocables; las operaciones sensibles exigen reingresar la
contraseña y el panel muestra “Seguridad reforzada desactivada”. Google y la
recuperación por email permanecen bloqueados. El enrolamiento por token CLI
sigue disponible para preparar el modo `required`.

## Preparar required

1. Contratar MetaDefender Access con API OAuth, MetaDefender Endpoint persistente
   y certificados de cliente.
2. Configurar `OPSWAT_*`, la CA pública, la allowlist AAGUID y el correo de
   alertas en el gestor de secretos.
3. Provisionar la identidad con `npm run db:super-admin -- provision`.
   Se puede validar la contraseña almacenada sin modificarla con
   `npm run db:super-admin -- verify-password`.
4. Ejecutar `npm run db:super-admin -- bootstrap-security` en el VPS.
5. Desde el equipo Windows administrado abrir
   `https://temis.ar/superadmin/enroll` y registrar dos llaves FIDO2
   físicas diferentes.
6. Ejecutar `npm run db:super-admin -- readiness`. No activar `required` hasta
   que todas las cuentas estén `READY` y la política haya sido observada durante
   siete días por medios operativos.

## Activar required

1. Cambiar sólo `PLATFORM_SECURITY_MODE=required`.
2. Recrear API, web y Nginx con Compose.
3. Verificar que las sesiones `disabled` fueron revocadas y que un login sin
   llave, certificado, dispositivo o postura conforme falla cerrado.
4. Confirmar que las rutas tenant continúan funcionando y que los headers de
   identidad de dispositivo sólo llegan desde el ingress confiable.

El arranque revoca idempotentemente sesiones emitidas en otro modo. En
`required`, OPSWAT caído bloquea login y enrolamiento nuevos; una sesión con
postura previamente conforme dispone de hasta quince minutos de gracia.

## Rollback a disabled

1. Cambiar `PLATFORM_SECURITY_MODE=disabled` en el entorno de despliegue.
2. Recrear API, web y Nginx. No eliminar llaves, dispositivos, CA ni secretos.
3. Confirmar el banner de advertencia y el evento `security_mode_changed`.
4. Verificar login con contraseña y step-up de contraseña.

Las sesiones `required` quedan revocadas al arrancar. El rollback no modifica
servicios, cookies ni rutas tenant.

## Incidentes y recuperación

- Cerrar sesiones: `npm run db:super-admin -- revoke-sessions`.
- Revocar un equipo: `npm run db:super-admin -- revoke-device`.
- Pérdida total: `npm run db:super-admin -- recover-device`; revoca sesiones,
  equipos y llaves anteriores y genera un token de diez minutos.
- No enviar tokens de bootstrap por email o mensajería. Usarlos inmediatamente
  mediante un canal operativo controlado.
