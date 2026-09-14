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
- Misma cuenta de comercio **"Albastore"** que albastore.lat. **Äura no tiene tokens de Pagopar
  ni acceso al servidor de Firebase**: todo pasa por el hub de ALBA
  (`https://albastore.lat/api/pagopar/hub`, secreto compartido `PAGOPAR_HUB_SECRET` en los
  dos proyectos de Vercel).
- Flujo: checkout → `POST /api/pagopar/iniciar` (valida precios contra `settings/site` de
  Firestore, pide al hub la transacción) → el navegador guarda el pedido en Firestore con
  `pagoparHash` → Pagopar. Pagopar redirige a ALBA, ALBA manda a `/pago/[hash]`, que consulta
  `GET /api/pagopar/estado?hash=` (hub → `pedidos/1.1/traer`). El detalle del pedido en esa
  página sale de localStorage (`aura_pago_<hash>`), guardado por el checkout.
- El webhook de Pagopar llega a ALBA y ALBA lo reenvía a `/api/pagopar/respuesta` (firmado con
  el secreto); acá solo se registra en el log. **Pagopar es la fuente de verdad**: el panel
  (`/admin` → Pedidos) verifica los pedidos con tarjeta pendientes al abrir la bandeja y con el
  botón "Verificar pago", y los deja `confirmado` + `pagoparStatus: pagado`.
- Reintento de pago = volver al mismo link de Pagopar (`pagopar.com/pagos/<hash>`); no se crea
  otra transacción. `id_pedido_comercio` = `orderId` (AURA-…).
- Código: `src/lib/server/{pagopar,pricing}.ts`, rutas `src/app/api/pagopar/*`, cliente
  `src/lib/payments.ts`, validación de campos `src/lib/validation.ts`,
  `src/components/{Checkout,PagoResultado}.tsx`, `src/admin/AdminOrders.tsx`.

## Reseñas (13 sep 2026)
- Colección `reviews`: el cliente escribe desde la ficha (`approved: false`); en /admin → Reseñas se
  aprueba, oculta, borra o carga una a mano. Las páginas públicas leen las aprobadas por SSR
  (`src/lib/server/reviews.ts`, revalida 5 min) y la ficha suma `aggregateRating`/`review` al
  JSON-LD. **Hay que publicar las reglas** de `firestore.rules` (bloque `reviews`) en la consola de
  Firebase; hasta entonces no se leen ni se guardan (sin romper nada).
- Ficha en móvil: `StickyBuyBar` con precio y "Agregar" cuando el botón principal sale de la vista.

## Comandos
- Dev: `npm run dev` (localhost:3000) · Build: `npm run build` · Typecheck: `npm run lint`
