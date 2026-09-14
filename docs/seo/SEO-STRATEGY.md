# Äura Fragancias — Estrategia SEO (13 sep 2026, ciclo 3)

Continúa `seo-audit/ACTION-PLAN.md` (ciclo 2, jul 2026). Esta nota agrega lo medido y hecho hoy.

## 1. Diagnóstico

| Métrica (móvil, Lighthouse local) | Antes | Después (hoy) |
|---|---|---|
| Performance home / producto | 68 / 72 | **91 / 79** |
| LCP home | **16,1 s** (el modal de bienvenida a los 12 s era el LCP) | **2,4 s** |
| LCP / Speed Index producto | 4,0 s / 13,2 s | 3,8 s / **5,5 s** |
| Accesibilidad | 89 / 89 | **96 / 94** |
| Foto subida desde el panel en la ficha | **2,1 MB** (Firebase sin optimizar) | pasa por `/_next/image` (AVIF/WebP) |
| Título home / descripción | 80 / 206 caracteres | **58 / 158** |
| `lang` | es | **es-PY** |

Hecho hoy: barra de bienvenida compacta (antes modal a pantalla completa), loader de imágenes
para Firebase/locales, formatos AVIF/WebP, caché de banners, `aria-label` en botones de icono,
jerarquía de encabezados, dorado profundo 5,2:1 y texto oscuro sobre dorado, metadatos más
cortos, pago con tarjeta (Pagopar vía hub de ALBA), factura con RUC, validación de checkout.

Ya estaba bien (ciclo 2): SSR/ISR con contenido real (1.100 palabras en home), `Store`,
`WebSite`, `Product` con 3 `Offer` + envío/devoluciones, `BreadcrumbList`, `ItemList`,
`FAQPage`, sitemap de 102 URLs, robots con crawlers de IA, `llms.txt`, fuentes self-hosted,
enlaces internos a producto, canonical www.

## 2. Negocio y público

- Perfumes "inspiración" Extrait de Parfum 30 %, 47 fragancias, ticket ₲ 30–120 mil, más canal
  mayorista. Público 18–45, Asunción/Gran Asunción e interior; búsquedas por nombre de la
  fragancia original + "inspiración/alternativa/árabe/decant", por género y por "perfumes
  baratos/buenos Paraguay".
- Objetivo: rankear por cada nombre de inspiración ("inspiración Sauvage Paraguay"), por
  categorías ("perfumes de hombre Paraguay") y por mayorista ("perfumes por mayor Paraguay").

## 3. KPI

| Métrica | Base (sep 2026) | 3 meses | 6 meses | 12 meses |
|---|---|---|---|---|
| Sesiones orgánicas / mes | (ver GSC) | +50 % | ×2 | ×4 |
| Palabras clave top 10 | (ver GSC) | 40 | 100 | 250 |
| Páginas indexadas | ~100 | 110 | 140 (blog) | 200 |
| LCP móvil (CrUX) | sin datos | < 3 s | < 2,5 s | < 2,5 s |
| Pedidos orgánicos / mes | — | 15 | 40 | 120 |

## 4. Palabras clave objetivo

| Grupo | Ejemplos | Página |
|---|---|---|
| Marca | äura fragancias, aura perfumes paraguay | Home |
| Categoría | perfumes de hombre paraguay, perfumes mujer paraguay, perfumes unisex nicho | `/hombres` `/mujeres` `/unisex` |
| Inspiración (long tail, 47 fichas) | "inspiración sauvage", "perfume parecido a la vie est belle", "alternativa good girl" | `/producto/<code>` |
| Mayorista | perfumes por mayor paraguay, revender perfumes | `/mayoristas` |
| Informativas | qué es extrait de parfum, diferencia edp edt, cuánto dura un perfume, perfumes árabes vs inspiraciones | `/sobre-inspiraciones`, blog |

## 5. E-E-A-T

- Autoría real en blog y "Sobre inspiraciones" (quién formula, proceso de 21 días de macerado
  con fotos propias).
- Reseñas de clientes con nombre y ciudad; `AggregateRating` cuando haya ≥ 5 por producto.
- Transparencia: aclarar en cada ficha que es una inspiración (ya se hace) y política de
  devoluciones (ya existe).

## 6. Diseño (revisión de hoy)

Diseño noir de lujo, coherente y bien ejecutado. Ajustes recomendados:

1. **Hero en móvil**: la foto queda casi negra (superposición 85–95 %) y ocupa toda la pantalla;
   bajar la superposición en móvil y dejar que asome la primera fila de productos (92dvh).
2. **Medios de pago visibles**: fila con tarjeta/QR/billeteras/transferencia + logo Pagopar en
   ficha, carrito y footer (recién habilitado).
3. **Fichas**: foto del producto más grande arriba en móvil, precio por presentación como
   selector tipo "chips" (ya existe) y CTA fijo al hacer scroll.
4. **Reseñas** con foto en home y ficha.
5. Mantener la barra de bienvenida (ya no tapa la tienda).
