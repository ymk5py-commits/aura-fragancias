# Plan de acción SEO — Äura Fragancias (priorizado)

## 🔴 CRÍTICO (hacer ya)

1. **Optimizar imágenes Cloudinary** — insertar `f_auto,q_auto,w_700` en las URLs.
   Impacto: −94% de peso (3,2 MB → ~196 KB). Mejora LCP, móvil y CWV. Esfuerzo: bajo.
   → 1 helper `cldn(url, w)` aplicado en ProductCard, ProductPage, Hero, admin.

2. **Meta por ruta** — título, descripción y canonical únicos en `/hombres`, `/mujeres`,
   `/unisex` y `/producto/:code`. Esfuerzo: medio (hook que setea `document.title` + meta).

3. **Pre-render de rutas** (recomendado, más grande) — generar HTML real para home +
   categorías con un prerender de Vite, o migrar a Next.js para SSR de fichas de producto.
   Esfuerzo: alto. Es la solución de fondo para indexación.

## 🟡 ALTO (esta semana)

4. **Product schema (JSON-LD)** por producto + `BreadcrumbList`. Habilita rich results.
5. **Diferir Firebase** del bundle inicial (lazy) para bajar el JS de la tienda.
6. **`llms.txt`** en la raíz para buscadores de IA (GEO).
7. **Sitemap con productos** — incluir las fichas `/producto/XX`.

## 🟢 MEDIO (este mes)

8. `<h1>` descriptivos con keywords por página.
9. Headers de seguridad en `vercel.json`.
10. `width/height` en imágenes para evitar CLS.
11. Contenido editorial (notas olfativas, descripciones) — más texto = más E-E-A-T.

## Quick wins que puedo aplicar ahora mismo (sin pre-render)
- ✅ Optimización de imágenes Cloudinary
- ✅ Meta dinámico por ruta (categorías y producto)
- ✅ Product schema + BreadcrumbList
- ✅ llms.txt + headers de seguridad + sitemap ampliado
- ✅ Lazy-load de Firebase

Estos 5 suben el puntaje estimado de **48 → ~75** sin tocar la arquitectura.
El pre-render/SSR (punto 3) lo llevaría a 85+.
