# Äura Fragancias — Notas del proyecto (memoria)

Tienda de perfumes (Paraguay). **Next.js 16 (App Router) + React 19 + Tailwind v4 + Firebase** (migrado desde Vite, ver `MIGRATION-NEXTJS.md`).

## Deploy
- **Hosting: Vercel**, proyecto `aura-fragancias` (team `croman-mvp-s-projects`), dominio canónico `www.aurafragancias.store` (también `aura-fragancias.vercel.app`).
- ⚠️ **El auto-deploy desde GitHub NO está activo.** Hay que desplegar a mano:
  `vercel deploy --prod --yes` (la carpeta está vinculada con `.vercel/`).
- ⚠️ **Siempre tener `.vercelignore`** con `03_AURA_PERFUMES/` — esa carpeta (≈500MB de
  catálogos/dossiers internos) NO debe subirse al deploy (quedaría pública) ni a git.
- `vercel.json` tiene rewrite SPA para que `/admin`, `/hombres`, etc. funcionen con BrowserRouter.

## Gotchas ya aprendidos (no repetir)
1. **macOS es case-insensitive, Vercel/Linux NO.** Los nombres de archivos de assets deben
   coincidir EXACTO con las referencias del HTML, o da página en blanco (404 de JS/CSS).
2. **Python del sistema es 3.9**; para skills que piden 3.10+ usar `python3.12` (`~/.local/bin/python3.12`).
3. **Firebase Storage bucket** usa el formato nuevo `aura-fragancias.firebasestorage.app` (no `.appspot.com`).
4. Logo oficial = `/public/logo.svg` (disco negro con Ä dorada). NO usar la foto vieja de Cloudinary (`pawlsw.jpg`).

## Firebase (proyecto `aura-fragancias`)
- Config en `.env` (local, gitignored) y en Vercel Env Vars (production+preview). Claves Web = públicas por diseño.
- Código: `src/lib/firebase.ts` (init + Analytics opcional), `src/context/{AuthContext,ProductsContext}.tsx`,
  `src/lib/productsService.ts`, panel en `src/admin/*` (ruta `/admin`, lazy-loaded).
- Firestore colección `products` (id = code). Storefront lee `visible !== false`. Top Ventas ordena por `salesScore`.
- Reglas de seguridad y pasos de consola: ver `FIREBASE_SETUP.md`.

## Pagopar (pago con tarjeta) — desde 13 sep 2026
- Misma cuenta de comercio **"Albastore"** que albastore.lat. Pagopar admite UNA URL de
  respuesta y UNA de redirección por comercio, y apuntan a ALBA:
  `https://albastore.lat/api/pagopar/respuesta` y `https://albastore.lat/pago/($hash)`.
  ALBA busca el hash en sus pedidos; si no es suyo, reenvía el webhook a
  `/api/pagopar/respuesta` de acá y redirige a la clienta a `/pago/[hash]` de acá
  (variable `PAGOPAR_PEER_STORES` en el Vercel de ALBA).
- Código: `src/lib/server/{pagopar,firestoreRest,pagoparOrders,types}.ts` (solo servidor),
  rutas `src/app/api/pagopar/{iniciar,respuesta,estado}`, cliente `src/lib/payments.ts`,
  checkout `src/components/Checkout.tsx`, resultado `src/components/PagoResultado.tsx`.
- Firestore desde el servidor: usuario de Firebase Auth dedicado (`FIREBASE_SERVER_EMAIL` /
  `FIREBASE_SERVER_PASSWORD`); las reglas ya permiten read/update de `orders` a cualquier
  usuario autenticado. Tokens en `PAGOPAR_PUBLIC_KEY` / `PAGOPAR_PRIVATE_KEY` (los mismos
  que ALBA). La opción aparece en el checkout con `NEXT_PUBLIC_PAGOPAR_ENABLED=true`.
- Un pedido pagado por Pagopar queda `status: confirmado` + `pagoparStatus: pagado` y el
  servidor manda el Purchase a Meta por CAPI (mismo event_id que el Pixel de `/pago`).
- Pagopar rechaza el documento con puntos o guion: el servidor manda solo dígitos.
- `id_pedido_comercio` = `orderId` (AURA-…) más `-N` en cada reintento; nunca se repite.

## Comandos
- Dev: `npm run dev` (localhost:3000) · Build: `npm run build` · Typecheck: `npm run lint`
