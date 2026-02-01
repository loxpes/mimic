# HU-000: Infraestructura y Despliegue

## Descripción
Preparar la infraestructura necesaria para desplegar TestFarm en producción, incluyendo contenedores, base de datos, almacenamiento y orquestación.

## Análisis del Estado Actual

| Componente | Actual | Producción Requerido |
|------------|--------|---------------------|
| Base de datos | SQLite | PostgreSQL |
| Screenshots | Filesystem local | S3/Cloud Storage |
| Browser Runtime | Chromium local | Kubernetes + browsers gestionados |
| API Server | Instancia única Hono | Pool balanceado + Redis |
| Scheduler | Polling single-instance | Job queue distribuido (Bull) |
| Node.js | 20+ | 20 LTS |
| Almacenamiento | `data/` local | S3 o equivalente |
| Docker/K8s | Ninguno | Requerido |

## Opciones de Infraestructura

### Opción 1: VPS Simple (MVP/Startup)
**Para: 10-20 usuarios, 5 sesiones concurrentes**

```
┌─────────────────────────────────┐
│        VPS (4GB RAM, 2 CPU)     │
│  ┌─────────┐  ┌─────────────┐   │
│  │ API     │  │ PostgreSQL  │   │
│  │ (Hono)  │  │ (local)     │   │
│  └─────────┘  └─────────────┘   │
│  ┌─────────┐  ┌─────────────┐   │
│  │ Web     │  │ Screenshots │   │
│  │ (nginx) │  │ (disk)      │   │
│  └─────────┘  └─────────────┘   │
│  ┌─────────────────────────┐    │
│  │ Chromium (Playwright)    │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

**Proveedores recomendados:**
- DigitalOcean Droplet: $24/mes (4GB)
- Hetzner Cloud: €15/mes (4GB)
- Vultr: $24/mes (4GB)
- Linode: $24/mes (4GB)

**Pros:** Simple, barato, fácil de mantener
**Contras:** No escala, single point of failure

---

### Opción 2: Platform-as-a-Service (Recomendado para empezar)
**Para: 50-100 usuarios, 10-20 sesiones concurrentes**

```
┌──────────────────────────────────────────────┐
│                   Railway/Render              │
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │ API Service │  │ PostgreSQL (managed)   │ │
│  │ (auto-scale)│  │ - Railway/Render DB    │ │
│  └─────────────┘  │ - Supabase             │ │
│                   │ - Neon                 │ │
│  ┌─────────────┐  └────────────────────────┘ │
│  │ Web (CDN)   │                             │
│  │ - Vercel    │  ┌────────────────────────┐ │
│  │ - Netlify   │  │ Redis (Upstash)        │ │
│  └─────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────┐
│         BrowserBase (managed browsers)        │
│  - Chromium pool escalable                    │
│  - Sin gestionar dependencias de SO           │
│  - Pay-per-use                               │
└──────────────────────────────────────────────┘
```

**Costos estimados:**
| Servicio | Costo/mes |
|----------|-----------|
| Railway Pro (API) | $20 |
| Vercel Pro (Web) | $20 |
| Supabase Pro (DB) | $25 |
| Upstash Redis | $10 |
| Cloudflare R2 (storage) | ~$5 |
| BrowserBase | $50-100 |
| **Total** | **~$130-180/mes** |

**Pros:** Escalable, gestionado, fácil deploy
**Contras:** Vendor lock-in parcial, costos crecen con uso

---

### Opción 3: Kubernetes (Enterprise/Scale)
**Para: 500+ usuarios, 50+ sesiones concurrentes**

```
┌─────────────────────────────────────────────────────────┐
│                 Kubernetes Cluster (GKE/EKS/AKS)        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                  Ingress Controller                │ │
│  │              (nginx + sticky sessions)             │ │
│  └───────────────────────────────────────────────────┘ │
│                         │                               │
│    ┌────────────────────┼────────────────────┐         │
│    ▼                    ▼                    ▼         │
│  ┌──────┐          ┌──────┐            ┌──────┐       │
│  │ API  │          │ API  │            │ API  │       │
│  │ Pod  │          │ Pod  │            │ Pod  │       │
│  │ 1GB  │          │ 1GB  │            │ 1GB  │       │
│  └──────┘          └──────┘            └──────┘       │
│      │                 │                   │           │
│      └─────────────────┼───────────────────┘           │
│                        ▼                               │
│               ┌─────────────────┐                      │
│               │  Redis Cluster  │                      │
│               │  (pub/sub + jobs)│                     │
│               └─────────────────┘                      │
│                        │                               │
│      ┌─────────────────┼─────────────────┐            │
│      ▼                 ▼                 ▼            │
│  ┌──────┐         ┌──────┐         ┌──────┐          │
│  │Browser│        │Browser│        │Browser│          │
│  │ Pod   │        │ Pod   │        │ Pod   │          │
│  │ 2GB   │        │ 2GB   │        │ 2GB   │          │
│  └──────┘         └──────┘         └──────┘          │
│                                                        │
│  ┌────────────────┐  ┌────────────────────────────┐   │
│  │  PostgreSQL    │  │       S3 / MinIO           │   │
│  │  StatefulSet   │  │    (screenshots)           │   │
│  │  (3 replicas)  │  │                            │   │
│  └────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Costos estimados (GKE):**
| Recurso | Cantidad | Costo/mes |
|---------|----------|-----------|
| API nodes (e2-medium) | 3 | $75 |
| Browser nodes (e2-standard-2) | 3-5 | $150-250 |
| Cloud SQL PostgreSQL | 1 (db-g1-small) | $30 |
| Memorystore Redis | 1GB | $35 |
| Cloud Storage | 100GB | $2.50 |
| Load Balancer | 1 | $18 |
| **Total** | | **~$310-410/mes** |

