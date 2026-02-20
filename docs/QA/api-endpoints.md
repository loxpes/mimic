# API Endpoints y Eventos SSE - Guia de QA

## Autenticacion

Todos los endpoints (excepto `/health`, `/` y los internos) requieren autenticacion Firebase:

```
Authorization: Bearer <firebase_id_token>
```

Los endpoints internos (`/api/internal/*`) usan autenticacion OIDC y estan excluidos de Firebase auth.

---

## 1. Chat

**Prefijo**: `/api/v1/chat`

| Metodo | Path | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/chat/message` | Enviar mensaje al agente Evy | Firebase |
| GET | `/chat/` | Listar hilos de conversacion del usuario | Firebase |
| GET | `/chat/threads/{thread_id}/history` | Obtener historial de un hilo (mensajes + entidades) | Firebase |
| PUT | `/chat/threads/{thread_id}/title` | Actualizar titulo del hilo | Firebase |
| GET | `/chat/threads/{thread_id}/project` | Obtener proyecto asignado al hilo | Firebase |
| PUT | `/chat/threads/{thread_id}/project` | Asignar proyecto al hilo | Firebase |
| DELETE | `/chat/threads/{thread_id}` | Eliminar hilo y checkpoints | Firebase |

### POST /chat/message (detalle)

**Content-Type**: `application/json` o `multipart/form-data` (para upload de archivos)

**Request body (JSON)**:
```json
{
  "input": "texto del mensaje",
  "thread_id": "uuid-opcional",
  "project_id": "uuid-opcional",
  "references": [],
  "skill_mode": "auto",
  "skill_ids": [],
  "selected_llm": "nombre-modelo-opcional",
  "canvas": {}
}
```

**Headers opcionales**:
| Header | Ejemplo | Descripcion |
|--------|---------|-------------|
| Accept-Language | `es,en;q=0.9` | Idioma preferido |
| X-Timezone | `America/Mexico_City` | Zona horaria del usuario |
| X-City | `Mexico City` | Ciudad del usuario |
| X-Country | `Mexico` | Pais del usuario |

**Response**: SSE stream (ver seccion de Eventos SSE)

**Codigos de respuesta**:
- `200`: Stream iniciado correctamente
- `401`: Token de autenticacion invalido o ausente
- `422`: Datos de entrada invalidos

### GET /chat/threads/{thread_id}/history (detalle)

**Response**: JSON con mensajes filtrados y datos de entidades publicas.

```json
{
  "thread_title": "Titulo del hilo",
  "messages": [...],
  "searched_tasks": [...],
  "created_tasks": [...],
  "updated_tasks": [...],
  "deleted_tasks": [...],
  "searched_events": [...],
  "created_events": [...],
  "updated_events": [...],
  "deleted_events": [...],
  "searched_documents": [...],
  "created_habits": [...],
  "updated_habits": [...],
  "deleted_habits": [...]
}
```

---

## 2. Global Chat

**Prefijo**: `/api/v1/global-chat`

| Metodo | Path | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/global-chat/message` | Enviar mensaje al chat global (1 hilo por usuario) | Firebase |
| GET | `/global-chat/history` | Obtener historial del chat global | Firebase |

**Diferencia con chat normal**: El chat global usa `thread_id = user_id` (un unico hilo por usuario). Los resultados de tareas programadas y heartbeats se guardan aqui.

---

## 3. Documents

