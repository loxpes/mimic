# Sistemas Internos: Scheduler, Heartbeat y Mantenimiento - Guia de QA

## Resumen

El sistema de scheduling de Evy permite programar acciones para ejecucion futura. Se basa en **Google Cloud Tasks** para ejecucion diferida y **Firebase Firestore** para persistencia de tareas recurrentes. Los resultados se guardan automaticamente en el **chat global** del usuario.

---

## 1. Tareas One-Shot (Ejecucion Unica)

### Descripcion
Una tarea one-shot se ejecuta una sola vez a una hora especifica. Tras ejecutarse, desaparece.

### Flujo Completo

```
Usuario/Agente solicita tarea programada
        |
        v
ScheduledTaskService.create()
        |
        v
Valida parametros (prompt, scheduled_for en UTC)
        |
        v
Encola en GCP Cloud Tasks (cola: scheduled-task-execution)
con schedule_time = hora programada
        |
        v
[Espera hasta la hora programada]
        |
        v
Cloud Tasks llama: POST /api/internal/scheduled-tasks/execute
        |
        v
CloudTaskExecutor recibe payload
        |
        v
AgentExecutionStrategy (EvyAgentStrategy)
        |
        v
EvyService.process_request_oneshot() con ExecutionMode.SCHEDULER
        |
        v
Resultado guardado en chat global del usuario
(via GlobalChatPersistenceManager)
```

### Restricciones
- Maximo 30 dias en el futuro
- El prompt es obligatorio
- La hora debe estar en formato ISO 8601 UTC

### Como Crear (via chat)
- "Recuerdame manana a las 9am revisar mis emails"
- "Programa para el viernes a las 3pm un resumen de mis tareas"

### Como Crear (via API)
```
POST /api/v1/scheduled-tasks/
{
  "prompt": "Revisa mis tareas pendientes y dame un resumen",
  "scheduled_for": "2025-02-19T09:00:00Z",
  "visibility": "private"
}
```

### Verificaciones QA
- La tarea se crea correctamente y aparece en la lista
- La tarea se ejecuta a la hora programada (con tolerancia de segundos)
- El resultado aparece en el chat global del usuario
- La tarea desaparece de la lista tras ejecutarse
- Error si `scheduled_for` es en el pasado
- Error si `scheduled_for` es mas de 30 dias en el futuro
- Error si falta el `prompt`

---

## 2. Tareas Recurrentes (CRON)

### Descripcion
Una tarea recurrente se ejecuta periodicamente segun un patron CRON. Persiste en Firestore y se despacha automaticamente.

### Flujo Completo

```
Usuario/Agente crea tarea recurrente
        |
        v
ScheduledTaskService.create()
        |
        v
Calcula next_run_at usando croniter + timezone del usuario
        |
        v
Guarda en Firestore (coleccion: recurring_scheduled_tasks)
con status: active
        |
        v
[Cloud Scheduler llama periodicamente]
        |
        v
POST /api/internal/recurring-tasks/dispatch
        |
        v
RecurringDispatchService busca tareas con next_run_at <= now
(tolerancia: no mas de 2 minutos de retraso)
        |
        v
Marca cada tarea como dispatched (last_dispatched_at = now)
        |
        v
Encola Cloud Task para cada tarea vencida
        -> POST /api/internal/scheduled-tasks/execute
        |
        v
CloudTaskExecutor ejecuta la tarea
        |
        v
Resultado guardado en chat global
        |
        v
Avanza next_run_at al siguiente ciclo CRON
```

### Entidad: RecurringScheduledTask

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `task_id` | str | ID unico |
| `user_id` | str | Propietario |
| `prompt` | str | Instrucciones para el agente |
| `cron_schedule` | str | Patron CRON (ej: `0 9 * * *` = cada dia a las 9am) |
| `timezone` | str | Zona horaria del usuario (ej: `America/Mexico_City`) |
| `agent_type` | str | Tipo de agente (actualmente solo `evy`) |
| `project_id` | str | Proyecto asociado (opcional) |
| `thread_id` | str | Hilo de conversacion (opcional) |
| `required_skills` | list[str] | Skills que la tarea necesita |
| `status` | str | active / paused / cancelled |
| `next_run_at` | datetime | Proxima ejecucion programada |
| `last_run_at` | datetime | Ultima ejecucion |
| `last_dispatched_at` | datetime | Ultimo despacho |

