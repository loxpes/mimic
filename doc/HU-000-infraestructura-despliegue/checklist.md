# HU-000: Checklist de Seguimiento

## Estado: 🔴 No iniciado

## Containerización
- [ ] Crear Dockerfile para API
- [ ] Crear Dockerfile para Web (nginx)
- [ ] Crear docker-compose.yml
- [ ] Crear .dockerignore
- [ ] Probar build local
- [ ] Probar docker-compose up

## Migración Base de Datos
- [ ] Añadir dependencia `pg` y `drizzle-orm/node-postgres`
- [ ] Crear cliente PostgreSQL alternativo
- [ ] Adaptar conexión según DATABASE_URL
- [ ] Crear script de migración SQLite → PostgreSQL
- [ ] Probar en PostgreSQL local
- [ ] Documentar proceso de migración

## Almacenamiento S3
- [ ] Añadir dependencia `@aws-sdk/client-s3`
- [ ] Modificar `screenshot-storage.ts` para S3
- [ ] Añadir configuración S3 por variables de entorno
- [ ] Fallback a filesystem local si no hay S3
- [ ] Probar subida de screenshots a S3
- [ ] Verificar URLs públicas funcionan

## Redis Pub/Sub
- [ ] Añadir dependencia `ioredis`
- [ ] Crear módulo `redis-pubsub.ts`
- [ ] Modificar SSE para usar Redis pub/sub
- [ ] Mantener fallback in-memory para desarrollo
- [ ] Probar multi-instancia con Redis
- [ ] Configurar heartbeat a través de Redis

## Job Queue (Bull)
- [ ] Añadir dependencia `bull`
- [ ] Crear módulo `queue.ts`
- [ ] Migrar scheduler a usar Bull
- [ ] Configurar reintentos automáticos
- [ ] Dashboard de Bull (opcional)
- [ ] Probar scheduling distribuido

## CI/CD
- [ ] GitHub Action: build y test
- [ ] GitHub Action: build Docker image
- [ ] GitHub Action: push a registry
- [ ] GitHub Action: deploy a staging
- [ ] GitHub Action: deploy a producción
- [ ] Configurar secretos en GitHub

## Configuración por Entorno
- [ ] Crear `.env.example`
- [ ] Validar variables requeridas al iniciar
- [ ] Documentar todas las variables
- [ ] Configurar para Railway/Render
- [ ] Configurar para Fly.io
- [ ] Configurar para Kubernetes

## Monitoreo y Logs
- [ ] Structured logging (JSON)
- [ ] Health check endpoints
- [ ] Métricas de uso (sessions, requests)
- [ ] Alertas de errores
- [ ] Dashboard de monitoreo

## Seguridad
- [ ] HTTPS obligatorio en producción
- [ ] Secrets management
- [ ] Rate limiting
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad (helmet)

## Documentación
- [ ] README de despliegue
- [ ] Guía de configuración por proveedor
- [ ] Runbook de operaciones
- [ ] Guía de troubleshooting

## Notas de Progreso

| Fecha | Avance | Notas |
|-------|--------|-------|
| - | - | - |
