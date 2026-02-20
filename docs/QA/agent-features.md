# Funcionalidades del Agente Evy - Guia de QA

## Resumen General

Evy es un asistente personal inteligente implementado como un **Single ReAct Agent** con LangGraph. El flujo basico es:

1. El usuario envia un mensaje via chat (API REST con SSE streaming)
2. El agente procesa el mensaje: genera titulo del hilo, prepara contexto, selecciona skills relevantes, razona y ejecuta herramientas
3. El usuario recibe la respuesta en tiempo real via Server-Sent Events (SSE)

El agente tiene acceso a **37 herramientas** organizadas en **15 skills builtin**. Las skills se activan automaticamente segun el contenido del mensaje del usuario, o pueden forzarse manualmente.

---

## 1. Herramientas del Agente (37 tools)

### 1.1 Tasks (5 tools) — Skill: `task-management`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `create_task` | Crear tarea | `name` (obligatorio), `description` (obligatorio), `start_date`, `end_date`, `reminders`, `is_important` | Fechas en UTC ISO. Tags y status se inicializan automaticamente |
| `update_task` | Actualizar tarea | `task_id` (obligatorio), `name`, `description`, `start_date`, `end_date`, `reminders`, `progress` (0-100), `status`, `is_important` | Solo task_id es obligatorio, el resto opcional |
| `delete_task` | Eliminar tarea | `task_id` (obligatorio) | Elimina y remueve del estado acumulativo |
| `get_task` | Obtener tarea por ID | `task_id` (obligatorio) | Retorna datos completos de la tarea |
| `search_tasks` | Buscar tareas | `start_date` (obligatorio, YYYY-MM-DD), `end_date` (obligatorio, YYYY-MM-DD), `status` (lista: pending/in_progress/completed/paused), `limit` (1-100, default 20) | Busqueda por rango de fecha y estado |

**Valores de status**: `pending`, `in_progress`, `completed`, `paused`

**Ejemplo de prueba via chat**:
- "Crea una tarea llamada Revisar documentacion para manana a las 10am"
- "Marca la tarea X como completada"
- "Que tareas tengo pendientes esta semana?"

---

### 1.2 Events (5 tools) — Skill: `event-management`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `create_event` | Crear evento | `description` (obligatorio), `start_time` (obligatorio, ISO UTC), `end_time` (obligatorio, ISO UTC), `status` (obligatorio: confirmed/tentative/cancelled), `location`, `attendees`, `creator`, `reminders`, `recurrence` | Attendees: lista de {displayName, email} |
| `update_event` | Actualizar evento | `event_id` (obligatorio), `description`, `location`, `start_time`, `end_time`, `status`, `attendees`, `creator`, `reminders`, `recurrence` | Solo event_id obligatorio |
| `delete_event` | Eliminar evento | `event_id` (obligatorio) | Elimina y remueve del estado |
| `get_event` | Obtener evento por ID | `event_id` (obligatorio) | Retorna datos completos |
| `search_events` | Buscar eventos | `start_date` (obligatorio, YYYY-MM-DD), `end_date` (obligatorio, YYYY-MM-DD), `status` (lista: confirmed/cancelled/pending/tentative), `limit` (1-100, default 20) | Busqueda por rango de fecha |

**Valores de status**: `confirmed`, `tentative`, `cancelled`

**Recurrence**: Formato iCalendar RRULE (ej: `FREQ=WEEKLY;BYDAY=MO,WE,FR`)

**Ejemplo de prueba via chat**:
- "Crea una reunion de equipo el viernes a las 3pm en la sala A"
- "Mueve mi evento de manana a las 5pm"
- "Que eventos tengo la proxima semana?"

---

### 1.3 Habits (3 tools) — Skill: `habit-management`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `create_habit` | Crear habito | `name` (obligatorio), `description` (obligatorio), `recurrence` (iCalendar RRULE) | Tags, proxima ejecucion, racha se inicializan automaticamente |
| `update_habit` | Actualizar habito | `habit_id` (obligatorio), `name`, `description`, `recurrence` | Solo habit_id obligatorio |
| `delete_habit` | Eliminar habito | `habit_id` (obligatorio) | Elimina y remueve del estado |