**Prefijo**: `/api/v1/documents`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/documents` | Crear documento | 201 + documento creado |
| GET | `/documents` | Listar documentos del usuario | 200 + lista |
| GET | `/documents/{document_id}` | Obtener documento por ID | 200 + documento |
| PATCH | `/documents/{document_id}` | Actualizar parcialmente | 200 + documento actualizado |
| DELETE | `/documents/{document_id}` | Eliminar documento | 204 |

**Campos del documento**:
- `title`, `content`, `tags`, `importance` (low/medium/high), `summary`, `image_preview`, `links`, `attachments`

---

## 4. Tasks

**Prefijo**: `/api/v1/tasks`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/tasks` | Crear tarea | 201 + tarea creada |
| GET | `/tasks` | Listar tareas del usuario | 200 + lista |
| GET | `/tasks/{task_id}` | Obtener tarea por ID | 200 + tarea |
| PATCH | `/tasks/{task_id}` | Actualizar tarea | 200 + tarea actualizada |
| DELETE | `/tasks/{task_id}` | Eliminar tarea | 204 |

**Campos de la tarea**:
- `name`, `description`, `start_date`, `end_date`, `tags`, `reminders`, `progress` (0-100), `status` (pending/in_progress/completed/paused), `parent_id`, `subtasks`, `is_important`, `project_id`

---

## 5. Events

**Prefijo**: `/api/v1/events`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/events` | Crear evento | 201 + evento creado |
| GET | `/events` | Listar eventos del usuario | 200 + lista |
| GET | `/events/{event_id}` | Obtener evento por ID | 200 + evento |
| PATCH | `/events/{event_id}` | Actualizar evento | 200 + evento actualizado |
| DELETE | `/events/{event_id}` | Eliminar evento | 200 + mensaje confirmacion |

**Campos del evento**:
- `description`, `start_time`, `end_time`, `time_zone`, `location`, `status` (confirmed/tentative/cancelled), `attendees`, `creator`, `reminders`, `recurrence`, `visibility` (public/private/shared)

---

## 6. Habits

**Prefijo**: `/api/v1/habits`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/habits` | Crear habito | 201 + habito creado |
| GET | `/habits` | Listar habitos del usuario | 200 + lista |
| GET | `/habits/{habit_id}` | Obtener habito por ID | 200 + habito |
| PATCH | `/habits/{habit_id}` | Actualizar habito | 200 + habito actualizado |
| DELETE | `/habits/{habit_id}` | Eliminar habito | 200 + mensaje confirmacion |

**Campos del habito**:
- `name`, `description`, `recurrence` (iCalendar RRULE), `status`, `streak_count`, `next_execution`

---

## 7. Projects

**Prefijo**: `/api/v1/projects`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/projects/` | Crear proyecto | 201 + proyecto creado |
| GET | `/projects/` | Buscar proyectos (filtros: `?q=query`, `?ids=id1,id2`) | 200 + lista |
| GET | `/projects/{project_id}` | Obtener proyecto por ID | 200 + proyecto |
| PUT | `/projects/{project_id}` | Actualizar proyecto (completo) | 200 + proyecto actualizado |
| DELETE | `/projects/{project_id}` | Eliminar proyecto | 204 |

**Campos del proyecto**:
- `name`, `color` (hex), `description`, `importance` (low/medium/high), `rules`, `objectives`, `members`, `progress_info`

---

## 8. Skills

**Prefijo**: `/api/v1/skills`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| GET | `/skills/` | Listar skills del usuario (custom + community instaladas) | 200 + lista |
| GET | `/skills/{skill_id}` | Detalle de skill (body, tools, etc.) | 200 + skill |
| POST | `/skills/{skill_id}/toggle` | Activar/desactivar skill | 200 |
| POST | `/skills/custom` | Crear skill custom | 201 |
| PUT | `/skills/custom/{skill_id}` | Actualizar skill custom | 200 |
| DELETE | `/skills/custom/{skill_id}` | Eliminar skill custom | 204 |
| POST | `/skills/custom/{skill_id}/publish` | Publicar al marketplace | 200 |
| GET | `/skills/marketplace` | Navegar marketplace comunitario | 200 + lista |
| POST | `/skills/marketplace/{skill_id}/install` | Instalar skill del marketplace | 200 |
| DELETE | `/skills/marketplace/{skill_id}/uninstall` | Desinstalar skill comunitaria | 204 |

---

## 9. Scheduled Tasks

**Prefijo**: `/api/v1/scheduled-tasks`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/scheduled-tasks/` | Crear tarea programada (one-shot o CRON) | 201 |
| GET | `/scheduled-tasks/` | Listar tareas programadas (one-shot + recurrentes) | 200 + lista |
| DELETE | `/scheduled-tasks/{task_name}` | Cancelar tarea programada | 200 |
| PUT | `/scheduled-tasks/{task_name}/pause` | Pausar tarea recurrente | 200 |
| PUT | `/scheduled-tasks/{task_name}/resume` | Reanudar tarea recurrente pausada | 200 |

