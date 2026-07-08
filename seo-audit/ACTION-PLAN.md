# Plan de acción SEO — Äura Fragancias (2026-07-07)

Ordenado por **impacto ÷ esfuerzo**. Referencias exactas de archivo para ejecutar sin re-investigar.
(El plan anterior, de junio, se completó con la migración a Next.js — este es el ciclo 2.)

## 🔴 Semana 1 — Críticos (desbloquean indexación y descubrimiento)

- [ ] **1. Unificar dominio a www** (⏱ 10 min, impacto enorme)
      Cambiar `SITE` a `https://www.aurafrangancias.store` en:
      `src/app/layout.tsx:6` · `src/app/sitemap.ts:4` · `src/app/robots.ts:6` ·
      `src/app/(store)/producto/[code]/page.tsx:7`. Ideal: exportar desde un único
      `src/lib/site.ts`. Verificar luego canonical, sitemap y JSON-LD.

- [ ] **2. Enlaces internos reales a producto** (⏱ 1-2 h, el fix más importante del audit)
      `src/components/ProductCard.tsx:143-145`: envolver imagen+título en
      `<Link href={'/producto/'+code}>`; conservar modal con `e.preventDefault()` si se
      quiere. Agregar "También te puede gustar" (4 productos misma familia) en
      `ProductView.tsx` → interlinking entre fichas.

- [ ] **3. Hero propio (sacar druni.es)** (⏱ 30 min)
      Subir imagen propia a Cloudinary y actualizar el setting en Firestore/admin.
      `src/components/Hero.tsx:33-39`. Bonus: `<link rel="preconnect" href="https://res.cloudinary.com">`
      en `layout.tsx`.

- [ ] **4. Corregir typos del catálogo** (⏱ 30 min, desde /admin + `constants.tsx`)
      "AQCUA DI GIO"→"ACQUA DI GIÒ" · "GIRGIO"/"GIOGIO"→"GIORGIO" (`constants.tsx:126`) ·
      "HEREOS"→revisar. Auditar los 47 nombres. Afectan title/H1 servidos.

## 🟡 Semanas 2-3 — Altos (contenido + Merchant + performance)

- [ ] **5. Campo `description` + pirámide olfativa por producto**
      `src/types.ts`: agregar `description`, `topNotes/heartNotes/baseNotes`.
      Renderizar en `ProductView.tsx`. Redactar 100-150 palabras únicas ×47 (batch con IA +
      revisión). Mata el thin content Y habilita citación por ChatGPT/Perplexity.

- [ ] **6. Páginas legales indexables** (desbloquea Google Merchant Center)
      Crear `/envios-y-devoluciones`, `/terminos-y-condiciones`, `/sobre-inspiraciones`
      reusando contenido de `LegalModal.tsx`. Footer con `<a>` reales
      (`Footer.tsx:62-67`). Sumar a `sitemap.ts`.

- [ ] **7. Schema Offer completo**
      `producto/[code]/page.tsx:52-58`: array de 3 Offers (10/30/50ML con precios reales) o
      `AggregateOffer` (30.000–120.000), + `shippingDetails` (envío gratis ≥ Gs. 300.000),
      `hasMerchantReturnPolicy`, `priceValidUntil`, `mpn: code`,
      `category: "Beauty & Personal Care > Fragrance"`.
      El bloque JSON-LD completo listo para copiar está en FULL-AUDIT-REPORT.

- [ ] **8. next/font** — reemplazar `<link>` de Google Fonts (`layout.tsx:73-78`) por
      `Cormorant_Garamond` + `Inter` de `next/font/google` (subsets latin, display swap).

- [ ] **9. Página /mayoristas indexable** — mover contenido de `Wholesale.tsx` a ruta propia
      con title "Perfumes por Mayor en Paraguay | Äura", H1, FAQ, schema. Header: cambiar
      `/#mayoristas` → `/mayoristas`. Única forma de competir esa query B2B.

- [ ] **10. Breadcrumb visible en producto** — `<nav>` con Links (Inicio → Género → Producto),
      datos ya calculados en `producto/[code]/page.tsx:40-41`.

## 🟠 Mes 1-2 — Medios

- [ ] **11. next/image en los 6 componentes** con loader custom Cloudinary
      (`images.loaderFile` en next.config; adaptar `src/lib/img.ts`).
- [ ] **12. Bundle analyzer** — investigar chunk de 462 KB (¿Firebase no-modular? ¿lucide?);
      `next/dynamic` para modales/carrito.
- [ ] **13. FAQ en home** (6-8 preguntas: envíos, 30%, inspiración≠copia, pagos, mayoristas)
      + schema FAQPage + headings en formato pregunta.
- [ ] **14. Intro de 100-150 palabras en cada categoría** + `ItemList`+`BreadcrumbList` schema.
- [ ] **15. H1 de home con keyword** ("Perfumes Extrait de Parfum 30% en Paraguay"; el
      wordmark ÄURA como span/logo).
- [ ] **16. Filtros → URLs indexables** — conectar `ScentFamilies` al catálogo
      (`/hombres?familia=...` con searchParams SSR o rutas `/familia/[slug]`).
- [ ] **17. llms.txt v2** — links markdown `[Nombre](URL)`, secciones Top Ventas y
      Mayoristas, dominio www.
- [ ] **18. WebSite schema** en layout (+ SearchAction si se agrega búsqueda global).
- [ ] **19. Contenido editorial** — 2 piezas iniciales: "¿Qué es Extrait de Parfum?" y
      tabla de equivalencias por familia. (Ver top 5 keywords en el reporte.)
- [ ] **20. lastmod en sitemap** (usar `updatedAt` de Firestore si existe; si no, crearlo).

## 🟢 Backlog

- [ ] Slugs legibles en URLs de producto (con 301 desde /producto/CCxxx; sufijo -ccxxx)
- [ ] CSP header + HSTS `includeSubDomains; preload` en vercel.json
- [ ] Sistema de reseñas real → recién entonces AggregateRating
- [ ] Google Business Profile (si hay dirección atendible) + directorios PY
- [ ] Canal YouTube / presencia Reddit (señal de autoridad para IA)
- [ ] IndexNow para Bing
- [ ] Línea "*Origen: Web Checkout*" en el mensaje de WhatsApp (`Checkout.tsx:59-76`)
- [ ] Actualizar CLAUDE.md del proyecto (aún describe el stack Vite; hoy es Next.js 16)

## Métrica de éxito (revisar en 30 días en Search Console)

1. Cobertura: las 47 fichas pasan de "Descubierta, no indexada" → "Indexada"
2. Impresiones para queries no-marca ("perfume similar a X paraguay", "perfumes por mayor")
3. LCP móvil < 2,5s tras hero propio + next/font (confirmar con Lighthouse, la API dio 429 hoy)
