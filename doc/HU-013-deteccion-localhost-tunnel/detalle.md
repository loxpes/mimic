# HU-013: Detección de URLs locales y guía de tunnel

## Descripción

Como usuario de TestFarm, cuando intento testear una aplicación que corre en mi máquina local (localhost), quiero recibir una alerta clara y una guía paso a paso para exponer mi app mediante un tunnel (cloudflared o ngrok), para que el agente de TestFarm pueda acceder a ella desde el servidor remoto.

## Objetivo

Detectar automáticamente URLs locales (localhost, 127.x.x.x, 0.0.0.0, [::1]) en el formulario de creación de sesiones y mostrar instrucciones de tunnel.

## Funcionalidades

1. **Detección automática**: Función `isLocalhostUrl()` que detecta URLs locales, incluyendo variantes sin protocolo
2. **Banner informativo**: Componente `LocalhostWarning` con:
   - Explicación de por qué no funciona localhost
   - Tabs cloudflared/ngrok con comandos pre-rellenados con el puerto
   - Botón de copiar comando
   - Input para pegar la URL del tunnel + botón "Usar esta URL"
3. **Integración en formularios**: Presente en modo individual y modo lote
4. **Multiidioma**: Traducciones en ES, EN, PT, FR, DE

## Criterios de Aceptación

- [x] `isLocalhostUrl` detecta localhost, 127.0.0.1, 0.0.0.0, [::1] con y sin protocolo
- [x] No produce falsos positivos con dominios que contienen "localhost" (e.g. my-localhost-app.com)
- [x] El banner aparece al escribir una URL local en el campo de URL objetivo
- [x] El banner desaparece al usar una URL no-local
- [x] Los comandos muestran el puerto correcto extraído de la URL
- [x] El botón "Copiar" copia el comando al portapapeles
- [x] El botón "Usar esta URL" reemplaza la URL en el input y el banner desaparece
- [x] Funciona en modo individual y modo lote
- [x] Traducciones disponibles en 5 idiomas
- [x] 15 tests unitarios pasan

## Modelo de datos

No requiere cambios en base de datos. Es una funcionalidad puramente frontend.

## Estimación

- Complejidad: Baja
- Archivos nuevos: 2 (url-utils.ts, LocalhostWarning.tsx)
- Archivos modificados: 2 (Sessions.tsx, i18n.ts)

## Dependencias

- lucide-react (ya existente)
- Componentes UI existentes (Button)

## Notas Técnicas

- `new URL('localhost:3000')` no lanza error pero parsea como protocolo `localhost:` con path `3000`, resultando en hostname vacío. La función hace fallback a `new URL('http://localhost:3000')` en ese caso.
- El componente usa `type="button"` en todos los botones internos para evitar submit accidental del formulario padre.
