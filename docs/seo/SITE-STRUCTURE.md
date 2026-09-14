# Äura — Estructura del sitio

```
/                       Home (hero, marquee de inspiraciones, familias olfativas, top ventas, precios, mayoristas, FAQ)
/hombres /mujeres /unisex   Categorías (ItemList + BreadcrumbList)
/producto/<code>        Ficha (Product + 3 Offer + envío/devoluciones + BreadcrumbList) — 47 páginas
/mayoristas             Canal B2B (FAQPage)
/sobre-inspiraciones    Página educativa/E-E-A-T
/envios-y-devoluciones  FAQ + políticas
/terminos-y-condiciones
/pago/[hash]            noindex
/admin /api             noindex / disallow
/blog (nuevo)           Guías con autor real
/familia/<slug> (propuesta)  Páginas por familia olfativa (oriental, amaderado, floral, cítrico…)
```

## Reglas
- Una URL por producto; las presentaciones (10/30/50 ml) son `Offer` dentro del mismo `Product`.
- Filtros de familia/notas: crear páginas indexables por familia olfativa con intro propia
  (hoy `ScentFamilies` es una sección de la home); notas y precio por query string con canonical.
- Enlazado: ficha → familia → 4 relacionados (ya existe "pickRelated"); blog → 3–5 fichas.
- Sitemap generado (ya existe) + blog cuando exista.
