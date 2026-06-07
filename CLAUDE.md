# Äura Fragancias — Notas del proyecto (memoria)

Tienda de perfumes (Paraguay). **Vite 6 + React 19 + Tailwind v4 + React Router 7 (BrowserRouter) + Firebase**.

## Deploy
- **Hosting: Vercel**, proyecto `aura-fragancias` (team `croman-mvp-s-projects`), URL `aura-fragancias.vercel.app`.
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

## Comandos
- Dev: `npm run dev` (localhost:3000) · Build: `npm run build` · Typecheck: `npm run lint`