**Recurrence**: Formato iCalendar (ej: `FREQ=DAILY;BYHOUR=7` para diario a las 7am)

**Ejemplo de prueba via chat**:
- "Crea un habito de correr todos los dias a las 7am"
- "Cambia mi habito de meditacion a 3 veces por semana"
- "Elimina el habito de lectura"

---

### 1.4 Projects (3 tools) — Skill: `project-management`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `create_project` | Crear proyecto | `name` (obligatorio), `description` (obligatorio), `color` (hex, default #FFFFFF), `importance` (low/medium/high, default low), `rules`, `objectives` | Rules y objectives son listas de strings |
| `update_project` | Actualizar proyecto | `project_id` (obligatorio), `name`, `color`, `description`, `importance`, `rules`, `objectives`, `members` | Members: dict {user_id: role} |
| `get_all_projects` | Listar proyectos | (sin parametros del usuario) | user_id se extrae automaticamente |

**Ejemplo de prueba via chat**:
- "Crea un proyecto llamado App Movil con color rojo e importancia alta"
- "Agrega el objetivo 'Lanzar MVP en marzo' al proyecto App Movil"
- "Muestra todos mis proyectos"

---

### 1.5 Files (5 tools) — Skill: `file-manager` (always on)

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `create_file` | Crear archivo | `filename` (obligatorio, con extension: 'script.py'), `content` (obligatorio), `mime_type` | Se almacena como documento tipo FILE |
| `read_file` | Leer archivo | `file_id` (obligatorio) | Retorna contenido completo |
| `edit_file` | Editar archivo | `file_id` (obligatorio), `content` (obligatorio, reemplazo completo), `filename` (para renombrar) | Reemplaza TODO el contenido |
| `list_files` | Listar archivos | `limit` (1-50, default 20) | Solo archivos tipo FILE |
| `delete_file` | Eliminar archivo | `file_id` (obligatorio) | Eliminacion permanente |

**Siempre disponible**: Esta skill esta siempre activa, no requiere activacion.

**Ejemplo de prueba via chat**:
- "Crea un archivo llamado notas.txt con el contenido: Lista de compras..."
- "Muestra mis archivos"
- "Lee el archivo X"
- "Edita el archivo X y cambia el contenido a..."

---

### 1.6 Credentials (4 tools) — Skill: `credential-vault` (always on)

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `store_credential` | Guardar credencial | `key_name` (obligatorio, ej: 'github_token'), `value` (obligatorio, se encripta), `description` | Valor encriptado en reposo |
| `get_credential` | Obtener credencial | `key_name` (obligatorio) | Valor en estado interno, ENMASCARADO en el chat |
| `list_credentials` | Listar credenciales | (sin parametros) | Solo nombres y descripciones, NUNCA valores |
| `delete_credential` | Eliminar credencial | `key_name` (obligatorio) | Eliminacion permanente |

**Siempre disponible**: Esta skill esta siempre activa.

**Seguridad**: Los valores nunca se muestran en el chat. `get_credential` los coloca en estado interno para uso por otras tools (ej: http_request).

**Ejemplo de prueba via chat**:
- "Guarda mi API key de GitHub: ghp_abc123..."
- "Lista mis credenciales guardadas"
- "Usa mi credencial de GitHub para hacer un request a la API"

---

### 1.7 Skills (6 tools) — Skill: `skill-creator`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `create_custom_skill` | Crear skill | `name` (obligatorio, formato lowercase-hyphens), `description` (obligatorio), `body` (obligatorio, instrucciones markdown), `tools` (obligatorio, lista de nombres de tools), `keywords` (obligatorio) | Genera embedding para busqueda |
| `update_custom_skill` | Actualizar skill | `skill_id` (obligatorio), `name`, `description`, `body`, `tools`, `keywords` | Solo skill_id obligatorio |
| `delete_custom_skill` | Eliminar skill | `skill_id` (obligatorio) | Solo skills propias |
| `publish_custom_skill` | Publicar al marketplace | `skill_id` (obligatorio) | Publica para que otros usuarios puedan instalar |
| `get_my_skills` | Listar mis skills | (sin parametros) | Custom + publicadas propias |
| `list_available_tools` | Listar tools disponibles | (sin parametros) | Para saber que tools asignar a una skill |

