# Auditoría SEO — Äura Fragancias

**Sitio:** https://www.aurafrangancias.store
**Tipo detectado:** E-commerce (perfumería de inspiraciones olfativas, Paraguay) · Next.js 16 App Router + SSR/ISR en Vercel
**Fecha:** 2026-07-07 · Auditoría anterior: 2026-06-07 (48/100, sobre el stack Vite SPA)

## Puntaje de salud SEO: **51 / 100** — *Necesita trabajo (pero con base técnica nueva sólida)*

⚠️ Nota de comparación: el 51 de hoy **no es comparable 1:1** con el 48 de junio. La migración
a Next.js resolvió los 3 críticos de junio (SSR ✅, imágenes optimizadas ✅, meta por ruta ✅)
— con la metodología de hoy, el sitio de junio habría dado ~30. El sitio mejoró muchísimo;
esta auditoría, al ser más profunda, destapó la siguiente capa de problemas: **enlazado
interno, contenido y consistencia de dominio**.

| Categoría | Peso | Puntaje | Junio |
|---|---|---|---|
| SEO Técnico | 22% | 58 | 55 |
| Calidad de contenido | 23% | 34 | 50* |
| On-Page | 20% | 52 | 55 |
| Schema / Datos estructurados | 10% | 62 | 50 |
| Performance (Core Web Vitals) | 10% | 48† | 30 |
| Preparación para IA (GEO) | 10% | 60 | 40 |
| Imágenes | 5% | 55 | 30 |

\* El puntaje de contenido bajó porque esta auditoría midió el texto real por página (junio no pudo: el HTML estaba vacío).
† Estimación por análisis estático: la API de PageSpeed devolvió 429 (cuota agotada). Correr `npx lighthouse` para confirmar.

---

## ✅ Resuelto desde junio (mérito de la migración a Next.js)

- SSR real en todas las rutas (`x-nextjs-prerender: 1`) — crawlers ven el contenido completo
- Title/description/canonical **únicos por página** (antes: duplicados en todas las rutas)
- `Product` + `Offer` + `BreadcrumbList` schema en fichas de producto
- Imágenes de producto vía Cloudinary con `f_auto,q_auto,w_800` (antes: PNG de 3,2 MB)
- `llms.txt` publicado y sirviendo (antes: 404)
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Sitemap con las 47 fichas de producto (antes: solo 4 URLs)
- 404 real en productos inexistentes (no soft-404)

---

## 🔴 Hallazgos CRÍTICOS

### 1. Cero enlaces internos hacia las fichas de producto — 47 páginas huérfanas
No existe **ni un solo `<a href="/producto/...">`** en todo el sitio. Las tarjetas
(`src/components/ProductCard.tsx:143-145`) abren un **modal** con `onClick`; el detalle nunca
se navega. Googlebot rastrea `/hombres` (29 hrefs totales) y no encuentra ruta alguna hacia
los productos: solo se descubren por sitemap.xml, sin anchor text ni PageRank interno.
**Fix:** envolver imagen/título de `ProductCard` en `<Link href={'/producto/'+code}>`
(puede convivir con el modal: `onClick={(e)=>{e.preventDefault(); setShowDetails(true)}}`),
y agregar sección "productos relacionados" en `ProductView`.

### 2. Todas las señales de canonicalización apuntan al dominio equivocado
El sitio sirve en `https://www.aurafrangancias.store` (el non-www hace 308 → www), pero
**canonical, sitemap (las 51 URLs), robots.txt y todo el JSON-LD usan non-www** — URLs que
redirigen. Google desperdicia crawl budget y las señales se diluyen.
**Fix (10 min):** cambiar la constante `SITE` a `https://www.aurafrangancias.store` en:
`src/app/layout.tsx:6`, `src/app/sitemap.ts:4`, `src/app/robots.ts:6`,
`src/app/(store)/producto/[code]/page.tsx:7` (ideal: centralizar en un solo módulo).

