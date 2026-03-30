#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[mimic]${NC} $1"; }
warn() { echo -e "${YELLOW}[mimic]${NC} $1"; }
die()  { echo -e "${RED}[mimic]${NC} $1"; exit 1; }

# ── Mode selection ────────────────────────────────────────────────────────────
MODE="${1:-local}"   # local | container

if [ "$MODE" = "container" ]; then
  # Detect container engine
  if command -v podman &>/dev/null; then
    ENGINE="podman"
    COMPOSE_FILE="podman-compose.yml"
  elif command -v docker &>/dev/null; then
    ENGINE="docker"
    COMPOSE_FILE="docker-compose.yml"
  else
    die "No se encontró podman ni docker. Instala uno de los dos."
  fi

  # Check .env
  if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
      warn ".env no encontrado. Copiando .env.example -> .env"
      cp .env.example .env
      warn "Edita .env con tus API keys antes de continuar."
      exit 1
    else
      die ".env no encontrado."
    fi
  fi

  log "Usando $ENGINE con $COMPOSE_FILE"
  log "Construyendo imagen y arrancando contenedor..."
  $ENGINE compose -f "$COMPOSE_FILE" up --build

  exit 0
fi

# ── Local mode ────────────────────────────────────────────────────────────────
# Check .env
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env no encontrado. Copiando .env.example -> .env"
    cp .env.example .env
    warn "Edita .env con tus API keys antes de continuar."
    exit 1
  else
    die ".env no encontrado. Crea uno con al menos una API key (ANTHROPIC_API_KEY, OPENAI_API_KEY o GOOGLE_API_KEY)."
  fi
fi

# Check pnpm
command -v pnpm &>/dev/null || die "pnpm no está instalado. Instálalo con: npm install -g pnpm"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log "Instalando dependencias..."
  pnpm install
fi

# Build packages if needed
if [ ! -d "packages/shared/dist" ] || [ ! -d "packages/db/dist" ] || [ ! -d "packages/core/dist" ]; then
  log "Compilando paquetes..."
  pnpm build
fi

# Create data dir for SQLite
mkdir -p "$ROOT_DIR/data"

log "Arrancando API (puerto 4001) y Web (puerto 5173)..."
echo ""

# Launch both services in parallel and wait
pnpm --filter @testfarm/api dev &
API_PID=$!

pnpm --filter @testfarm/web dev &
WEB_PID=$!

# Trap Ctrl+C to kill both
trap "log 'Deteniendo servicios...'; kill $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM

log "Servicios arrancados:"
log "  API  -> http://localhost:4001"
log "  Web  -> http://localhost:5173"
log "Pulsa Ctrl+C para detener."
echo ""

wait $API_PID $WEB_PID
