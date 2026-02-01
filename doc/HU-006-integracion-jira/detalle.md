# HU-006: Integración con Jira

## Descripción
Como usuario de TestFarm (Plan Team+), quiero poder sincronizar los hallazgos a Jira para que mi equipo pueda gestionarlos en su flujo de trabajo habitual.

## Objetivo
Implementar integración con Jira similar a la existente con Trello:
- Conectar cuenta de Jira via OAuth
- Seleccionar proyecto de Jira
- Mapear tipos de hallazgos a tipos de issues
- Sincronizar hallazgos como issues
- Tracking de issues ya sincronizados

## Criterios de Aceptación

### Conexión
- [ ] OAuth 2.0 con Atlassian
- [ ] Listar proyectos del usuario
- [ ] Seleccionar proyecto destino
- [ ] Guardar credenciales de forma segura

### Mapeo
- [ ] Analizar tipos de issues del proyecto
- [ ] Mapear severidad a prioridad de Jira
- [ ] Mapear tipo de hallazgo a tipo de issue
- [ ] Configurar campos custom si aplica

### Sincronización
- [ ] Preview de hallazgos a sincronizar
- [ ] Crear issues en Jira
- [ ] Incluir descripción, evidencia, URL
- [ ] Adjuntar screenshots si disponibles
- [ ] Marcar hallazgos como sincronizados
- [ ] Link bidireccional (hallazgo ↔ issue)

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/integrations/jira/auth/:projectId | Iniciar OAuth |
| GET | /api/integrations/jira/callback | Callback OAuth |
| GET | /api/integrations/jira/:projectId/status | Ver estado |
| GET | /api/integrations/jira/:projectId/projects | Listar proyectos Jira |
| POST | /api/integrations/jira/:projectId/project | Seleccionar proyecto |
| POST | /api/integrations/jira/:projectId/analyze | Analizar proyecto |
| GET | /api/integrations/jira/:projectId/sync-preview | Preview sync |
| POST | /api/integrations/jira/:projectId/sync | Sincronizar |
| DELETE | /api/integrations/jira/:projectId | Desconectar |

## Estimación
- Configuración Atlassian App: 1 día
- Backend OAuth + endpoints: 3-4 días
- Frontend UI: 2-3 días
- Testing: 1-2 días
- **Total: 1-2 semanas**

## Dependencias
- HU-002: Sistema de Billing (feature de Plan Team+)
- Referencia: Integración Trello existente

## Notas
- Usar Jira REST API v3
- Considerar Jira Cloud vs Server
- Rate limits de Jira API