### 3. Thin content estructural en producto: 45-47 palabras por ficha
El modelo de datos (`src/types.ts`, interfaz `Perfume`) **no tiene campo `description`** —
no hay dónde escribir prosa aunque se quiera. Cada ficha es solo: nombre, familia, 3 notas
sueltas (sin pirámide salida/corazón/fondo), precios y botones. Para Google es contenido
programático de baja profundidad ×47 páginas; para ChatGPT/Perplexity no hay ni un párrafo
citable.
**Fix:** agregar `description` (100-150 palabras únicas por producto, generables en batch
con revisión) + desglosar notas en `topNotes/heartNotes/baseNotes`. Renderizar en
`ProductView.tsx` y sumar al schema.

### 4. El hero de la home está hotlinkeado desde un blog de terceros (druni.es)
`Hero.tsx:33-39` carga la imagen LCP desde
`druni.es/blog/wp-content/uploads/2026/03/03_Perfumes_unisex_PORTADA.jpg` (70,8 KB,
TTFB 0,84s + TLS extra). Si Druni borra el post o bloquea hotlinking, **la home queda sin
hero**. Además es JPEG fijo sin srcset y es contenido de un tercero (riesgo de copyright).
**Fix:** subir una imagen propia a Cloudinary (bucket `drtvcb5ei` ya en uso) y servirla con
`next/image` + `priority`.

### 5. Políticas legales enterradas en modales no indexables
Términos, Envíos y Devoluciones y la aclaración de "inspiraciones" viven en `LegalModal.tsx`
abiertos por `<button>` (`Footer.tsx:62-67`): sin URL, sin sitemap, invisibles para Google.
**Bloquea Google Merchant Center** (exige URL pública de política de envío/devolución) y
resta el trust que el QRG evalúa en tiendas. La aclaración "inspiración ≠ falsificación"
solo existe en llms.txt, no en HTML visible.
**Fix:** crear rutas `/envios-y-devoluciones`, `/terminos-y-condiciones`,
`/sobre-inspiraciones`, reusar el contenido del modal, linkear con `<a>` real en footer,
sumar al sitemap.

---

## 🟡 Hallazgos ALTOS

6. **Google Fonts render-blocking** — Cormorant Garamond (6 pesos) + Inter (5) vía `<link>`
   (`layout.tsx:73-78`) en vez de `next/font/google`. Dos saltos de red bloqueantes antes de
   pintar texto; afecta LCP y CLS.
7. **~1,17 MB de JS (Brotli) en el head** — 12 chunks; el mayor pesa 462 KB. Correr
   `@next/bundle-analyzer`; sospechosos: import no-modular de Firebase o lucide-react entero
   filtrándose al bundle público.
8. **Offer del schema declara un solo precio (Gs. 30.000) para todos los productos** —
   ignora las variantes 30ML (Gs. 70.000) y 50ML (Gs. 120.000)
   (`producto/[code]/page.tsx:55`). Falta además `shippingDetails`,
   `hasMerchantReturnPolicy` y `priceValidUntil` (requisitos de elegibilidad de Merchant
   Listing desde 2023). Usar array de 3 Offers o `AggregateOffer` (low 30.000 / high 120.000).
9. **Typos en nombres de producto servidos en title/H1**: "AQCUA DI GIO", "GIRGIO ARMANI"
   (`constants.tsx:126`), "GIOGIO ARMANI", "HEREOS MEN" — dañan el matching de búsqueda
   ("acqua di gio paraguay" no matchea) y la percepción de "lujo". Corregir en constants.tsx
   **y en Firestore** (auditar el catálogo completo desde /admin).
10. **`/mayoristas` no existe como página** — es un anchor `/#mayoristas`. La query
    "perfumes por mayor paraguay" tiene SERP propio y Äura no compite. Crear página indexable
    con title/H1/FAQ dedicados.
11. **Ninguna imagen usa `next/image`** (0 resultados en grep) — sin srcset/sizes, sin lazy
    nativo, sin blur placeholder. Migrar con loader custom de Cloudinary.
12. **H1 de la home es solo "ÄURA"** — cero keyword. Poner el wordmark en un `<span>` y usar
    H1 semántico tipo "Perfumes Extrait de Parfum 30% en Paraguay".
13. **Sin reseñas de clientes en ningún lado** — cero señal social. No inventar
    AggregateRating (violación de políticas de Google); implementar fuente real primero
    (Google Business Profile, widget, o sistema propio moderado).

