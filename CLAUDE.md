# Äura Fragancias — Notas del proyecto (memoria)

Tienda de perfumes (Paraguay). **Next.js 16 (App Router) + React 19 + Tailwind v4 + Firebase** (migrado desde Vite, ver `MIGRATION-NEXTJS.md`).

## Deploy
- **Hosting: Vercel**, proyecto `aura-fragancias` (team `croman-mvp-s-projects`), dominio canónico `www.aurafragancias.store` (también `aura-fragancias.vercel.app`).
- **Auto-deploy desde GitHub activo** (verificado 19 sep 2026: push a `main` → deploy `source: git`
  en ~40 s). Si no aparece, `vercel deploy --prod --yes` (CLI logueada como `ymk5py-commits`, team
  `croman-mvp-s-projects`; ojo, `vercel login` a veces queda en otra cuenta → `vercel switch`).
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
  JSON-LD. Reglas del bloque `reviews` publicadas el 19 sep 2026 (hasta ese día las reseñas fallaban
  en silencio en producción: lo publicado era del 30/08).
- Ficha en móvil: `StickyBuyBar` con precio y "Agregar" cuando el botón principal sale de la vista.

## Reglas de Firestore (desde 19 sep 2026: por CLI, nunca a mano)
- `firestore.rules` es la fuente de verdad. `npm run rules:deploy` las publica en `aura-fragancias`
  (la carpeta está asociada a `ymk5py@gmail.com` con `firebase login:use`; el binario es
  `~/.nvm/versions/node/v22.22.2/bin/firebase`). Copiar en la consola fue lo que las dejó viejas.
- `npm run test:rules` corre `scripts/test-rules.mjs` contra el emulador (necesita Java): lo que
  hace la tienda sin login y lo que debe seguir cerrado. Cada cambio de reglas → sumar caso → tests → deploy.

## Alertas (19 sep 2026) — /admin → Alertas
- Colección `incidents`: cada compra que no se pudo completar. La escribe el **navegador**
  (`src/lib/incidentsService.ts`, `reportIncident`, nunca lanza) porque Äura no tiene usuario de
  servicio en Firebase; las reglas permiten crear (validado, nace `seen:false`) y solo el admin lee,
  marca (`seen`/`seenAt`) y borra.
- Orígenes: `pedido-no-guardado` (saveOrder falló, tarjeta o transferencia), `pago-tarjeta`
  (startCardPayment falló: hub/Pagopar), `comprobante` (uploadReceipt falló), `verificacion-pago`
  (`/pago/[hash]` no pudo consultar el estado; una por visita).
- Panel: pestaña Alertas con contador rojo, aviso arriba de las otras pestañas, filtro sin
  revisar/todas, marcar revisada, borrar y botón de WhatsApp para recuperar la venta. Tiempo real
  (`subscribeIncidents`, onSnapshot) desde `AdminDashboard`.

## Comandos
- Dev: `npm run dev` (localhost:3000) · Build: `npm run build` · Typecheck: `npm run lint`
- Reglas: `npm run test:rules` · `npm run rules:deploy`
