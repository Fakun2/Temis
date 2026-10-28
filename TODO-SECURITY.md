# TODO — Activación de seguridad reforzada para Super Admin

Estado: **diferido**. La implementación existe, pero no debe habilitarse en
producción hasta completar todos los bloqueos y controles de este documento.

Responsable: pendiente de asignar.

Documentación relacionada:

- [`docs/operations/PLATFORM_STRONG_AUTH.md`](docs/operations/PLATFORM_STRONG_AUTH.md)
- [`docs/deployment/VPS_PRODUCTION.md`](docs/deployment/VPS_PRODUCTION.md)
- [`docs/architecture/RBAC.md`](docs/architecture/RBAC.md)
- [`docs/architecture/DECISIONS.md`](docs/architecture/DECISIONS.md)

## Regla de activación

No configurar `PLATFORM_SECURITY_MODE=required` hasta que:

- [ ] OPSWAT confirme por escrito la licencia y API necesarias.
- [ ] La identidad del dispositivo provenga de un certificado de cliente
      validado criptográficamente por Nginx.
- [ ] El adaptador de postura esté probado contra una respuesta real del tenant
      OPSWAT.
- [ ] Cada Super Admin tenga un dispositivo conforme y dos llaves FIDO2.
- [ ] El comando `readiness` devuelva `READY` para todas las cuentas.
- [ ] La política haya sido observada operacionalmente durante al menos siete días.
- [ ] Todas las pruebas de aceptación de este documento estén completas.

No reemplazar el certificado por un header, cookie o `deviceId` aportado por el
navegador.

## 1. Compras y contratación

Por cada Super Admin:

- [ ] Asignar un equipo Windows administrado y no compartido.
- [ ] Comprar dos llaves físicas FIDO2 con PIN y attestation.
- [ ] Guardar la llave de respaldo en una ubicación física separada.
- [ ] Contratar MetaDefender Access/Central Management con:
  - [ ] MetaDefender Endpoint persistente.
  - [ ] API OAuth con Client Credentials y permisos de solo lectura.
  - [ ] Consulta de cumplimiento mediante Device ID.
  - [ ] Certificado de cliente instalado por el agente.
  - [ ] Cadena CA pública para validar el certificado en Nginx.
  - [ ] Visibilidad de antivirus/EDR, firewall, cifrado, sistema operativo,
        parches y antigüedad del reporte.
  - [ ] Confirmación de soporte para TPM y Secure Boot, si están disponibles.

Preguntas para OPSWAT:

1. ¿Qué producto, licencia, tenant y versión de API cubren estos requisitos?
2. ¿Cuál es el endpoint exacto para consultar un dispositivo por Device ID?
3. ¿Qué método HTTP, autenticación y esquema JSON utiliza?
4. ¿Cómo se extrae el Device ID del Subject DN del certificado?
5. ¿Cómo se obtiene la CA pública que firma los certificados de los agentes?
6. ¿La API informa TPM, Secure Boot y antigüedad de parches críticos?

Referencias oficiales:

