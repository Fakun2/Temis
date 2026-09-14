# Temis AI Service

Servicio aislado para funcionalidades de IA. No reemplaza al monolito: recibe solicitudes internas ya autenticadas y autorizadas por `apps/api`, construye contexto con permisos limitados y ejecuta casos de uso de IA.

## Responsabilidades

- Exponer endpoints internos para resumen de expedientes, chat, borradores e indexacion.
- Consumir `packages/ai-core` para providers, prompts, retrieval y safety.
- Consumir `packages/ai-contracts` para contratos compartidos con `apps/api`.
- Usar un usuario de base de datos limitado para lecturas tenant-scoped y escrituras solo en tablas `ai`.
- Registrar auditoria de requests y outputs de IA.

## Fuera de alcance

- No maneja login ni sesiones de usuario.
- No decide RBAC de producto.
- No acepta `tenantId` directo desde el frontend.
- No se expone publicamente al navegador.