### Estados de Tareas Recurrentes

```
active  --pause-->  paused  --resume-->  active
   |                   |
   +---cancel--->  cancelled
                       |
                   [terminal]
```

### Ejemplos de Patrones CRON

| Patron | Significado |
|--------|-------------|
| `0 9 * * *` | Cada dia a las 9:00 AM |
| `0 9 * * 1-5` | Lunes a viernes a las 9:00 AM |
| `30 14 * * 1` | Cada lunes a las 2:30 PM |
| `0 */2 * * *` | Cada 2 horas |
| `0 8 1 * *` | El primero de cada mes a las 8:00 AM |

### Como Crear (via chat)
- "Todos los lunes a las 8am revisa mis tareas de la semana"
- "Cada dia a las 9pm dame un resumen del dia"

### Como Crear (via API)
```
POST /api/v1/scheduled-tasks/
{
  "prompt": "Revisa mis tareas de la semana y dame un resumen",
  "recurrence_interval": "0 8 * * 1",
  "visibility": "private",
  "required_skills": ["task-management"]
}
```

### Operaciones sobre Tareas Recurrentes

| Operacion | Via Chat | Via API |
|-----------|----------|---------|
| Listar | "Muestra mis tareas programadas" | `GET /scheduled-tasks/` |
| Pausar | "Pausa la tarea X" | `PUT /scheduled-tasks/{name}/pause` |
| Reanudar | "Reanuda la tarea X" | `PUT /scheduled-tasks/{name}/resume` |
| Cancelar | "Cancela la tarea X" | `DELETE /scheduled-tasks/{name}` |

### Verificaciones QA
- La tarea se crea con `next_run_at` calculado correctamente segun el CRON y timezone
- Se ejecuta en el ciclo correcto
- `next_run_at` avanza despues de cada ejecucion
- Pausar detiene la ejecucion sin eliminar la tarea
- Reanudar recalcula `next_run_at` desde el momento actual
- Cancelar pone status en `cancelled` (no se puede reactivar)
- Tareas con retraso > 2 minutos se ignoran en el dispatch (proteccion contra ejecuciones acumuladas)
- El resultado aparece en el chat global

---

## 3. Sistema de Heartbeat

### Descripcion
Los heartbeats son check-ins proactivos autonomos que el agente realiza periodicamente para cada usuario (y opcionalmente por proyecto). Si hay algo relevante que reportar, el agente envia un mensaje al chat global.

### Flujo Completo

```
Cloud Scheduler llama periodicamente
        |
        v
POST /api/internal/heartbeat/dispatch
        |
        v
HeartbeatDispatchService itera todos los usuarios activos
        |
        v
Para cada usuario con heartbeat habilitado:
  + Heartbeat global (nivel usuario)
  + Heartbeat por proyecto (para cada proyecto con heartbeat)
        |
        v
Encola Cloud Task para cada heartbeat
  -> POST /api/internal/heartbeat/execute
        |
        v
HeartbeatExecutor recibe payload (user_id, project_id opcional)
        |
        v
Verifica archivo .evy/heartbeat.md:
  - Si existe skip_until > now -> salta el heartbeat
  - Si no existe -> crea el archivo
        |
        v
Ejecuta EvyService.process_request_oneshot()
con ExecutionMode.HEARTBEAT
        |
        v
Si el resultado es solo un marcador de reconocimiento
  -> descarta (nada relevante que reportar)
        |
        v
Si hay contenido relevante
  -> guarda en chat global del usuario
```

### Tipos de Heartbeat

| Tipo | Descripcion | Contexto |
|------|-------------|----------|
| Global | Check-in general del usuario | Tareas pendientes, eventos proximos, habitos |
| Por Proyecto | Check-in especifico de un proyecto | Tareas del proyecto, progreso, deadlines |

### Archivo de Control: `.evy/heartbeat.md`
- Se busca entre los archivos del usuario
- Puede contener `skip_until: YYYY-MM-DD` para saltar heartbeats hasta esa fecha
- El agente puede actualizar este archivo para auto-silenciarse temporalmente

### Frecuencia de Heartbeat por Importancia de Proyecto
Los proyectos con mayor importancia tienen heartbeats mas frecuentes (la frecuencia exacta se configura a nivel de infraestructura).