## 🟠 Hallazgos MEDIOS

14. Categorías thin: `/hombres` solo tiene H2 + 1 línea antes del grid. Agregar 100-150
    palabras de intro por categoría.
15. Breadcrumb existe solo en JSON-LD, no visible/navegable. Renderizar `<nav>` real en
    producto (los datos ya se calculan en `page.tsx:40-41`).
16. Sin `ItemList` + `BreadcrumbList` en páginas de categoría (solo heredan el Store global).
17. Filtros de catálogo (categoría/intensidad/búsqueda) son `useState` puro — no generan
    URLs indexables (`/hombres?familia=amaderada` no existe). Se pierde todo el long-tail.
    `ScentFamilies` es decorativo: no filtra el catálogo real.
18. Sin FAQ visible ni headings-pregunta en todo el sitio (0 "¿...?"). Es el formato #1 que
    citan los motores de IA. Agregar FAQ en home con schema FAQPage.
19. llms.txt: enlaces en formato `- Nombre: URL` (no markdown `[Nombre](URL)`), no lista Top
    Ventas ni Mayoristas, y usa dominio non-www.
20. Falta `WebSite` schema (y `SearchAction` si se agrega búsqueda global).
21. Falta `preconnect` a `res.cloudinary.com` (todo el grid de productos viene de ahí).
22. Sin Content-Security-Policy en vercel.json (los otros headers están bien).
23. Sitemap sin `<lastmod>` en ninguna URL.
24. URLs de producto con código interno (`/producto/CC012`) en vez de slug legible
    (`/producto/allure-sport-men-chanel-cc012`). Migrable con 301 + slug con sufijo de código.
25. Sección Mayoristas y "Sobre Äura": no hay página "Nosotros" — cero E-E-A-T de quién está
    detrás (competidores locales como Belleza & Aroma sí lo explotan).
26. `availability` hardcodeado `InStock` para todo el catálogo, sin campo real de stock.
27. WhatsApp checkout: excelente mensaje prellenado, pero sin línea de origen
    (ej. `*Origen: Web Checkout*`) para trazabilidad.

## 🟢 Hallazgos BAJOS

28. IndexNow no implementado (relevante solo para Bing; Google domina en PY — backlog).
29. `strict-transport-security` sin `includeSubDomains; preload`.
30. Sin canal de YouTube ni presencia en Reddit/directorios PY (señales de autoridad externa
    para citación por IA). Evaluar Google Business Profile si hay dirección real atendible.
31. Alt text inconsistente entre `ProductCard` ("{name} — inspiración {marca}", muy bueno) y
    `ProductView` (solo "{name}").

---

## Detalle de puntajes por especialista

| Especialista | Puntaje | Hallazgo dominante |
|---|---|---|
| SEO Técnico | 58/100 | Canonical/sitemap/robots en dominio que redirige + 0 links internos a producto |
| Contenido/E-E-A-T | 34/100 | 45-47 palabras por ficha; sin campo description; políticas en modales |
| Schema | 62/100 | Product/Offer existen pero con precio único y sin shipping/returns |
| Performance | ~48/100 (est.) | Hero de terceros + fonts render-blocking + 1,17 MB JS |
| GEO / IA | 60/100 | Base técnica excelente (SSR, llms.txt, robots abierto); cero prosa citable |
| E-commerce | 44/100 | Interlinking 20/100 y Merchant readiness 25/100 son los drags |
| SXO | 58/100 | Arquitectura no cubre "mayoristas" ni "perfumes árabes"; filtros no operacionalizados |

## Top 5 oportunidades de contenido (keywords objetivo)

1. "¿Qué es un Extrait de Parfum? Diferencia con EDT/EDP" — ya es el diferencial de marca, nunca explicado
2. Guía "perfumes para el calor de Paraguay" / por ocasión — long-tail local sin competencia
3. "Cómo hacer que tu perfume dure más" — alto volumen, CTA natural al catálogo
4. Tablas de equivalencias por familia olfativa ("similar a Sauvage en Paraguay") — máxima intención de compra del nicho
5. "Comprar perfumes por WhatsApp en Paraguay — FAQ" — convierte los modales en página indexable + featured snippet