- [MetaDefender Access API](https://www.opswat.com/products/metadefender/access/api)
- [OAuth de OPSWAT](https://www.opswat.com/docs/cm/developer-guidelines/authentication)
- [Certificados de cliente OPSWAT](https://www.opswat.com/docs/cm/developer-guidelines/client-certificates)

## 2. Preparar el equipo Windows

- [ ] Instalar todas las actualizaciones de Windows y reiniciar.
- [ ] Confirmar que la versión de Windows continúa soportada.
- [ ] Activar BitLocker en el disco del sistema y todos los discos fijos.
- [ ] Guardar la clave de recuperación fuera del equipo.
- [ ] Confirmar TPM presente y listo.
- [ ] Confirmar Secure Boot activo.
- [ ] Confirmar Defender o EDR aprobado activo y actualizado.
- [ ] Confirmar firewall activo en perfiles Domain, Private y Public.
- [ ] Configurar bloqueo automático de pantalla en cinco minutos o menos.
- [ ] Usar una cuenta Windows individual, nunca compartida.
- [ ] Eliminar software innecesario y mantener Edge/Chrome actualizado.

Comprobaciones de PowerShell como administrador:

```powershell
Get-BitLockerVolume
Get-Tpm
Confirm-SecureBootUEFI
Get-MpComputerStatus
Get-NetFirewallProfile
```

Resultados mínimos:

- [ ] BitLocker protegido en los volúmenes requeridos.
- [ ] `TpmPresent` y `TpmReady` en `True`.
- [ ] Secure Boot devuelve `True`.
- [ ] Protección en tiempo real y firmas de antimalware activas.
- [ ] Todos los perfiles de firewall habilitados.

## 3. Preparar las llaves FIDO2

Para cada una de las dos llaves:

- [ ] Abrir **Configuración → Cuentas → Opciones de inicio de sesión → Llave de
      seguridad → Administrar**.
- [ ] Insertar la llave y crear un PIN propio.
- [ ] No reutilizar la contraseña de Temis como PIN.
- [ ] Etiquetar físicamente la llave sin incluir credenciales o el email.
- [ ] Registrar fabricante, modelo, firmware y AAGUID en el inventario interno.
- [ ] Confirmar que no es una passkey sincronizada ni un autenticador de
      plataforma.

Obtener los AAGUID exactos del fabricante o del
[FIDO Metadata Service](https://fidoalliance.org/metadata/). No usar el AAGUID
de un modelo similar.

Configurar posteriormente:

```dotenv
PLATFORM_WEBAUTHN_AAGUID_ALLOWLIST=AAGUID_MODELO_1,AAGUID_MODELO_2
```

- [ ] Como endurecimiento adicional, integrar validación de la cadena de
      attestation mediante FIDO Metadata Service, además de la allowlist de
      AAGUID.

## 4. Configurar MetaDefender

En la consola OPSWAT:

- [ ] Crear el tenant de producción.
- [ ] Crear un grupo/política exclusiva para Super Admin.
- [ ] Habilitar la actualización automática del agente.
- [ ] Habilitar certificados de cliente para los endpoints.
- [ ] Crear una aplicación OAuth confidencial de solo lectura.
- [ ] Guardar Client ID y Client Secret en el gestor de secretos, nunca en Git.
- [ ] Registrar las URL exactas de API y token OAuth.
- [ ] Registrar el endpoint y versión de consulta de postura.
- [ ] Descargar la cadena CA pública para certificados de cliente.

La política debe marcar como incumplimiento:

- [ ] Windows ausente, no soportado o desactualizado.
- [ ] Agente ausente, detenido o con reporte mayor a cinco minutos.
- [ ] BitLocker desactivado, suspendido o incompleto.
- [ ] TPM o Secure Boot inactivos cuando el proveedor los informe.
- [ ] Defender/EDR ausente, inactivo o desactualizado.
- [ ] Firewall inactivo.
- [ ] Hallazgos críticos.
- [ ] Parches críticos pendientes durante más de siete días.

## 5. Instalar MetaDefender Endpoint

- [ ] Descargar el MSI persistente desde el tenant OPSWAT.
- [ ] Instalarlo como administrador sin modificar el paquete.
- [ ] Confirmar que el equipo aparece en el inventario OPSWAT.
- [ ] Asignarlo a la política de Super Admin.
- [ ] Confirmar que el agente reporta y queda conforme.
- [ ] Confirmar el servicio local:

```powershell
Get-Service | Where-Object {
  $_.DisplayName -match "OPSWAT|MetaDefender|GEARS"
}
```

## 6. Verificar el certificado de dispositivo

- [ ] Ejecutar `certmgr.msc` en el equipo Windows.
- [ ] Abrir **Personal → Certificates**.
- [ ] Confirmar que existe un certificado OPSWAT vigente.
- [ ] Confirmar que el Subject DN contiene el Device ID.
- [ ] Confirmar que el OID `0.9.2342.19200300.100.1.1` contiene el identificador
      esperado, si la versión contratada usa ese formato.
- [ ] Confirmar que Edge o Chrome presentan el certificado al dominio de Temis.

No exportar la clave privada del dispositivo.

## 7. Instalar la CA pública en el VPS

- [ ] Copiar solamente la cadena CA pública a:

```text
infra/nginx/client-ca/opswat-ca.pem
```

- [ ] Restringir permisos de lectura al usuario/proceso de despliegue.
- [ ] Verificar el archivo:

```bash
openssl x509 \
  -in infra/nginx/client-ca/opswat-ca.pem \
  -noout \
  -subject \
  -issuer \
  -fingerprint \
  -sha256
```

- [ ] Confirmar que `opswat-ca.pem` no aparece en `git status`.
- [ ] No almacenar la CA privada, PFX o claves del dispositivo en el servidor.

## 8. Resolver el contrato real de la API OPSWAT

Bloqueo técnico: el provider actual realiza una consulta equivalente a:

```http
GET /devices/{deviceId}/posture
Authorization: Bearer <token>
```

Y espera datos normalizados equivalentes a:

```json
{
  "checkedAt": "2026-10-14T12:00:00Z",
  "platform": "Windows 11",
  "agentActive": true,
  "bitlockerEnabled": true,
  "secureBootEnabled": true,
  "tpmEnabled": true,
  "antimalwareHealthy": true,
  "firewallEnabled": true,
  "oldestCriticalPatchAgeDays": 0,
  "criticalFindings": false
}
```

Antes del despliegue:

- [ ] Obtener un ejemplo anonimizado de la respuesta real de OPSWAT.
- [ ] Confirmar método HTTP y ubicación del access token.
- [ ] Confirmar que el Device ID del certificado identifica el mismo registro
      consultado por API.
- [ ] Adaptar `OpswatDevicePostureProvider` al contrato real o colocar un
      gateway interno que entregue el esquema normalizado.
- [ ] Añadir fixtures contractuales sin datos sensibles.
- [ ] Probar respuestas conformes, no conformes, incompletas, timeout, 401, 429
      y errores 5xx.
- [ ] Mantener comportamiento fail-closed para login y enrolamiento nuevos.

La API pública estándar puede devolver campos como `status`, `last_seen`,
`os_info`, `issue` y `categories`; no asumir que coincide con el esquema
interno. Referencia: [Device Details de OPSWAT](https://www.opswat.com/docs/cm/developer-guidelines/device-details-v3-1).

## 9. Configurar secretos de producción

- [ ] Crear DNS para `platform.temis.ar` apuntando al mismo proxy controlado.
- [ ] Emitir un certificado TLS público con SAN para `temis.ar` y
      `platform.temis.ar`.
- [ ] Confirmar que el virtual host tenant no solicita certificado y elimina
      headers mTLS entrantes.
- [ ] Probar `nginx -t` con `platform-disabled.conf` y
      `platform-required.conf`.

Crear `.env.production` desde el ejemplo y limitar permisos:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Primera etapa, acceso por contraseña mientras se prepara el enrolamiento:

```dotenv
PLATFORM_SECURITY_MODE=disabled
PLATFORM_PUBLIC_URL=https://platform.temis.ar
PLATFORM_WEBAUTHN_RP_ID=platform.temis.ar
PLATFORM_WEBAUTHN_RP_NAME=Temis Platform
PLATFORM_WEBAUTHN_ORIGINS=https://platform.temis.ar
PLATFORM_WEBAUTHN_AAGUID_ALLOWLIST=AAGUID_REAL_1,AAGUID_REAL_2
PLATFORM_SECURITY_ALERT_EMAIL=seguridad@dominio.example
OPSWAT_API_URL=https://TENANT-REAL.example/
OPSWAT_TOKEN_URL=https://TENANT-REAL.example/o/oauth/token
OPSWAT_CLIENT_ID=GESTOR_DE_SECRETOS
OPSWAT_CLIENT_SECRET=GESTOR_DE_SECRETOS
OPSWAT_DEVICE_POSTURE_PATH=/RUTA-REAL/{deviceId}
```

Controles:

- [ ] `RP_ID` contiene solo el dominio, sin esquema o ruta.
- [ ] `ORIGINS` contiene el origin HTTPS exacto.
- [ ] No usar IP, HTTP o localhost en producción.
- [ ] Client Secret, JWT, contraseñas y tokens están fuera de Git.
- [ ] `PLATFORM_SECURITY_ALERT_EMAIL` es una casilla monitoreada.
- [ ] Redis, RabbitMQ y Resend están configurados y disponibles.
- [ ] Generar secretos JWT diferentes y aleatorios, por ejemplo con
      `openssl rand -hex 64`.

## 10. Desplegar en modo observación

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d --build
```

- [ ] Confirmar servicios:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  ps
```

- [ ] Aplicar migraciones:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  run --rm api \
  npx prisma migrate deploy \
  --schema packages/database/prisma/schema.prisma
```

- [ ] Revisar logs sin copiar secretos a tickets:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  logs --tail=200 api web worker nginx
```

No continuar con errores de CA, OAuth, Redis, Prisma, WebAuthn, RabbitMQ o
alertas.

## 11. Provisionar cada Super Admin

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  run --rm api \
  npm run db:super-admin -- provision
```

- [ ] Usar un email exclusivo para plataforma.
- [ ] Usar una contraseña única de al menos 16 caracteres.
- [ ] Confirmar que la cuenta no tiene memberships tenant.

## 12. Crear el token de bootstrap

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  run --rm api \
  npm run db:super-admin -- bootstrap-security
```

- [ ] Usar el token dentro de sus diez minutos de vigencia.
- [ ] No enviarlo por email, chat, mensajería o tickets.
- [ ] No almacenarlo después del enrolamiento.

## 13. Enrolar dispositivo y llaves

Desde el equipo Windows administrado:

- [ ] Confirmar que MetaDefender está activo y conforme.
- [ ] Abrir `https://platform.temis.ar/platform-enroll` en Edge o Chrome.
- [ ] Seleccionar el certificado OPSWAT cuando lo solicite el navegador.
- [ ] Ingresar email, contraseña, token y nombre del dispositivo.
- [ ] Registrar la primera llave mediante **Security key/Llave de seguridad**.
- [ ] Introducir PIN y tocar físicamente la llave.
- [ ] Retirar la primera llave.
- [ ] Registrar la segunda llave, introducir PIN y tocarla.
- [ ] Confirmar que no se usó Windows Hello, teléfono, QR o passkey
      sincronizada.

## 14. Ejecutar readiness

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  run --rm api \
  npm run db:super-admin -- readiness
```

Resultado requerido para cada cuenta:

```text
admin@dominio.example: READY (2 llaves, 1 dispositivos conformes)
```

- [ ] No hay cuentas `NOT READY`.
- [ ] Existe al menos un dispositivo conforme por administrador.
- [ ] Existen al menos dos llaves activas por administrador.

## 15. Observar durante siete días

- [ ] Probar login diariamente con contraseña, PIN y toque físico.
- [ ] Confirmar que OPSWAT reporta con menos de cinco minutos de antigüedad.
- [ ] Revisar eventos de seguridad y alertas por email.
- [ ] Instalar actualizaciones y probar el flujo después de reiniciar Windows.
- [ ] Simular incumplimientos controlados y comprobar que son registrados.
- [ ] Probar una interrupción breve de OPSWAT.
- [ ] Confirmar que Google login y recuperación por email no acceden a
      plataforma.
- [ ] Confirmar que las rutas tenant no permiten escalar a Super Admin.
- [ ] Confirmar que no se registran tokens, secretos, PIN o resultados internos
      completos de OPSWAT.

## 16. Pruebas de aceptación antes de enforcement

- [ ] Equipo correcto + contraseña + llave permitida + PIN + postura conforme:
      acceso concedido.
- [ ] Contraseña incorrecta: acceso denegado.
- [ ] Sin llave: acceso denegado.
- [ ] Windows Hello, QR, teléfono o passkey sincronizada: acceso denegado.
- [ ] AAGUID no permitido: acceso denegado.
- [ ] Certificado ausente, vencido o de otra CA: acceso denegado.
- [ ] Dispositivo no enrolado o revocado: acceso denegado.
- [ ] Postura no conforme: acceso denegado al usar enforcement.
- [ ] Header `X-Temis-Device-Id` falsificado: acceso denegado.
- [ ] Challenge WebAuthn reutilizado: acceso denegado.
- [ ] Origin o RP ID incorrecto: acceso denegado.
- [ ] Contador regresivo/replay de credencial: acceso denegado y auditado.
- [ ] Refresh token reutilizado: familia completa revocada.
- [ ] Revocar rol, sesión, dispositivo o llave invalida el acceso inmediatamente.
- [ ] OPSWAT caído bloquea logins y enrolamientos nuevos.
- [ ] Sesión previamente conforme usa como máximo 15 minutos de gracia.
- [ ] Step-up mayor a cinco minutos no autoriza operaciones sensibles.
- [ ] Alertas y eventos no contienen credenciales o PII innecesaria.

Guardar evidencia de resultados sin capturar secretos, tokens o información
sensible del endpoint.

## 17. Activar enforcement

Solamente después de aprobar las secciones anteriores:

```dotenv
PLATFORM_SECURITY_MODE=required
```

Aplicar el cambio:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d --build
```

- [ ] Repetir todas las pruebas de denegación críticas.
- [ ] Confirmar que el login tradicional ya no emite sesión de plataforma.
- [ ] Confirmar que sólo la combinación completa produce una sesión.
- [ ] Registrar fecha, responsable y evidencia del cambio.

Rollback: volver a `PLATFORM_SECURITY_MODE=disabled` y recrear API, web y Nginx.
El arranque revocará las sesiones `required`; no borrar enrolamientos, CA ni
secretos. Confirmar el banner de advertencia y el step-up por contraseña.

## 18. Operaciones e incidentes

Revocar sesiones:

```bash
npm run db:super-admin -- revoke-sessions
```

Revocar un dispositivo y sus sesiones:

```bash
npm run db:super-admin -- revoke-device
```

Recuperación por pérdida total de equipo o llaves:

```bash
npm run db:super-admin -- recover-device
```

- [ ] Documentar quién puede ejecutar estos comandos.
- [ ] Mantener acceso al VPS protegido con MFA y llaves SSH.
- [ ] Probar recuperación completa al menos una vez antes del go-live.
- [ ] Ante pérdida, revocar primero; investigar después.
- [ ] Tras `recover-device`, repetir enrolamiento con dos llaves nuevas.
- [ ] Revisar eventos y rotar credenciales si existe sospecha de compromiso.

## 19. Mantenimiento periódico

Mensual:

- [ ] Revisar cuentas Super Admin activas.
- [ ] Revisar sesiones, dispositivos y llaves.
- [ ] Revisar eventos denegados y alertas.
- [ ] Confirmar estado de OPSWAT, Redis, RabbitMQ y correo.
- [ ] Revisar versiones del agente y firmware de llaves.
- [ ] Ejecutar auditoría de dependencias y priorizar vulnerabilidades críticas y
      altas.

Trimestral:

- [ ] Probar una revocación y recuperación controlada.
- [ ] Verificar físicamente la llave de respaldo.
- [ ] Revisar AAGUID permitidos y estado en FIDO Metadata Service.
- [ ] Revisar la política de cumplimiento y versiones soportadas de Windows.
- [ ] Confirmar vigencia de certificados y cadena CA.

Anual o ante incidentes:

- [ ] Rotar secretos OAuth y JWT de forma planificada.
- [ ] Revisar contrato/licencia OPSWAT y límites de API.
- [ ] Ejecutar una prueba integral de acceso y recuperación offline.

## Criterio final de cierre

Este TODO se considera completo únicamente cuando se demuestre que:

> Una sesión de plataforma sólo puede emitirse combinando contraseña válida,
> una llave FIDO2 física permitida con verificación de usuario, un certificado
> de dispositivo validado por Nginx y una postura OPSWAT fresca y conforme.
