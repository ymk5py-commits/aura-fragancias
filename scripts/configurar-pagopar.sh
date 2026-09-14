#!/usr/bin/env bash
# ============================================================
#  Äura — configurar el pago con tarjeta (Pagopar) en Vercel
#
#  Hace, en este orden:
#   1. Toma los tokens de Pagopar del proyecto de Vercel de ALBA
#      (misma cuenta de comercio). Si no se pueden leer, los pide.
#   2. Crea el usuario de servicio pagos@aurafragancias.store en
#      Firebase Auth (proyecto aura-fragancias) con una contraseña
#      aleatoria que nunca se muestra en pantalla.
#   3. Carga en Vercel (production): PAGOPAR_PUBLIC_KEY,
#      PAGOPAR_PRIVATE_KEY, FIREBASE_SERVER_EMAIL,
#      FIREBASE_SERVER_PASSWORD y NEXT_PUBLIC_PAGOPAR_ENABLED=true.
#   4. Despliega a producción.
#
#  Uso:  bash scripts/configurar-pagopar.sh
#  Requiere: vercel CLI logueada, curl, openssl, jq.
# ============================================================
set -euo pipefail
trap 'echo; echo "✗ El script se cortó en el paso \"$STEP\" (línea $LINENO). Corregí lo que indica arriba y volvé a correrlo: es seguro repetirlo."' ERR
STEP="inicio"

AURA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ALBA_DIR="${ALBA_DIR:-$AURA_DIR/../alba-store}"
SERVICE_EMAIL="${SERVICE_EMAIL:-pagos@aurafragancias.store}"
# Clave web pública de Firebase (va en el bundle del sitio; no es secreta).
FIREBASE_API_KEY="${FIREBASE_API_KEY:-AIzaSyDfxu_7NNmtFgjznu3O1rGrdxY4RVFa92k}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ---------- 1. Tokens de Pagopar ----------
STEP="1/4 tokens"; say "1/4 · Tokens de Pagopar"
PUBLIC_KEY=""; PRIVATE_KEY=""
if [ -d "$ALBA_DIR" ]; then
  if (cd "$ALBA_DIR" && vercel env pull --environment=production "$TMP/alba.env" --yes >/dev/null 2>&1); then
    PUBLIC_KEY="$(grep -E '^PAGOPAR_PUBLIC_KEY=' "$TMP/alba.env" | cut -d= -f2- | tr -d '"')"
    PRIVATE_KEY="$(grep -E '^PAGOPAR_PRIVATE_KEY=' "$TMP/alba.env" | cut -d= -f2- | tr -d '"')"
  fi
fi
if [ -n "$PUBLIC_KEY" ] && [ -n "$PRIVATE_KEY" ]; then
  echo "   Copiados del proyecto de Vercel de ALBA (${#PUBLIC_KEY} y ${#PRIVATE_KEY} caracteres)."
else
  echo "   No se pudieron leer de ALBA. Pegalos del panel de Pagopar (Desarrollador → Integrar con mi sitio web)."
  read -rsp "   Token PÚBLICO: " PUBLIC_KEY; echo
  read -rsp "   Token PRIVADO: " PRIVATE_KEY; echo
fi
[ -n "$PUBLIC_KEY" ] && [ -n "$PRIVATE_KEY" ] || { echo "   Faltan tokens. Abortado."; exit 1; }

# ---------- 2. Usuario de servicio en Firebase Auth ----------
STEP="2/4 usuario Firebase"; say "2/4 · Usuario de servicio $SERVICE_EMAIL en Firebase (aura-fragancias)"
SERVICE_PASSWORD="$(openssl rand -base64 33 | tr -d '/+=' | cut -c1-32)"
RESP="$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$FIREBASE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg e "$SERVICE_EMAIL" --arg p "$SERVICE_PASSWORD" '{email:$e,password:$p,returnSecureToken:false}')")"
if echo "$RESP" | jq -e '.localId' >/dev/null 2>&1; then
  echo "   Usuario creado."
