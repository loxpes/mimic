# Problema: App usa Gemini en vez de Claude CLI

## Síntoma

```
Error: You exceeded your current quota
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
limit: 20, model: gemini-3-flash
```

La app está usando Google Gemini a pesar de tener configurado `CLAUDE_CODE_OAUTH_TOKEN` y `LLM_PROVIDER=claude-cli` en las variables de entorno.

## Causa Raíz

La configuración LLM se almacena en la **base de datos** (tabla `appSettings`), y la DB tiene prioridad sobre las variables de entorno:

```typescript
// apps/api/src/lib/llm-config.ts
export async function getGlobalLLMConfig() {
  const settings = await db.select().from(appSettings).get();

  if (settings) {
    return {
      provider: settings.llmProvider,  // ← Lee de DB primero
      model: settings.llmModel,
    };
  }

  return DEFAULT_LLM_CONFIG;  // ← Env vars solo si no hay DB
}
```

## Flujo de Prioridad

1. **Si hay `appSettings` en DB:** Usa `llmProvider` y `llmModel` de la DB
2. **Si NO hay en DB:** Usa env vars (`LLM_PROVIDER`, `LLM_MODEL`)

## Por qué pasó

Cuando configuraste la app por primera vez (antes del deploy), probablemente:
1. Seleccionaste "Google (Gemini)" en Settings
2. Esto se guardó en la DB local (`data/testfarm.db`)
3. Al hacer deploy, ese archivo DB se copió al VPS
4. Las env vars en Coolify son ignoradas porque la DB ya tiene configuración

## Soluciones

### Opción 1: Cambiar desde la Web (Recomendado)

1. Ve a Settings: `http://tu-ip:3001/settings`
2. En "Proveedor LLM", selecciona: **Claude Code CLI**
3. En "Modelo", escribe: **claude-sonnet-4-20250514**
4. Haz clic en **Guardar configuración**

### Opción 2: Script de corrección (Más rápido)

Desde tu máquina local o en el VPS:

```bash
# SSH al VPS
ssh root@tu-ip

# Entrar al container de la app
docker exec -it <container-id> sh

# Ejecutar script de corrección
cd /app
pnpm config:fix
```

### Opción 3: Borrar DB y recrear (Nuclear)

Si tienes datos de prueba que no importan:

```bash
# SSH al VPS
ssh root@tu-ip

# Borrar volumen de datos
docker volume rm <volume-name>

# Reiniciar app (Coolify lo recrea automáticamente)
```

La app creará una nueva DB usando las env vars.

## Verificación

Después de aplicar la solución:

```bash
# Desde el container
pnpm config:check
```

Deberías ver:
```
✅ Configuración correcta!
  Provider: claude-cli
  Model: claude-sonnet-4-20250514
```

## Prevención Futura

Las env vars se usan como **defaults** al crear la DB por primera vez. Una vez que cambias algo en Settings, la DB tiene prioridad.

Si quieres forzar env vars siempre, necesitarías modificar el código para eliminar la prioridad de la DB (no recomendado, porque rompe la capacidad de configurar desde la UI).

## Variables de Entorno Necesarias

Asegúrate de tener en Coolify:

```bash
# Provider y modelo
LLM_PROVIDER=claude-cli
LLM_MODEL=claude-sonnet-4-20250514

# Token de autenticación
CLAUDE_CODE_OAUTH_TOKEN=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

# Otras necesarias
PORT=3001
ENCRYPTION_KEY=tu-encryption-key
```
