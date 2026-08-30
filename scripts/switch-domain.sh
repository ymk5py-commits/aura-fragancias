#!/usr/bin/env bash
# Cambia el sitio al dominio correcto (aurafragancias.store) y deja el viejo
# redirigiendo 301. Solo debe correrse CUANDO EL DNS NUEVO YA RESUELVE a Vercel.
set -euo pipefail

OLD="aurafrangancias.store"
NEW="aurafragancias.store"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TEAM="team_2C7sQYx5caz5CQKCPXKA7cjR"
TOKEN=$(python3 -c "import json;print(json.load(open('$HOME/Library/Application Support/com.vercel.cli/auth.json')).get('token',''))")

echo "==> 1/6 Verificando el DNS nuevo (autoritativo) y que el sitio responda..."
NS=$(dig +short "$NEW" NS | head -1)
NS=${NS:-dns1.registrar-servers.com}
A_REC=$(dig +short @"$NS" "$NEW" A | tr '\n' ' ')
case "$A_REC" in
  *216.198.79.1*|*64.29.17.1*|*76.76.21.21*) echo "    OK: apex (autoritativo $NS) -> $A_REC" ;;
  *) echo "    ABORTADO: el apex autoritativo apunta a '$A_REC' (no es Vercel)."; exit 1 ;;
esac
# El dominio nuevo debe servir 200 antes de redirigir el viejo hacia el.
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 --resolve "www.$NEW:443:216.198.79.1" "https://www.$NEW/")
[ "$CODE" = "200" ] || { echo "    ABORTADO: https://www.$NEW devuelve $CODE (esperaba 200)."; exit 1; }
echo "    OK: https://www.$NEW responde 200"

echo "==> 2/6 Actualizando el dominio en el codigo..."
perl -pi -e "s/\Q$OLD\E/$NEW/g" src/lib/site.ts public/llms.txt
grep -q "$NEW" src/lib/site.ts && echo "    lib/site.ts OK"
REMAIN=$(grep -rl "$OLD" src/ public/ 2>/dev/null | wc -l | tr -d " " || true)
echo "    archivos con el dominio viejo restantes: $REMAIN"

echo "==> 3/6 Build..."
npm run build 2>&1 | grep -E "Compiled|Failed|error" | head -5

echo "==> 4/6 Commit + push..."
git add -A
git commit -q -m "Switch canonical domain to aurafragancias.store

Correct spelling registered; point SITE constant, llms.txt and all
derived metadata (canonical, sitemap, robots, OG, JSON-LD) at the new
domain. Old domain 301-redirects to preserve indexed equity.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" || echo "    (sin cambios que commitear)"
git push -q origin main && echo "    pushed"

echo "==> 5/6 Deploy a produccion..."
vercel deploy --prod --yes > /tmp/switch_deploy.txt 2>&1
grep -qi '"readyState": "READY"' /tmp/switch_deploy.txt && echo "    deploy READY" || { echo "    DEPLOY FALLO:"; tail -20 /tmp/switch_deploy.txt; exit 1; }

echo "==> 6/6 Redirigiendo el dominio viejo (301) al nuevo..."
for d in "$OLD" "www.$OLD"; do
  curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.vercel.com/v9/projects/aura-fragancias/domains/$d?teamId=$TEAM" \
    -d "{\"redirect\":\"www.$NEW\",\"redirectStatusCode\":301}" \
    | python3 -c "import json,sys;d=json.load(sys.stdin);print('    ',d.get('name'),'->',d.get('redirect')) if not d.get('error') else print('     ERROR:',d['error'].get('message'))"
done

echo ""
echo "==> Verificacion final"
curl -s -o /dev/null -w "    https://www.$NEW        -> %{http_code}\n" --max-time 15 "https://www.$NEW/"
curl -s -o /dev/null -w "    https://$NEW            -> %{http_code}\n" --max-time 15 "https://$NEW/"
curl -s -o /dev/null -w "    https://www.$OLD (viejo) -> %{http_code} => %{redirect_url}\n" --max-time 15 "https://www.$OLD/"
echo "    canonical servido:"
curl -s --max-time 15 "https://www.$NEW/" | grep -o 'rel="canonical" href="[^"]*"' | head -1 | sed 's/^/      /'
echo ""
echo "LISTO."
