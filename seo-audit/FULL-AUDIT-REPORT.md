# Auditoría SEO — Äura Fragancias

**Sitio:** https://www.aurafrangancias.store
**Tipo detectado:** E-commerce (perfumería de lujo, Paraguay) · SPA React en Vercel
**Fecha:** 2026-06-07

## Puntaje de salud SEO: **48 / 100** — *Necesita trabajo*

El sitio tiene bases buenas (HTTPS, sitemap, robots, meta y schema en la home, diseño
responsive), pero lo arrastran hacia abajo **dos problemas estructurales**: imágenes sin
optimizar (peso brutal) y renderizado 100% del lado del cliente (los buscadores ven una
página vacía en las rutas internas).

| Categoría | Peso | Puntaje |
|---|---|---|
| SEO Técnico | 22% | 55 |
| Calidad de contenido | 23% | 50 |
| On-Page | 20% | 55 |
| Schema / Datos estructurados | 10% | 50 |
| Performance (Core Web Vitals) | 10% | 30 |
| Preparación para IA (GEO) | 10% | 40 |
| Imágenes | 5% | 30 |

---

## 🔴 Hallazgos CRÍTICOS

### 1. Imágenes de producto sin optimizar — 3,2 MB cada una
Las fotos de Cloudinary se sirven como **PNG original sin transformar**:
- `CC157_zrgxcz.png` → **3.258.308 bytes (3,2 MB)**
- La misma con `f_auto,q_auto` → **196.262 bytes (196 KB)** en JPEG/WebP → **94% menos**

La home (Top Ventas) carga ~8 imágenes = **~26 MB de imágenes**. En celular con datos esto
es demoledor: LCP altísimo, rebote, y Google penaliza Core Web Vitals.
**Arreglo:** insertar `f_auto,q_auto,w_700` en las URLs de Cloudinary (1 helper, aplica a todo).

### 2. SPA sin SSR — el contenido no existe para los buscadores
El HTML que recibe un crawler tiene el `<body>` **vacío** (`<div id="root">` y nada más):
- Sin `<h1>` en el HTML
- 0 enlaces a productos en el HTML
- Todo el catálogo, categorías y fichas se pintan con JavaScript

Google puede renderizar JS, pero: indexa más lento, y **Bing, redes sociales y crawlers de
IA (ChatGPT, Perplexity) ven la página vacía**. Para una tienda, las páginas de categoría y
producto son las que traen tráfico; hoy no son indexables de forma confiable.

### 3. Meta/título/canonical duplicados en todas las rutas
Como el `index.html` es estático, **todas las URLs** (`/`, `/hombres`, `/mujeres`, `/unisex`,
`/producto/XX`) entregan el **mismo título, misma descripción y canonical apuntando a `/`**.
Google ve contenido duplicado y no entiende qué página rankear para cada búsqueda.

---

## 🟡 Hallazgos ALTOS

### 4. Falta Product Schema (datos estructurados de producto)
Hay `Store` schema en la home (bien), pero **no hay `Product` schema** por producto
(nombre, precio, disponibilidad, marca). Sin esto no se accede a resultados enriquecidos
(estrellas, precio en Google). Falta también `BreadcrumbList`.

### 5. Bundle JS pesado (225 KB gzip)
Firebase carga en el arranque de la tienda (no solo en `/admin`). Se puede diferir para
bajar el JS inicial y mejorar el INP/TBT.

### 6. Sin `llms.txt` (preparación para buscadores de IA)
404 en `/llms.txt`. Los motores de IA usan este archivo para entender el sitio.

---

## 🟢 Hallazgos MEDIOS / pulido

- **Encabezados genéricos:** el `<h1>` es "ÄURA" / "Hombres". Mejor `<h1>` descriptivo y con
  keywords ("Perfumes de Hombre — Inspiraciones de Lujo | Äura Paraguay").
- **Headers de seguridad faltantes:** `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy` (quick win en `vercel.json`).
- **Sitemap mínimo:** solo 4 URLs estáticas. Falta incluir las fichas de producto.
- **Sin imágenes `width/height`** declaradas en algunas → riesgo de CLS.
- **Alt text:** presente y descriptivo en tarjetas (✅ bien).

## ✅ Lo que ya está bien
- HTTPS + HSTS, `robots.txt` y `sitemap.xml` válidos (200)
- Meta title/description/OG/Twitter de la home bien escritos y con largo correcto
- `Store` JSON-LD con NAP, horario y redes
- Diseño responsive, mobile-first, viewport correcto
- Assets con hash + caché inmutable (Vercel)
- Favicon/OG con el logo oficial
