# HU-000: Checklist de Seguimiento

## Estado: 🟡 En progreso

## Archivos de Configuración
- [x] Dockerfile multi-stage
- [x] .dockerignore
- [x] .github/workflows/deploy.yml
- [ ] Probar build local con Docker

## Setup Hetzner
- [ ] Crear cuenta en Hetzner
- [ ] Crear proyecto "Mimic"
- [ ] Crear VPS CX22 (Ubuntu 24.04)
- [ ] Configurar SSH key
- [ ] Anotar IP del servidor

## Instalación Coolify
- [ ] Conectar por SSH al VPS
- [ ] Ejecutar script de instalación
- [ ] Acceder a panel web (puerto 8000)
- [ ] Crear cuenta admin

## Configuración App
- [ ] Conectar GitHub a Coolify
- [ ] Crear proyecto en Coolify
- [ ] Configurar repositorio loxpes/mimic
- [ ] Configurar Dockerfile como build pack
- [ ] Configurar puerto 3001
- [ ] Crear volume para /app/data
- [ ] Añadir variables de entorno

## CI/CD
- [ ] Obtener webhook URL de Coolify
- [ ] Crear secret COOLIFY_WEBHOOK_URL en GitHub
- [ ] Probar push a main
- [ ] Verificar deploy automático

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