### Verificaciones QA
- El dispatch genera heartbeats para todos los usuarios activos
- Heartbeats globales se ejecutan correctamente
- Heartbeats por proyecto incluyen contexto especifico del proyecto
- `skip_until` en heartbeat.md efectivamente salta el heartbeat
- Si no hay nada relevante, no se guarda resultado en chat global
- Si hay algo relevante (tarea vencida, evento proximo), aparece en chat global
- Heartbeats se crean automaticamente al crear un proyecto (segun nivel de importancia)

---

## 4. Modos de Ejecucion

El servicio del agente soporta diferentes modos de ejecucion que afectan el comportamiento:

| Modo | Streaming | Checkpointer | Persistencia | Uso |
|------|-----------|--------------|-------------|-----|
| `NORMAL` | Si (SSE) | Supabase | Estado completo | Chat interactivo normal |
| `GLOBAL` | Si (SSE) | No | GlobalChatPersistenceManager | Chat global (1 hilo/usuario) |
| `HEARTBEAT` | No (oneshot) | No | Solo si hay resultado relevante | Heartbeats proactivos |
| `SCHEDULER` | No (oneshot) | No | Resultado en chat global | Tareas programadas |

### Diferencias Clave
- **NORMAL**: El unico modo con checkpointer de Supabase (permite continuidad de conversacion)
- **GLOBAL/SCHEDULER/HEARTBEAT**: Sin checkpointer, no guardan estado de conversacion
- **Oneshot**: Los modos HEARTBEAT y SCHEDULER ejecutan una sola interaccion sin stream

---

## 5. Mantenimiento

### Limpieza de Checkpoints

**Endpoint**: `POST /api/internal/maintenance/cleanup`

**Descripcion**: Elimina checkpoints de conversacion con mas de 30 dias de antiguedad.

**TTL**: 30 dias por defecto.

**Frecuencia**: Invocado periodicamente por Cloud Scheduler.

**Verificaciones QA**:
- Checkpoints mayores a 30 dias se eliminan correctamente
- Checkpoints recientes no se ven afectados
- El endpoint responde con el conteo de checkpoints eliminados

---

## 6. Infraestructura GCP

### Cloud Tasks Client
- Envuelve `google.cloud.tasks_v2.CloudTasksAsyncClient`
- Cola principal: `scheduled-task-execution`
- Autenticacion: OIDC tokens entre servicios
- Modo local: logea en lugar de hacer llamadas reales a GCP

### Cloud Scheduler Client
- Envuelve `google.cloud.scheduler_v1.CloudSchedulerAsyncClient`
- Gestiona jobs periodicos que invocan los endpoints de dispatch
- Modo local disponible para desarrollo

### Modo Local/Desarrollo
En entorno local, ambos clientes operan en `local_mode`:
- No hacen llamadas reales a GCP
- Logean las operaciones que harian
- Permite desarrollo sin infraestructura cloud

---

## 7. Resumen de Verificaciones Criticas

### Tareas One-Shot
- [ ] Creacion con prompt y scheduled_for validos
- [ ] Ejecucion a la hora correcta
- [ ] Resultado en chat global
- [ ] Desaparicion tras ejecucion
- [ ] Validacion de limites (maximo 30 dias)
- [ ] Error con datos invalidos

### Tareas Recurrentes
- [ ] Creacion con patron CRON valido
- [ ] Calculo correcto de next_run_at con timezone
- [ ] Ejecucion periodica segun el CRON
- [ ] Avance de next_run_at tras cada ejecucion
- [ ] Pause/Resume funcionan correctamente
- [ ] Cancel es irreversible
- [ ] Proteccion contra ejecuciones acumuladas (2 min stale)

### Heartbeat
- [ ] Dispatch genera heartbeats para usuarios activos
- [ ] Heartbeat global funciona
- [ ] Heartbeat por proyecto incluye contexto correcto
- [ ] skip_until respetado
- [ ] Resultados irrelevantes descartados
- [ ] Resultados relevantes en chat global

### Mantenimiento
- [ ] Checkpoints > 30 dias eliminados
- [ ] Checkpoints recientes preservados

### Integracion
- [ ] Tareas programadas via chat (agente) funcionan igual que via API
- [ ] required_skills se respetan en ejecucion programada
- [ ] project_id se mantiene en contexto de ejecucion
