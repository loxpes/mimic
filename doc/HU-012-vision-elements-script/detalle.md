# HU-012: Script de Analisis Visual con Claude CLI

## Descripcion y Objetivo

Crear un script standalone que recibe una imagen (screenshot), la pasa a Claude CLI con structured output, y devuelve una lista de todos los elementos interactivos detectados (botones, links, inputs, etc.) con nombre, descripcion, tipo y coordenadas.

Este script sirve como herramienta de prueba y validacion para la capacidad de vision del sistema, permitiendo verificar que Claude puede identificar correctamente los elementos interactivos en una captura de pantalla.

## Funcionalidades

### Analisis de imagen
- Recibe una ruta a una imagen (screenshot) como argumento
- Soporta seleccion de modelo via `--model` (sonnet, haiku, opus)
- Invoca Claude CLI con JSON schema para structured output
- Valida la respuesta con Zod

### Deteccion de elementos
- Identifica botones, links, inputs, selects, checkboxes, radios, iconos, menus, tabs
- Para cada elemento reporta: nombre, descripcion, tipo, coordenadas del centro
- Opcionalmente incluye bounding box (top, left, width, height)
- Proporciona descripcion general de la pagina

### Salida formateada
- Muestra resultados en consola con colores
- Incluye metricas de uso (tokens, coste)
- Mensajes de error claros para argumentos invalidos o archivos inexistentes

## Criterios de Aceptacion

- [x] El script se ejecuta con `npx tsx scripts/test-vision-elements.ts <imagen>`
- [x] Soporta flag `--model` con valores sonnet, haiku, opus
- [x] Sin argumentos muestra mensaje de uso y sale con codigo 1
- [x] Con archivo inexistente muestra error claro y sale con codigo 1
- [x] La salida estructurada se valida contra schema Zod
- [x] Los tests unitarios cubren: parsing de argumentos, validacion de schema, parsing NDJSON, construccion de args CLI
- [x] 19 tests pasan correctamente

## Modelo de Datos

```typescript
// Schema de salida
ScreenAnalysis {
  pageDescription: string
  elements: InteractiveElement[]
}

InteractiveElement {
  name: string
  description: string
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'icon' | 'menu' | 'tab' | 'other'
  coordinates: { x: number, y: number }
  bounds?: { top: number, left: number, width: number, height: number }
}
```

## Dependencias

- Claude CLI (`@anthropic-ai/claude-code`) instalado globalmente
- `zod` y `zod-to-json-schema` (agregados como devDependencies root)
- Node.js 20+

## Notas Tecnicas

- Basado en el patron de `scripts/test-claude-cli.ts`
- Usa `--dangerously-skip-permissions` y `--max-turns 3` para ejecucion no interactiva
- El prompt se pasa via stdin (`-p -`) para evitar limites de longitud en argumentos
- Las funciones puras (parseArgs, parseNdjsonResult, buildCliArgs, schema) se exportan para testing