**Ejemplo de prueba via chat**:
- "Crea una skill llamada 'daily-standup' que busque mis tareas pendientes y genere un resumen"
- "Publica mi skill daily-standup al marketplace"
- "Que tools hay disponibles para crear una skill?"

---

### 1.8 Scheduling (1 tool multi-accion) — Skill: `scheduling`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `manage_scheduled_task` | Gestionar tareas programadas | `action` (obligatorio: create/list/cancel/get/pause/resume) | Tool unica con multiples acciones |

**Parametros por accion**:

| Accion | Parametros adicionales |
|--------|----------------------|
| `create` | `prompt` (obligatorio), `scheduled_for` (ISO UTC, para one-shot), `recurrence_interval` (CRON, para recurrente), `project_id`, `thread_id`, `visibility` (public/private), `required_skills` |
| `list` | `limit` (1-50, default 10) |
| `cancel` | `task_id` (obligatorio) |
| `get` | `task_id` (obligatorio) |
| `pause` | `task_id` (obligatorio, solo recurrentes) |
| `resume` | `task_id` (obligatorio, solo recurrentes) |

**Ejemplo de prueba via chat**:
- "Programame un recordatorio para manana a las 9am que diga: revisar emails"
- "Crea una tarea recurrente cada lunes a las 8am que revise mis tareas de la semana"
- "Lista mis tareas programadas"
- "Pausa la tarea programada X"

---

### 1.9 Busqueda de Documentos (1 tool) — Global (siempre disponible)

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `search_documents` | Buscar documentos por fecha | `start_date` (obligatorio, YYYY-MM-DD), `end_date` (obligatorio, YYYY-MM-DD), `limit` (1-100, default 20) | Filtro por rango de fechas |

---

### 1.10 Busqueda Web (1 tool) — Skill: `web-research`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `search_web` | Buscar en internet via Tavily | `query` (obligatorio), `days_back` (1-30, default 1), `topic` (general/news), `include_answer` (false/basic/advanced) | Requiere API key de Tavily configurada |

**Ejemplo de prueba via chat**:
- "Busca en internet las ultimas noticias sobre inteligencia artificial"
- "Que tiempo hara manana en Madrid?"

---

### 1.11 Busqueda Semantica (1 tool) — Skill: `semantic-search`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `ragie_search` | Busqueda semantica via Ragie | `query` (obligatorio), `context_type` (general/personal/work, default general), `document_type` (TXT/PDF/DOCX, opcional), `document_name` (opcional) | Busqueda en base de conocimiento externa |

**Ejemplo de prueba via chat**:
- "Busca en mis documentos informacion sobre arquitectura de microservicios"

---

### 1.12 HTTP Client (1 tool) — Skill: `http-client`

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `http_request` | Ejecutar request HTTP | `url` (obligatorio, http/https), `method` (GET/POST/PUT/DELETE/PATCH, default GET), `headers`, `body` (JSON string), `timeout` (1-30s, default 10), `follow_redirects` (default true) | Seguro: solo HTTP/HTTPS |

**Ejemplo de prueba via chat**:
- "Haz un GET a https://api.github.com/users/octocat"
- "Envia un POST a mi API con el body {\"name\": \"test\"}"

---

### 1.13 List Skills (1 tool) — Global (siempre disponible)

| Tool | Accion | Parametros clave | Notas |
|------|--------|-----------------|-------|
| `list_skills` | Listar skills disponibles | (sin parametros) | Builtin + custom, excluye deshabilitadas. No muestra IDs al usuario |

---

## 2. Sistema de Skills (15 builtin)

Las skills agrupan herramientas y proporcionan instrucciones al agente sobre como usarlas.

### Modos de seleccion de skills

