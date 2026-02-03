# HU-000: Infraestructura y Despliegue

## Descripción
Desplegar Mimic en producción con infraestructura simple y barata.

## Stack Elegido: Hetzner + Coolify

```
┌─────────────────────────────────────────────────────┐
│           VPS Hetzner CX22 (€4.5/mes)               │
│                    4GB RAM, 2 vCPU                  │
│  ┌───────────────────────────────────────────────┐  │
│  │              Coolify (self-hosted)            │  │
│  │                                               │  │
│  │  ┌─────────────────┐  ┌────────────────────┐ │  │
│  │  │  Mimic API+Web  │  │  Volume: /app/data │ │  │
│  │  │  (Docker)       │  │  - SQLite DB       │ │  │
│  │  │  Puerto 3001    │  │  - Screenshots     │ │  │
│  │  └─────────────────┘  └────────────────────┘ │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │  Traefik (reverse proxy + SSL)          │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Costo: ~€5/mes**

## Por qué esta arquitectura

| Decisión | Razón |
|----------|-------|
| **SQLite** | Suficiente para single-instance, sin complejidad |
| **Filesystem local** | Screenshots en disco, simple y rápido |
| **Coolify** | PaaS self-hosted gratis, SSL automático |
| **Hetzner** | Mejor precio/rendimiento en Europa |
| **Sin Redis** | No necesario para single-instance |
| **Sin PostgreSQL** | SQLite aguanta hasta 100+ usuarios |

## Archivos de Configuración

### Dockerfile
- Multi-stage build (builder + runner)
- Chromium preinstalado para Playwright
- Directorio `/app/data` para persistencia

### .dockerignore
- Excluye node_modules, .git, docs, etc.
- Reduce tamaño de build

### .github/workflows/deploy.yml
- Trigger en push a `main`
- Llama webhook de Coolify para redeploy

## Setup Inicial (Manual, una vez)

### 1. Crear VPS en Hetzner
1. https://console.hetzner.cloud
2. Nuevo servidor: Ubuntu 24.04, CX22 (€4.51/mes)
3. Añadir SSH key

### 2. Instalar Coolify
```bash
ssh root@IP_DEL_VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### 3. Configurar App en Coolify
1. Acceder a `http://IP:8000`
2. Conectar GitHub
3. Añadir proyecto desde `loxpes/mimic`
4. Configurar:
   - Build: Dockerfile
   - Puerto: 3001
   - Volume: `/app/data`
   - Variables: `PORT=3001`, `NODE_ENV=production`

### 4. Configurar CI/CD
1. En Coolify: copiar Deploy Webhook URL
2. En GitHub: Settings → Secrets → `COOLIFY_WEBHOOK_URL`

### 5. Dominio (Opcional)
1. DNS: `mimic.tudominio.com` → IP del VPS
2. Coolify: añadir dominio → SSL automático

## Flujo de Deploy

```
Push a main → GitHub Action → Webhook → Coolify → Build → Deploy
```

## Variables de Entorno

```bash
PORT=3001
NODE_ENV=production
TESTFARM_DATA_DIR=/app/data
```

## Escalabilidad Futura

Cuándo migrar a algo más complejo:

| Trigger | Acción |
|---------|--------|
| >100 usuarios concurrentes | Considerar múltiples instancias |
| >20GB screenshots | Migrar a S3/R2 |
| Necesidad de HA | Añadir réplicas + PostgreSQL |

## Criterios de Aceptación

- [x] Dockerfile creado y funcional
- [x] .dockerignore configurado
- [x] GitHub Action para deploy automático
- [ ] VPS Hetzner creado
- [ ] Coolify instalado y configurado
- [ ] App desplegada y accesible
- [ ] SSL funcionando
- [ ] Datos persisten tras redeploy

## Notas
- SQLite en WAL mode soporta lecturas concurrentes ilimitadas
- El cuello de botella será CPU/RAM antes que la DB
- Backups: Coolify puede hacer backups automáticos del volume