else
  ERR="$(echo "$RESP" | jq -r '.error.message // "desconocido"')"
  if [ "$ERR" = "EMAIL_EXISTS" ]; then
    echo "   El usuario ya existe. Pegá su contraseña (o borralo en Firebase → Authentication y volvé a correr esto)."
    read -rsp "   Contraseña de $SERVICE_EMAIL: " SERVICE_PASSWORD; echo
    # Verificamos que la contraseña sirva antes de guardarla.
    CHECK="$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d "$(jq -cn --arg e "$SERVICE_EMAIL" --arg p "$SERVICE_PASSWORD" '{email:$e,password:$p,returnSecureToken:true}')")"
    echo "$CHECK" | jq -e '.idToken' >/dev/null 2>&1 || { echo "   Contraseña incorrecta. Abortado."; exit 1; }
    echo "   Contraseña verificada."
  else
    # El proyecto no deja crear cuentas desde la web (ADMIN_ONLY_OPERATION /
    # OPERATION_NOT_ALLOWED): la creamos a mano en la consola con esta contraseña.
    echo "   Firebase no dejó crear el usuario desde acá ($ERR)."
    echo
    echo "   Crealo a mano (1 minuto):"
    echo "     1. Abrí https://console.firebase.google.com/project/aura-fragancias/authentication/users"
    echo "     2. 'Agregar usuario' → correo: $SERVICE_EMAIL"
    echo "     3. Contraseña (copiala tal cual, no se vuelve a mostrar):"
    echo
    echo "        $SERVICE_PASSWORD"
    echo
    while true; do
      read -rp "   Cuando esté creado, apretá Enter (o escribí 'salir'): " GO
      [ "$GO" = "salir" ] && exit 1
      CHECK="$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "$(jq -cn --arg e "$SERVICE_EMAIL" --arg p "$SERVICE_PASSWORD" '{email:$e,password:$p,returnSecureToken:true}')")"
      if echo "$CHECK" | jq -e '.idToken' >/dev/null 2>&1; then
        echo "   Usuario verificado."
        break
      fi
      echo "   Todavía no puedo entrar con ese usuario ($(echo "$CHECK" | jq -r '.error.message // "sin respuesta"')). Revisá correo y contraseña."
    done
  fi
fi

# ---------- 3. Variables en Vercel ----------
STEP="3/4 variables Vercel"; say "3/4 · Variables en Vercel (production)"
cd "$AURA_DIR"
setenv() {
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" production >/dev/null
  echo "   $1 ✓"
}
setenv PAGOPAR_PUBLIC_KEY "$PUBLIC_KEY"
setenv PAGOPAR_PRIVATE_KEY "$PRIVATE_KEY"
setenv FIREBASE_SERVER_EMAIL "$SERVICE_EMAIL"
setenv FIREBASE_SERVER_PASSWORD "$SERVICE_PASSWORD"
setenv NEXT_PUBLIC_PAGOPAR_ENABLED "true"
unset PUBLIC_KEY PRIVATE_KEY SERVICE_PASSWORD

# ---------- 4. Deploy ----------
STEP="4/4 deploy"; say "4/4 · Deploy a producción"
vercel --prod --yes

say "Verificación"
RESP="$(curl -s -m 30 -X POST https://www.aurafragancias.store/api/pagopar/iniciar -H 'Content-Type: application/json' -d '{"orderId":"prueba-000000"}')"
if echo "$RESP" | grep -q "No encontramos el pedido"; then
  echo "   ✓ Tokens de Pagopar y usuario de Firebase funcionando en producción."
else
  echo "   ✗ El servidor respondió: $RESP"
  echo "     (esperado: 'No encontramos el pedido.'). Revisá las variables con: vercel env ls production"
fi
say "Listo. Probá: https://www.aurafragancias.store → carrito → Finalizar pedido → Tarjeta."
