# HU-009: API Pública para CI/CD

## Descripción
Como desarrollador, quiero poder integrar TestFarm en mi pipeline de CI/CD para ejecutar pruebas automáticamente en cada deploy.

## Objetivo
Exponer una API pública con autenticación por API Key que permita:
- Crear y ejecutar sesiones programáticamente
- Consultar estado y resultados
- Webhooks para notificaciones
- Integración con GitHub Actions, GitLab CI, etc.

## Funcionalidades

### Autenticación
- Generar API Keys desde Settings
- Múltiples keys por usuario
- Revocar keys
- Scopes/permisos por key

### Endpoints Públicos
- Crear sesión
- Listar sesiones
- Ver estado de sesión
- Ver hallazgos de sesión
- Crear proyecto
- Ejecutar sesión batch

### Webhooks
- Configurar URL de webhook
- Eventos: session.completed, session.failed, finding.created
- Firma para verificación
- Reintentos automáticos

### Ejemplos de Integración
- GitHub Action oficial
- GitLab CI template
- CLI para uso local

## Criterios de Aceptación
- [ ] Generar API Key desde UI
- [ ] Autenticación con Bearer token
- [ ] Rate limiting por key
- [ ] Documentación OpenAPI/Swagger
- [ ] Ejemplo de GitHub Action
- [ ] Webhooks configurables
- [ ] Logs de uso de API

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/v1/sessions | Crear sesión |
| GET | /api/v1/sessions/:id | Ver sesión |
| POST | /api/v1/sessions/:id/start | Iniciar sesión |
| GET | /api/v1/sessions/:id/findings | Ver hallazgos |
| POST | /api/v1/webhooks | Configurar webhook |
| DELETE | /api/v1/webhooks/:id | Eliminar webhook |

## Modelo de Datos

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  key_hash VARCHAR(255), -- bcrypt del key
  key_prefix VARCHAR(10), -- primeros chars para identificar
  scopes TEXT[], -- ['sessions:read', 'sessions:write']
  last_used_at TIMESTAMP,
  created_at TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  url VARCHAR(500) NOT NULL,
  events TEXT[], -- ['session.completed', 'finding.created']
  secret VARCHAR(255), -- para firmar
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);
```

## Estimación
- API Keys (backend + UI): 2 días
- Endpoints públicos: 2 días
- Webhooks: 2 días
- Documentación: 1 día
- GitHub Action: 1 día
- **Total: 1-2 semanas**

## Dependencias
- HU-001: Sistema de Autenticación
- HU-002: Sistema de Billing (feature Team+)

## Notas
- Versionado de API (/api/v1/)
- Deprecation policy clara
- SDK en JavaScript/TypeScript
