#!/usr/bin/env bash
# Corre las pruebas del trabajador EN EL SERVIDOR, dentro de un contenedor en la red del Supabase de Aura.
#   - unitarias: sin red ni base.
#   - integración: esquema temporal en el Postgres real (se borra solo) con YCloud/Pagopar simulados.
#   - rol: transacción revertida sobre las tablas reales con el rol aura_worker.
# Uso (desde ~/aura-worker): scripts/probar-en-servidor.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SECRETS="${AURA_SECRETS:-$HOME/.aura-secrets}"
NETWORK="${SUPABASE_NETWORK:-9yus3novbjqin3vcs5mpkj1b}"
DB_HOST="supabase-db-9yus3novbjqin3vcs5mpkj1b"

# Rol administrador (solo para crear/borrar el esquema temporal de la prueba de integración).
ADMIN_PW="$(grep '^POSTGRES_PASSWORD=' "$SECRETS/supabase-aura.env" | cut -d= -f2-)"
export TEST_DATABASE_URL="postgres://supabase_admin:${ADMIN_PW}@${DB_HOST}:5432/postgres"
docker build -q -t aura-worker:local . >/dev/null
docker run --rm --network "$NETWORK" --env-file "$SECRETS/aura-worker.env" -e TEST_DATABASE_URL \
  -v "$PWD/test:/app/test:ro" -v "$PWD/src:/app/src:ro" \
  aura-worker:local node --test --test-timeout=120000 --test-concurrency=1 test/alerts.test.js test/config.test.js test/integration.test.mjs test/main.test.mjs test/rol.test.mjs
