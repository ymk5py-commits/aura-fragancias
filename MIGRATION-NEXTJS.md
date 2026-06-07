# Migración a Next.js (SSR) — en progreso

**Rama:** `nextjs-migration` (producción sigue en `main` con Vite, intacta).

## Objetivo
Renderizar en el servidor las páginas de catálogo y producto para que Google, Bing y
crawlers de IA reciban HTML real e indexable (hoy reciben `<body>` vacío). Meta-tags por
ruta nativos. Sube el SEO de ~75 a ~85+.

## Arquitectura
- **Next.js 16 (App Router)** + React 19 + Tailwind v4 (PostCSS).
- **SSR de datos:** Server Components leen productos/settings desde la **API REST de
  Firestore** (clave web pública, reglas permiten lectura). Fallback al catálogo incluido.
- **Interactividad (cliente):** carrito, modales, panel `/admin` como Client Components.
  El estado del carrito vive en un `CartProvider` en el layout cliente.
- **Meta por ruta:** `generateMetadata()` nativo (reemplaza el componente `<Seo>`).
- **Deploy:** Vercel detecta Next.js automáticamente (mismo proyecto).

## Mapa de rutas
| Vite (react-router) | Next.js (app router) |
|---|---|
| `/` | `app/page.tsx` (SSR) |
| `/hombres` `/mujeres` `/unisex` | `app/[gender]` o rutas dedicadas (SSR) |
| `/producto/:code` | `app/producto/[code]/page.tsx` (SSR + generateMetadata) |
| `/admin` | `app/admin/page.tsx` (cliente) |

## Cambios de API por componente
- `Link` (react-router) → `next/link`
- `useNavigate` → `useRouter` (next/navigation)
- `useParams` → params del page / `useParams` (next/navigation)
- `useLocation`/pathname → `usePathname`
- `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`

## Estado
- [x] Rama creada
- [x] Scaffold Next 16 + Tailwind v4 (PostCSS) + tsconfig + next.config
- [x] Env vars `NEXT_PUBLIC_*` + firebase.ts adaptado
- [x] Data layer SSR (`lib/serverData.ts`, Firestore REST + ISR 2min) + fallback
- [x] Contexts cliente (`'use client'` + datos iniciales): Auth, Products, Settings
- [x] `CartContext` (carrito/checkout/notificaciones, portado de App.tsx)
- [x] `providers.tsx` + `app/layout.tsx` (raíz, metadata nativa, fuentes, Store JSON-LD)
- [x] `globals.css`
- [ ] **`StoreChrome`** cliente (Header/Footer/WhatsApp/modales/checkout/notif) ← siguiente
- [ ] Portar componentes a Next (next/link, usePathname, useRouter, useCart)
- [ ] `app/(store)/layout.tsx` + `page.tsx` (home SSR)
- [ ] Categorías `/hombres /mujeres /unisex` (SSR)
- [ ] `app/producto/[code]/page.tsx` (SSR + generateMetadata + Product schema)
- [ ] `app/admin/page.tsx`
- [ ] `sitemap.ts` / `robots.ts` nativos
- [ ] Build verde + deploy a Vercel (preview) + verificación SEO
