#!/bin/bash
# Pruebas de permisos (RLS) y de las transacciones del panel contra un Postgres desechable.
# Usa Docker local; si no hay, usa el servidor GMKtec (ssh gmktec) con un túnel temporal.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME="aura-test-pg-$$"
PORT="${TEST_PG_PORT:-55432}"
SOCKET="/tmp/aura-test-tunnel-$$"
REMOTE=""
if ! command -v docker >/dev/null 2>&1; then REMOTE="ssh -o BatchMode=yes gmktec"; fi
sh() { if [ -n "$REMOTE" ]; then $REMOTE "$1"; else bash -c "$1"; fi; }
cleanup() {
  [ -n "$REMOTE" ] && ssh -S "$SOCKET" -O exit gmktec >/dev/null 2>&1 || true
  sh "docker rm -f $NAME >/dev/null 2>&1 || true"
}
trap cleanup EXIT
sh "docker run -d --rm --name $NAME -e POSTGRES_PASSWORD=test -p 127.0.0.1:$PORT:5432 postgres:15-alpine >/dev/null"
for i in $(seq 1 40); do sh "docker exec $NAME pg_isready -U postgres -q" && break; sleep 1; done
if [ -n "$REMOTE" ]; then ssh -M -S "$SOCKET" -fN -o ExitOnForwardFailure=yes -L "$PORT:127.0.0.1:$PORT" gmktec; fi
for i in $(seq 1 30); do (echo > "/dev/tcp/127.0.0.1/$PORT") >/dev/null 2>&1 && break; sleep 1; done
sleep 2
TEST_DATABASE_URL="postgres://postgres:test@127.0.0.1:$PORT/postgres" node --test scripts/test-supabase.mjs