| Modo | Descripcion | Cuando se usa |
|------|-------------|---------------|
| **auto** | Seleccion automatica por embedding + filtro LLM | Por defecto en cada mensaje |
| **manual** | IDs especificos forzados por el frontend | Cuando el usuario selecciona skills manualmente |
| **all** | Todas las skills activas | Modo avanzado |

**Comportamiento acumulativo**: Las skills seleccionadas en turnos anteriores de la conversacion se mantienen activas.

### Tabla de Skills

| # | Skill | Always On | Dependencias | Tools | Descripcion |
|---|-------|-----------|-------------|-------|-------------|
| 1 | `task-management` | No | - | create_task, update_task, delete_task, search_tasks, get_task | Gestion completa de tareas personales |
| 2 | `event-management` | No | - | create_event, update_event, delete_event, search_events, get_event | Gestion de eventos de calendario |
| 3 | `habit-management` | No | - | create_habit, update_habit, delete_habit | Gestion de habitos recurrentes |
| 4 | `project-management` | No | - | create_project, update_project, get_all_projects | Gestion de proyectos con reglas y objetivos |
| 5 | `file-manager` | **Si** | - | create_file, read_file, edit_file, list_files, delete_file | Gestion de archivos del usuario |
| 6 | `credential-vault` | **Si** | - | store_credential, get_credential, list_credentials, delete_credential | Almacen seguro de credenciales |
| 7 | `user-memory` | **Si** | file-manager | (sin tools propias) | Gestion de perfil y memoria del usuario via archivos |
| 8 | `scheduling` | No | - | manage_scheduled_task | Programacion de tareas one-shot y CRON |
| 9 | `heartbeat` | No | file-manager | manage_scheduled_task, search_tasks, search_events, search_memory | Check-ins proactivos autonomos |
| 10 | `complex-task-planning` | No | - | create_task, update_task, search_tasks, search_events | Planificacion de actividades complejas multi-paso |
| 11 | `web-research` | No | - | search_web | Busqueda de informacion en internet via Tavily |
| 12 | `semantic-search` | No | - | ragie_search | Busqueda semantica en base de conocimiento |
| 13 | `http-client` | No | - | http_request | Ejecucion de requests HTTP a APIs externas |
| 14 | `skill-creator` | No | - | create_custom_skill, update_custom_skill, delete_custom_skill, publish_custom_skill, get_my_skills, list_available_tools | Creacion y gestion de skills personalizadas |
| 15 | `organizer` | No | project-management | (sin tools propias) | Organizar contenido en proyectos |

### Skills Always-On

Las skills marcadas como **always on** (`file-manager`, `credential-vault`, `user-memory`) se inyectan en TODAS las interacciones sin necesidad de ser seleccionadas. Sus herramientas estan siempre disponibles para el agente.

---

## 3. Features del Workflow

### 3.1 Canvas (Editor AI)

**Que es**: Un editor de texto/codigo integrado en el chat donde la IA puede generar y modificar contenido.

**Como probar**:
1. El frontend envia datos de canvas en el estado (campo `canvas` con `is_active: true`)
2. El usuario da una instruccion como "Escribe un ensayo sobre..." o "Genera codigo Python para..."
3. El agente procesa la instruccion y genera/modifica el contenido del canvas
4. Se emite un evento SSE `canvas_update` con el contenido actualizado y numero de version

**Datos del evento `canvas_update`**:
```json
{
  "event": "canvas_update",
  "data": {
    "canvas": {
      "content": "contenido generado...",
      "version": 2,
      "title": "Titulo opcional",
      "summary": "Resumen de cambios"
    }
  }
}
```

**Verificaciones**:
- El contenido se genera correctamente segun la instruccion
- La version se incrementa con cada cambio
- El evento SSE se emite correctamente
- Si no hay canvas activo, el nodo se salta sin errores

---

### 3.2 Complex Task Planner

**Que es**: Un planificador que genera planes estructurados multi-paso para actividades complejas.

**Tipos de planificacion soportados**:

