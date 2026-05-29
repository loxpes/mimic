# HU-001 — Validación de API Keys de proveedores LLM

## Descripción

Como usuario de Mimic, quiero saber si mis API keys son válidas antes de lanzar una sesión, para no descubrir el error a mitad de una ejecución costosa.

## Objetivo

Añadir validación real de API keys (llamada ligera al proveedor) en el endpoint de settings, de forma que la UI pueda mostrar el estado real de cada key.

## Funcionalidades

1. **Endpoint de validación**: `POST /api/settings/validate-key` que recibe `{ provider, apiKey? }` y hace una llamada mínima al proveedor para verificar que la key es válida.
2. **Indicador visual en UI**: En la pantalla de Settings, mostrar junto a cada proveedor si su key está validada (✓), inválida (✗) o sin comprobar.
3. **Soporte multi-proveedor**: Anthropic, OpenAI y Google.

## Criterios de aceptación

- [ ] `POST /api/settings/validate-key` con key válida devuelve `{ valid: true }`
- [ ] `POST /api/settings/validate-key` con key inválida devuelve `{ valid: false, error: "..." }`
- [ ] `POST /api/settings/validate-key` con proveedor `claude-cli` devuelve `{ valid: true/false }` según disponibilidad del CLI
- [ ] La UI muestra el estado de validación de cada key en Settings
- [ ] La validación se puede lanzar manualmente desde la UI
- [ ] Tests unitarios para la lógica de validación de cada proveedor

## Modelo de datos

No requiere cambios en BD. La validación es stateless.

## Estimación

S (small) — endpoint nuevo + componente UI pequeño

## Dependencias

- `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` (ya instalados)

## Notas técnicas

- Usar el modelo más barato/rápido de cada proveedor para la llamada de validación
- Limitar `maxOutputTokens` al mínimo posible (1 token) para minimizar coste
- El endpoint acepta opcionalmente `apiKey` en el body; si no se proporciona, usa la variable de entorno
