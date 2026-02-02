# HU-000: Checklist de Seguimiento

## Estado: 🟢 Completado

## Archivos de Configuración
- [x] Dockerfile multi-stage
- [x] .dockerignore
- [x] .github/workflows/deploy.yml
- [x] Probar build local con Docker

## Setup Hetzner
- [x] Crear cuenta en Hetzner
- [x] Crear proyecto "Mimic"
- [x] Crear VPS CX22 (Ubuntu 24.04)
- [x] Configurar SSH key
- [x] Anotar IP del servidor

## Instalación Coolify
- [x] Conectar por SSH al VPS
- [x] Ejecutar script de instalación
- [x] Acceder a panel web (puerto 8000)
- [x] Crear cuenta admin

## Configuración App
- [x] Conectar GitHub a Coolify
- [x] Crear proyecto en Coolify
- [x] Configurar repositorio loxpes/mimic
- [x] Configurar Dockerfile como build pack
- [x] Configurar puerto 3001
- [x] Crear volume para /app/data
- [x] Añadir variables de entorno (CLAUDE_CODE_OAUTH_TOKEN, LLM_PROVIDER, etc.)

## Sistema de Credenciales (Nuevo)
- [x] Implementar setup automático de Claude CLI
- [x] Ocultar claves env en frontend
- [x] Actualizar mensajes de error
- [x] Documentar en README y CLAUDE.md

## CI/CD
- [x] Obtener webhook URL de Coolify
- [x] Crear secret COOLIFY_WEBHOOK_URL en GitHub
- [x] Probar push a main
- [x] Verificar deploy automático

## Dominio y SSL (Opcional)
- [ ] Configurar DNS (registro A)
- [ ] Añadir dominio en Coolify
- [ ] Verificar SSL automático

## Verificación Final
- [ ] App accesible públicamente
- [ ] Crear sesión de prueba
- [ ] Verificar persistencia tras restart
- [ ] Verificar logs en Coolify

## Notas de Progreso

| Fecha | Avance | Notas |
|-------|--------|-------|
| 2025-02-01 | Archivos creados | Dockerfile, .dockerignore, GitHub Action |
| 2026-02-01 | Fix TypeScript references | Agregada referencia a @testfarm/db en packages/core/tsconfig.json |
| 2026-02-01 | Fix build order | Agregado --workspace-concurrency=1 para builds secuenciales en Docker |
| 2026-02-02 | VPS y Coolify configurados | Hetzner VPS creado, Coolify instalado, app desplegada |
| 2026-02-02 | CI/CD funcionando | GitHub webhook configurado, deploys automáticos activos |
| 2026-02-02 | Sistema de credenciales | Setup automático Claude CLI, env vars ocultas en frontend |
| 2026-02-02 | ✅ HU-000 Completada | Infraestructura desplegada y funcionando en producción |