**Pros:** Máxima escalabilidad, alta disponibilidad, control total
**Contras:** Complejidad operacional, requiere DevOps

---

### Opción 4: Fly.io + Managed Services (Balance)
**Para: 100-300 usuarios, 20-30 sesiones concurrentes**

```
┌────────────────────────────────────────────┐
│                  Fly.io                     │
│  ┌──────────────────────────────────────┐  │
│  │      API Machines (auto-scale)       │  │
│  │      3 regions: MAD, NYC, SIN        │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     Fly Postgres (managed)           │  │
│  │     with automatic failover          │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
         │
         ├── Upstash Redis (serverless)
         ├── Cloudflare R2 (screenshots)
         └── BrowserBase (managed browsers)
```

**Costos estimados:**
| Servicio | Costo/mes |
|----------|-----------|
| Fly.io (3 machines) | $30-50 |
| Fly Postgres | $15-30 |
| Upstash Redis | $10 |
| Cloudflare R2 | ~$5 |
| BrowserBase | $50-100 |
| **Total** | **~$110-200/mes** |

---

## Recomendación por Etapa

| Etapa | Infraestructura | Inversión |
|-------|-----------------|-----------|
| **MVP (0-50 usuarios)** | VPS + SQLite→PostgreSQL | $30-50/mes |
| **Validación (50-200 usuarios)** | Railway/Render + BrowserBase | $130-200/mes |
| **Crecimiento (200-1000 usuarios)** | Fly.io + servicios gestionados | $200-400/mes |
| **Escala (1000+ usuarios)** | Kubernetes (GKE/EKS) | $400-1000+/mes |

## Cambios Técnicos Requeridos

### 1. Migración de Base de Datos
```typescript
// packages/db/src/client.ts
// Cambiar de:
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// A:
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool, { schema });
```

### 2. Almacenamiento S3
```typescript
// packages/core/src/utils/screenshot-storage.ts
// Añadir soporte S3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function saveScreenshot(sessionId: string, actionNumber: number, base64Data: string) {
  if (process.env.S3_BUCKET) {
    // Upload to S3
    const key = `screenshots/${sessionId}/action-${actionNumber}.jpg`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: Buffer.from(base64Data, 'base64'),
      ContentType: 'image/jpeg',
    }));
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  }
  // Fallback local
  return saveToLocalFilesystem(...);
}
```

### 3. Redis para SSE Multi-instancia
```typescript
// apps/api/src/lib/redis-pubsub.ts
import Redis from 'ioredis';

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

export function broadcastSessionEvent(sessionId: string, event: any) {
  pub.publish(`session:${sessionId}`, JSON.stringify(event));
}

export function subscribeToSession(sessionId: string, callback: (event: any) => void) {
  sub.subscribe(`session:${sessionId}`);
  sub.on('message', (channel, message) => {
    if (channel === `session:${sessionId}`) {
      callback(JSON.parse(message));
    }
  });
}
```

### 4. Job Queue con Bull
```typescript
// apps/api/src/lib/queue.ts
import Queue from 'bull';

export const sessionQueue = new Queue('sessions', process.env.REDIS_URL);

sessionQueue.process('run-session', async (job) => {
  const { sessionId } = job.data;
  await runSession(sessionId);
});

// Uso
sessionQueue.add('run-session', { sessionId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});
```

### 5. Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/testfarm
      - REDIS_URL=redis://redis:6379
      - S3_BUCKET=testfarm-screenshots
    depends_on:
      - db
      - redis

  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./apps/web/dist:/usr/share/nginx/html

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testfarm
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## Variables de Entorno Producción

```bash
# Base de datos
DATABASE_URL=postgres://user:pass@host:5432/testfarm

# Redis
REDIS_URL=redis://host:6379

# Storage
S3_BUCKET=testfarm-screenshots
S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# LLM
ANTHROPIC_API_KEY=sk-ant-...

# Trello (si aplica)
TRELLO_API_KEY=...
TRELLO_API_SECRET=...

# URLs
FRONTEND_URL=https://app.testfarm.io
API_BASE_URL=https://api.testfarm.io

# Server
PORT=3001
NODE_ENV=production
```

## Estimación

| Tarea | Tiempo |
|-------|--------|
| Dockerfile + docker-compose | 1 día |
| Migración SQLite → PostgreSQL | 2 días |
| Integración S3 para screenshots | 1 día |
| Redis pub/sub para SSE | 1 día |
| Bull queue para scheduler | 1 día |
| CI/CD (GitHub Actions) | 1 día |
| Testing en staging | 2 días |
| **Total** | **~1.5-2 semanas** |

## Dependencias
- HU-001: Sistema de Autenticación (para multi-tenant)
- HU-002: Sistema de Billing (para límites de uso)
