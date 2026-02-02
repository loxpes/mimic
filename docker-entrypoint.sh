#!/bin/sh
set -e

# Fix permissions for data directory (may be owned by root from volume mount)
echo "[Entrypoint] Fixing permissions for /app/data..."
chown -R nodeuser:nodeuser /app/data 2>/dev/null || true

# Switch to nodeuser and execute the app
echo "[Entrypoint] Starting app as nodeuser..."
exec gosu nodeuser "$@"