---

## 10. Search

**Prefijo**: `/api/v1`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| GET | `/search` | Busqueda semantica cross-entidades | 200 + resultados |

**Query parameters**:
- `query_text` (obligatorio): texto de busqueda
- `type`: tipo de entidad (document/task/event)
- `tags`: filtro por tags
- `importance`: filtro por importancia
- `date_from`, `date_to`: rango de fechas
- `limit`: maximo de resultados

---

## 11. Sources

**Prefijo**: `/api/v1`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| GET | `/sources` | Listar fuentes del usuario | 200 + lista |

---

## 12. Organizer

**Prefijo**: `/api/v1`

| Metodo | Path | Descripcion | Response |
|--------|------|-------------|----------|
| POST | `/agents/organize/invoke` | Organizacion AI de contenido en proyectos | 200 |

---

## 13. Auth

**Prefijo**: `/api/v1/auth`

| Metodo | Path | Descripcion | Response | Notas |
|--------|------|-------------|----------|-------|
| POST | `/auth/login` | Login mock Firebase | 200 | Solo disponible en entorno local/dev |

---

## 14. Admin

**Prefijo**: `/api/v1/admin`

| Metodo | Path | Descripcion |
|--------|------|-------------|
| GET | `/admin/costs/daily` | Metricas de costo diario (?date=YYYY-MM-DD) |
| GET | `/admin/costs/models` | Metricas de costo por modelo |
| GET | `/admin/costs/alerts` | Alertas de presupuesto |
| GET | `/admin/costs/summary` | Resumen completo de costos |
| GET | `/admin/llm/models` | Modelos LLM disponibles y configuracion |
| GET | `/admin/llm/models/by-tags` | Modelos filtrados por tags |
| POST | `/admin/llm/reload-config` | Recargar configuracion LLM en runtime |
| GET | `/admin/system/health` | Salud del sistema (LLM + costos + Firebase) |

---

## 15. Configuration

**Prefijo**: `/api/v1/config`

| Metodo | Path | Descripcion |
|--------|------|-------------|
| GET | `/config/current` | Configuracion actual (settings, sources, debug) |
| GET | `/config/refresh` | Forzar recarga de configuracion |
| GET | `/config/health` | Estado de salud de la configuracion |

---

## 16. Health y Root