| Tipo | Valor | Palabras clave de activacion |
|------|-------|------------------------------|
| ROUTINE | `routine` | rutina, routine, habito diario, daily habit, morning routine, evening routine |
| TRIP | `trip` | viaje, trip, travel, itinerario, itinerary, vacation, holiday |
| DAY_ORGANIZATION | `day_organization` | organizar dia, plan my day, organiza mi dia, schedule, organize day, time block |
| PROJECT | `project` | (sin deteccion automatica por keywords) |
| WEEK_PLANNING | `week_planning` | (sin deteccion automatica por keywords) |

**Flujo de confirmacion** (importante para QA):
1. El agente detecta que la solicitud requiere planificacion compleja
2. Genera un plan con tareas, duraciones, prioridades y dependencias
3. Presenta el plan al usuario y espera confirmacion
4. El usuario puede: **confirmar** (se crean las tareas), **modificar** (se ajusta el plan), o **rechazar** (se descarta)
5. Solo si el usuario confirma, se crean las tareas reales

**Estructura del plan generado**:
- `plan_name`: Nombre descriptivo
- `plan_type`: Tipo de planificacion
- `tasks`: Lista de tareas, cada una con:
  - `name`, `description`, `duration_minutes`, `priority` (low/medium/high/urgent)
  - `depends_on` (lista de nombres de tareas prerequisito)
  - `suggested_time`, `category`
- `summary`: Resumen para el usuario
- `estimated_total_duration`: Duracion total estimada en minutos

**Como probar**:
- "Organizame el dia de manana" -> debe generar plan tipo DAY_ORGANIZATION
- "Planifica mi viaje a Barcelona la proxima semana" -> debe generar plan tipo TRIP
- "Crea una rutina de ejercicio matutina" -> debe generar plan tipo ROUTINE
- Verificar que pide confirmacion antes de crear tareas
- Verificar que responde correctamente a confirm/modify/reject

---

### 3.3 Sumarizacion de Conversacion

**Que es**: Compresion automatica del historial cuando la conversacion se vuelve larga.

**Cuando se activa**: Cuando el contexto de mensajes excede el umbral de caracteres (configurable, default ~16,000 caracteres).

**Comportamiento**:
- Se ejecuta automaticamente, transparente para el usuario
- Preserva informacion esencial de la conversacion
- Optimiza el uso de contexto del LLM para mantener calidad de respuestas

**Como verificar**:
- Tener una conversacion larga (15+ mensajes) y verificar que las respuestas siguen siendo coherentes
- El agente no debe "olvidar" informacion clave mencionada al inicio de la conversacion

---

### 3.4 Generacion de Titulo del Hilo

**Que es**: Generacion automatica de un titulo descriptivo para cada hilo de conversacion.

**Cuando se activa**:
- En el primer mensaje de un hilo nuevo
- O en el segundo mensaje si el primero tiene menos de 20 caracteres

**Evento SSE**:
```json
{
  "event": "title_update",
  "data": {
    "thread_id": "uuid-del-hilo",
    "title": "Titulo generado automaticamente"
  }
}
```

**Como probar**:
- Crear un nuevo hilo con un mensaje descriptivo -> verificar que se genera titulo relevante
- Crear un hilo con "Hola" (< 20 chars) -> verificar que el titulo se genera en el segundo mensaje

---

### 3.5 Entity References (@ mentions)

**Que es**: Sistema de menciones para referenciar entidades existentes en el mensaje.

**Tipos de referencia soportados**:

| Tipo | Ejemplo de uso |
|------|---------------|
| `task` | "@tarea:task_id" para referenciar una tarea existente |
| `event` | "@evento:event_id" para referenciar un evento |
| `habit` | "@habito:habit_id" para referenciar un habito |
| `source` | "@fuente:source_id" para referenciar una fuente |

**Comportamiento**:
- El frontend envia las referencias junto con el mensaje
- El agente enriquece el mensaje con los datos completos de la entidad referenciada
- Permite al agente tener contexto completo sobre las entidades mencionadas

**Como probar**:
- Enviar un mensaje con referencia a una tarea existente: "Actualiza @tarea:abc123 y ponla como completada"
- Verificar que el agente accede a los datos de la entidad referenciada

