FROM node:20-slim AS builder

WORKDIR /app

# Force NODE_ENV=development to install devDependencies (typescript, etc.)
ENV NODE_ENV=development

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/cli/package.json ./apps/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install ALL dependencies (including devDependencies for tsc)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build packages sequentially to ensure proper dependency order
RUN pnpm -r --workspace-concurrency=1 build

# Build web frontend (Vite) so the API can serve it as static files
RUN pnpm --filter @testfarm/web build

# --- Production stage ---
FROM node:20-slim AS runner

# Dependencies for Playwright/Chromium
# gosu NOT needed — Podman rootless runs as unprivileged user natively
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

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/config ./config


# Create persistent data directory
RUN mkdir -p /app/data

# Create non-root user and hand over ownership
# Podman rootless maps this user to the host UID automatically
RUN groupadd -r nodeuser && useradd -r -g nodeuser -m -d /home/nodeuser nodeuser \
    && chown -R nodeuser:nodeuser /app /home/nodeuser

USER nodeuser

EXPOSE 4001

CMD ["node", "apps/api/dist/index.js"]
