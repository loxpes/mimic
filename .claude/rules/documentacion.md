# Documentacion del Proyecto

## Antes de iniciar cualquier tarea

Consulta la documentacion relevante en `doc/` antes de escribir codigo:

1. `doc/README.md` para orientarte
2. `doc/arquitectura.md` si afecta estructura o patrones
3. `doc/api.md` si afecta endpoints
4. `doc/features/` si trabajas en una funcionalidad existente
5. `doc/hu/en-curso/HU-XXX/` si existe una HU para la tarea

## Despues de completar cualquier tarea

Actualiza la documentacion afectada:

- Cambios en arquitectura -> `doc/arquitectura.md`
- Cambios en API -> `doc/api.md`
- Nueva funcionalidad -> crear o actualizar en `doc/features/`
- HU en progreso -> actualizar `doc/hu/en-curso/HU-XXX/checklist.md`

No actualizar para: typos, formato, refactors internos sin cambio de comportamiento.

## Ciclo de vida de Historias de Usuario

- Crear: `doc/hu/en-curso/HU-XXX-nombre/` con `detalle.md`, `checklist.md`, `contexto/`
- Durante desarrollo: actualizar `checklist.md` marcando tareas
- Al completar: mover carpeta de `en-curso/` a `completadas/`
