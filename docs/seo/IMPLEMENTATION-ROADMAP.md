# Äura — Hoja de ruta (ciclo 3)

## Fase 1 · Fundación (semanas 1–4) — hecho hoy en gran parte
- [x] LCP: barra de bienvenida compacta; loader de imágenes para Firebase/locales; AVIF/WebP; caché
- [x] Accesibilidad: nombres de botones, jerarquía de encabezados, contraste
- [x] Metadatos ≤ 60/160, `lang es-PY`
- [x] Pago con tarjeta (Pagopar) + factura con RUC + validación de checkout
- [ ] Google Search Console: enviar sitemap, pedir indexación de fichas y páginas nuevas
- [ ] `META_CAPI_TOKEN` y `NEXT_PUBLIC_GA4_ID` en Vercel (hoy CAPI es no-op)
- [ ] Datos de Firestore: typos de nombres/notas, imagen duplicada DD161 (pendiente desde julio)

## Fase 2 · Expansión (semanas 5–12)
- [ ] Descripciones reales por producto (campo ya existe en /admin)
- [ ] Páginas por familia olfativa indexables
- [ ] Blog en Next (MDX o Firestore) con autor real, 2 guías/mes
- [ ] Reseñas (pedido por WhatsApp post-entrega) → `AggregateRating`
- [ ] Diseño: hero móvil más claro y 92dvh; medios de pago en ficha/carrito/footer; CTA fijo en ficha móvil

## Fase 3 · Escala (semanas 13–24)
- [ ] Google Merchant Center (listados gratuitos) con feed (`/feed.xml` ya existe para Meta; adaptar)
- [ ] Enlaces: prensa/blogs de belleza PY, creadoras, directorio de tiendas
- [ ] Reducir JS no usado (bundle) y forced reflow en home
- [ ] CrUX: LCP < 2,5 s en campo

## Fase 4 · Autoridad (meses 7–12)
- [ ] Contenido de temporada (Día de la Madre, Navidad), comparativas por familia
- [ ] Programa de revendedoras con página propia y testimonios
- [ ] Reseñas por producto en JSON-LD

## Riesgos
- Nombres de marcas originales en títulos: mantener siempre "inspiración" y no usar logos.
- Fotos subidas desde el panel: ahora se optimizan, pero conviene subirlas ≤ 1600 px.
