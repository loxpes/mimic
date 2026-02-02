FROM node:20-slim AS builder

WORKDIR /app

# Forzar NODE_ENV=development para instalar devDependencies (typescript, etc.)
ENV NODE_ENV=development

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/cli/package.json ./apps/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Instalar TODAS las dependencias (incluyendo devDependencies para tsc)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Build packages sequentially to ensure proper dependency order
RUN pnpm -r --workspace-concurrency=1 build

# --- Production stage ---
FROM node:20-slim AS runner

# Dependencias para Playwright/Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Instalar Claude CLI globalmente
RUN npm install -g @anthropic-ai/claude-code

# Copiar desde builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/config ./config

# Crear directorio para datos persistentes
RUN mkdir -p /app/data

# Crear usuario no-root con home directory y dar permisos
RUN groupadd -r nodeuser && useradd -r -g nodeuser -m -d /home/nodeuser nodeuser \
    && chown -R nodeuser:nodeuser /app /home/nodeuser

# Cambiar a usuario no-root
USER nodeuser

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
