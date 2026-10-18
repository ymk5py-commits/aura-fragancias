#!/usr/bin/env bash
# Manejo del trabajador de avisos de WhatsApp en el servidor (carpeta ~/aura-worker).
#   aura-worker.sh estado              contenedor + resumen de avisos (solo lectura)
#   aura-worker.sh logs [líneas]       últimas líneas del registro
#   aura-worker.sh encender            ENCIENDE los avisos (pide confirmación; ver LEEME.md antes)
#   aura-worker.sh apagar              APAGA los avisos
#   aura-worker.sh reconstruir         recompila la imagen con el código de esta carpeta y recrea el contenedor
#   aura-worker.sh cli <comando…>      herramientas de operación (buscar-en-ycloud, resolver, descartar-eventos…)
#   aura-worker.sh probar-real         envía UN WhatsApp real de prueba a +595984348058 (pide confirmación; ~USD 0,01)
set -euo pipefail
cd "$(dirname "$0")/.."
cmd="${1:-ayuda}"; shift || true

set_flag() {
  if grep -q '^WHATSAPP_ALERTS_ENABLED=' .env; then sed -i "s/^WHATSAPP_ALERTS_ENABLED=.*/WHATSAPP_ALERTS_ENABLED=$1/" .env
  else echo "WHATSAPP_ALERTS_ENABLED=$1" >> .env; fi
}
cli() { docker compose run --rm -T aura-worker node src/cli.js "$@" </dev/null 2>&1 | grep -v '^ Container '; }
confirm() { # $1 = palabra exacta que hay que escribir
  if [ "${AURA_CONFIRMADO:-}" = "$1" ]; then return 0; fi
  read -r -p "Escribí $1 para continuar: " answer || answer=""
  [ "$answer" = "$1" ] || { echo "Cancelado: no se cambió nada."; exit 1; }
}

case "$cmd" in
  estado)
    docker ps -a --filter name=^aura-worker$ --format 'contenedor: {{.Names}} | {{.Status}}'
    echo "avisos encendidos: $(grep '^WHATSAPP_ALERTS_ENABLED=' .env | cut -d= -f2)"
    cli estado ;;
  logs) docker logs --tail "${1:-50}" aura-worker 2>&1 ;;
  encender)
    cat <<'TXT'
ATENCIÓN: mientras las funciones de Google sigan encendidas, encender este trabajador envía los avisos DOS veces.
Antes de continuar comprobá que:
  1. las funciones de Google están apagadas (WHATSAPP_ALERTS_ENABLED=false desplegado) y la cola de Firestore quedó vacía;
  2. la migración final ya copió whatsappAlerts / whatsappPaymentChecks a Supabase;
  3. la web ya escribe los pedidos en Supabase.
TXT
    confirm ENCENDER
    set_flag true
    docker compose up -d
    sleep 5; docker logs --tail 3 aura-worker 2>&1 ;;
  apagar)
    set_flag false
    docker compose up -d
    sleep 5; docker logs --tail 3 aura-worker 2>&1 ;;
  reconstruir) docker compose up -d --build ;;
  cli) cli "$@" ;;
  probar-real)
    echo "Se enviará 1 WhatsApp REAL de prueba (plantilla aura_pedido_web) a +595984348058. Costo aprox. USD 0,01."
    confirm ENVIAR
    docker compose run --rm -T -e WHATSAPP_ALERTS_ENABLED=true aura-worker node src/cli.js probar-aviso pedido --enviar </dev/null 2>&1 | grep -v '^ Container ' ;;
  *) sed -n '2,10p' "$0" ;;
esac