| Metodo | Path | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/` | Endpoint raiz con info de API | No requiere |
| GET | `/health` | Health check | No requiere |

---

## 17. Endpoints Internos

**Prefijo**: `/api/internal`
**Auth**: OIDC (no Firebase)

| Metodo | Path | Descripcion |
|--------|------|-------------|
| POST | `/api/internal/heartbeat/dispatch` | Despachar heartbeats para todos los usuarios activos |
| POST | `/api/internal/heartbeat/execute` | Ejecutar heartbeat individual (usuario + proyecto opcional) |
| POST | `/api/internal/scheduled-tasks/execute` | Ejecutar tarea programada individual |
| POST | `/api/internal/recurring-tasks/dispatch` | Despachar todas las tareas recurrentes vencidas |
| POST | `/api/internal/maintenance/cleanup` | Limpiar checkpoints antiguos (TTL 30 dias) |

---

## Eventos SSE

Los eventos SSE se reciben en el stream de respuesta de `POST /chat/message` y `POST /global-chat/message`.

### Tipos de Eventos

| Evento | Descripcion | Cuando se emite |
|--------|-------------|-----------------|
| `evy_message` | Texto generado por el agente (streaming incremental) | Continuamente mientras el agente genera texto |
| `evy_thought` | Razonamiento/thinking del modelo | Cuando el LLM usa extended thinking |
| `title_update` | Titulo de hilo generado | Primera interaccion en hilo nuevo |
| `canvas_update` | Canvas actualizado (contenido + version) | Cuando el nodo canvas procesa contenido |
| `error` | Error general | En caso de error de procesamiento |
| `error` (premium_limit_exceeded) | Limite de presupuesto premium excedido | Cuando el usuario supera su limite mensual |
| `error` (content_too_large) | Contenido demasiado grande | Cuando el input excede el limite de tamano |

### Formato de Cada Evento

**`evy_message`**:
```json
{
  "event": "evy_message",
  "data": {
    "messages": ["texto acumulado hasta ahora"],
    "metadata": {"langgraph_node": "dynamic_evy_agent"},
    "accumulated_content": "texto completo acumulado"
  }
}
```

**`evy_thought`**:
```json
{
  "event": "evy_thought",
  "data": {
    "thought": "razonamiento del modelo...",
    "metadata": {}
  }
}
```

**`title_update`**:
```json
{
  "event": "title_update",
  "data": {
    "thread_id": "uuid-del-hilo",
    "title": "Titulo generado"
  }
}
```

**`canvas_update`**:
```json
{
  "event": "canvas_update",
  "data": {
    "canvas": {
      "content": "contenido del canvas...",
      "version": 2,
      "title": "Titulo",
      "summary": "Resumen de cambios"
    }
  }
}
```

**`error`**:
```json
{
  "event": "error",
  "data": {
    "error": "mensaje de error"
  }
}
```

**`error` (premium_limit_exceeded)**:
```json
{
  "event": "error",
  "data": {
    "error": "premium_limit_exceeded",
    "error_type": "premium_limit_exceeded",
    "message": "Has alcanzado tu limite mensual...",
    "current_cost": 10.50,
    "limit": 10.00,
    "month": "2025-01",
    "plan": "free"
  }
}
```

**`error` (content_too_large)**:
```json
{
  "event": "error",
  "data": {
    "error": "content_too_large",
    "error_type": "content_too_large"
  }
}
```

### Nodos que Emiten Eventos

Solo los siguientes nodos del workflow emiten `evy_message`:
- `dynamic_evy_agent`
- `evy_agent`
- `agent`

Los siguientes nodos estan **excluidos** del streaming de mensajes:
- `organize`
- `explicit_project_check`
- `retrieve_projects`

### Modos de Streaming

| Modo | Variable | Eventos |
|------|----------|---------|
| Produccion | `STREAM_INTERMEDIATE_EVENTS=False` | Solo `title_update`, tokens LLM (`evy_message`), `end` |
| Desarrollo | `STREAM_INTERMEDIATE_EVENTS=True` | Todos los eventos LangGraph (start, message, chunk, end, error) |

---

## Resumen de Conteos

| Categoria | Cantidad |
|-----------|----------|
| Endpoints de Chat | 9 (7 chat + 2 global chat) |
| Endpoints CRUD de Entidades | 25 (5 documents + 5 tasks + 5 events + 5 habits + 5 projects) |
| Endpoints de Skills | 10 |
| Endpoints de Scheduled Tasks | 5 |
| Endpoints de Admin | 8 |
| Endpoints de Config | 3 |
| Endpoints Internos | 5 |
| Otros (search, sources, organizer, auth, health, root) | 6 |
| **Total endpoints** | **~68** |
| Tipos de eventos SSE | 6 (evy_message, evy_thought, title_update, canvas_update, error, error subtypes) |