---

### 3.6 Seleccion de Skills

**Que es**: Sistema inteligente que determina que skills (y por tanto que herramientas) activar para cada mensaje.

**Proceso**:
1. **Skill Selector**: Busqueda por embedding semantico + keywords para encontrar skills candidatas
2. **Skill Filter**: LLM filtra las candidatas y selecciona las mas relevantes
3. **Skills acumulativas**: Skills seleccionadas en turnos previos se mantienen activas

**Modos**:
- `auto`: Seleccion automatica (por defecto)
- `manual`: Skills especificas forzadas por el frontend (via IDs)
- `all`: Todas las skills activas

**Skills always-on**: `file-manager`, `credential-vault`, `user-memory` se inyectan siempre, independientemente del modo.

**Como probar**:
- "Crea una tarea" -> debe activar `task-management`
- "Busca en internet sobre X" -> debe activar `web-research`
- "Guarda esta API key" -> debe usar `credential-vault` (always-on)
- Verificar acumulacion: si en turno 1 se activa `task-management` y en turno 2 pido algo de eventos, ambas skills deben estar activas

---

### 3.7 Context Retrieval (Primer Mensaje)

**Que es**: En el primer mensaje de cada conversacion, el agente carga contexto expandido del usuario.

**Datos que se cargan**:
- Nombre del usuario
- Archivos de memoria: `USER_PROFILE.md`, `MEMORY.md` global, `MEMORY.md` por proyecto activo
- Tareas activas (status `pending` o `in_progress`)
- Habitos activos
- Eventos proximos (siguiente 7 dias)
- Documentos recientes
- Proyecto activo del hilo + archivos del usuario

**Como probar**:
- Iniciar conversacion nueva y preguntar "Que tareas tengo pendientes?" -> debe mostrar tareas sin usar tool de busqueda (ya las tiene en contexto)
- Verificar que el agente conoce el nombre del usuario desde el primer mensaje
- Verificar que los eventos proximos se mencionan correctamente

---

### 3.8 Proyecto Activo del Hilo

**Que es**: Cada hilo de chat puede tener un proyecto asociado que influye en el contexto del agente.

**Comportamiento**:
- El proyecto se asigna via API (`PUT /chat/threads/{id}/project`)
- Cuando hay proyecto activo, se carga la memoria especifica del proyecto
- Las operaciones del agente pueden asociarse automaticamente al proyecto

**Como probar**:
- Asignar un proyecto a un hilo y verificar que el agente tiene contexto del proyecto
- Cambiar el proyecto y verificar que el contexto se actualiza

---

### 3.9 User Memory (Skill always-on)

**Que es**: Sistema de memoria persistente del usuario implementado via archivos.

**Archivos de memoria**:
- `USER_PROFILE.md`: Perfil del usuario (nombre, preferencias, etc.)
- `MEMORY.md` (global): Memoria global del usuario
- `MEMORY.md` (por proyecto): Memoria especifica de cada proyecto

**Comportamiento**:
- Depende de la skill `file-manager` para leer/escribir archivos
- El agente puede actualizar la memoria basandose en la conversacion
- La memoria persiste entre sesiones

**Como probar**:
- "Recuerda que prefiero las reuniones por la manana"
- En una conversacion futura, verificar que el agente recuerda esta preferencia
- "Mi nombre es Juan" -> verificar que se guarda en el perfil

---

## 4. Resumen de Conteos para Verificacion

| Categoria | Cantidad |
|-----------|----------|
| Tools totales | 37 |
| Skills builtin | 15 |
| Skills always-on | 3 (file-manager, credential-vault, user-memory) |
| Tools globales (siempre disponibles) | 3 (search_documents, manage_scheduled_task, list_skills) |
| Tools de skills | 34 |
| Tipos de planificacion compleja | 5 (routine, trip, day_organization, project, week_planning) |
| Tipos de entity reference | 4 (task, event, habit, source) |
| Modos de seleccion de skills | 3 (auto, manual, all) |
