# HU-001: Edición de Proyectos, Cadenas de Sesión y Sesiones pendientes

## Descripción

Añadir funcionalidad de edición (CRUD completo) para Proyectos, Cadenas de Sesión y Sesiones pendientes, replicando el patrón ya existente en Personas y Objetivos.

## Objetivo

Permitir a los usuarios modificar los datos de entidades ya creadas sin necesidad de eliminarlas y recrearlas.

## Funcionalidades

### Backend
- **Proyectos**: Ampliar PATCH `/api/projects/:id` para incluir `targetUrl`
- **Cadenas de Sesión**: Ampliar PATCH `/api/session-chains/:id` para incluir `targetUrl`
- **Sesiones**: Crear PATCH `/api/sessions/:id` (solo para sesiones con estado `pending`)

### Frontend
- **Proyectos**: Dialog reutilizable para crear/editar con botón Pencil en cada tarjeta
- **Cadenas**: Formulario inline reutilizable para crear/editar con botón Pencil en cada tarjeta
- **Sesiones**: Dialog de edición con campos targetUrl, persona y objetivo (solo visible para sesiones pending)

### i18n
- Claves de traducción en 5 idiomas (ES, EN, PT, FR, DE)

## Criterios de aceptación

- [x] Proyectos pueden editarse (nombre, URL, descripción)
- [x] Cadenas pueden editarse (nombre, URL)
- [x] Sesiones pending pueden editarse (URL, persona, objetivo)
- [x] Sesiones no-pending NO muestran botón de editar
- [x] Tests backend cubren todos los endpoints PATCH
- [x] Typecheck pasa sin errores
- [x] Build de producción exitoso

## Modelo de datos

No se requieren cambios en el esquema de base de datos. Se reutilizan las columnas existentes.

## Dependencias

- Patrón de Personas/Objetivos como referencia
- Componentes UI existentes (Dialog, Button, Input, etc.)

## Notas técnicas

- El endpoint PATCH de sesiones rechaza con 400 si la sesión no está en estado `pending`
- En el frontend de cadenas, el modo edición solo muestra campos nombre y targetUrl (persona/objetivo se definen en creación)
- Se sigue el patrón TDD: tests RED -> GREEN -> REFACTOR
