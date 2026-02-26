# TDD Obligatorio

**SIEMPRE** sigue Test-Driven Development (TDD) al escribir código:

1. **RED**: Escribe primero un test que falle definiendo el comportamiento esperado
2. **GREEN**: Escribe el código mínimo necesario para que el test pase
3. **REFACTOR**: Limpia el código manteniendo los tests en verde

Aplica TDD a todos los cambios: nuevas funcionalidades, corrección de bugs y refactorizaciones.

---

# Documentación de Historias de Usuario

## Al finalizar un plan

Cuando se ejecute un plan que implique nuevas funcionalidades o cambios significativos, **SIEMPRE** debe documentarse en `/doc` como historia de usuario (HU):

### Estructura de carpetas

```
doc/hu/en-curso/
└── HU-XXX-nombre-descriptivo/
    ├── detalle.md      # Descripción completa de la HU
    ├── checklist.md    # Lista de tareas para seguimiento
    └── contexto/       # Carpeta para documentación adicional
```

### Contenido de detalle.md

- Descripción y objetivo
- Funcionalidades detalladas
- Criterios de aceptación (checkboxes)
- Modelo de datos (si aplica)
- Dependencias
- Notas técnicas

### Contenido de checklist.md

- Estado general (🔴 No iniciado / 🟡 En progreso / 🟢 Completado)
- Lista de tareas técnicas agrupadas por área
- Tabla de notas de progreso con fecha y avance

## Durante el desarrollo

**SIEMPRE** actualiza el `checklist.md` de la HU correspondiente mientras desarrollas:

1. Marca las tareas completadas con `[x]`
2. Añade notas de progreso con fecha
3. Actualiza el estado general cuando corresponda
4. Si surgen nuevas tareas, añádelas a la lista

---

# Commits y Pull Requests

## Commits

**SIEMPRE** pregunta al usuario antes de hacer un commit.

### Formato de commit

```
<tipo>(ID-TAREA): descripción
```

- **tipo**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, etc.
- **ID-TAREA**: ID de la tarea (extraer de la rama actual)
- **descripción**: Descripción breve del cambio

Si no se conoce el número de la HU, **preguntar al usuario** antes de proceder.

## Pull Requests

Al finalizar una HU, **preguntar al usuario** si desea generar una PR.

### Formato de PR

```
<tipo>(ID-TAREA): descripción corta
```

El formato es idéntico al de commits.