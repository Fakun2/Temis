# Temis AI Core

Motor reutilizable de IA. Este paquete no debe depender de NestJS, Next.js ni Prisma directamente.

## Responsabilidades

- Providers de modelos.
- Prompt registry.
- Retrieval y armado de contexto.
- Safety, redaction y limites.
- Tipos internos del motor.
- Evaluadores de calidad.

## Regla de frontera

`ai-core` puede recibir contexto legal ya autorizado, pero no debe decidir autorizacion de producto ni confiar en datos sin scope de tenant.

## Provider strategies

- `preview`: estrategia local para desarrollo, no llama proveedores externos.
- `openai-compatible`: estrategia para proveedores compatibles con OpenAI Chat Completions.

Variables usadas por `apps/api` para seleccionar estrategia:

```txt
AI_PROVIDER=preview
AI_PROVIDER=openai-compatible
AI_OPENAI_API_KEY=...
AI_OPENAI_BASE_URL=https://api.openai.com/v1
AI_OPENAI_MODEL=...
AI_MODEL_TEMIS_LEGAL=...
AI_MODEL_REASONING=...
AI_MODEL_FAST=...
AI_MAX_OUTPUT_TOKENS=1200
AI_TEMPERATURE=0.2
```

Los modelos de Temis (`temis-legal`, `reasoning`, `fast`) son IDs logicos. El modelo real del proveedor se configura por entorno para evitar acoplar el codigo a nombres de modelos externos.

`AI_MODEL_TEMIS_LEGAL` es la variable principal. `AI_MODEL_JUSTINIA_LEGAL` y `AI_MODEL_BOGAPP_LEGAL` se aceptan como fallback para despliegues existentes.
