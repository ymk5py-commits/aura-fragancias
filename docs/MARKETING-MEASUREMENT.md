# Medición de Äura

Identificadores públicos verificados en las cuentas del propietario el 16/10/2026:

| Servicio | Identificador / configuración |
| --- | --- |
| Google Analytics 4 | `G-W3S7RJVZY7`; propiedad `540557752`, flujo web `15021870624` |
| Meta Pixel | `1238570975103624`, “Pixel - Aura Fragancias Oficial” |
| Catálogo Meta | `834572036223095`, “aurafragancias.store” |
| Fuente del catálogo | `https://www.aurafragancias.store/feed-meta.xml` |
| Google Ads | Sin cuenta disponible al configurar; requiere `NEXT_PUBLIC_GOOGLE_ADS_ID` y las etiquetas de conversión correspondientes |
| TikTok Ads | Adaptador preparado; requiere el código público de su píxel en `NEXT_PUBLIC_TIKTOK_PIXEL_ID` |

`marketingConfig.ts` conserva los identificadores públicos de Äura como valores por defecto. Las variables de entorno permiten sustituirlos. Los tokens de la API de conversiones permanecen exclusivamente en el servidor.

## Eventos

| Acción real | Meta | Google Analytics | TikTok |
| --- | --- | --- | --- |
| Navegar en la tienda | PageView | page_view | page |
| Abrir ficha o vista rápida | ViewContent | view_item | ViewContent |
| Agregar al carrito, también productos repetidos | AddToCart | add_to_cart | AddToCart |
| Abrir el formulario de pago | InitiateCheckout | begin_checkout | InitiateCheckout |
| Enviar pedido a WhatsApp | Lead | generate_lead | SubmitForm |
| Pago confirmado por Pagopar | Purchase | purchase | Purchase |

El código del perfume coincide con `g:id` del feed de Meta y `g:item_group_id` del feed de Google. `GIFT-CARD` también está incluido en el feed de Meta, desde su mínimo real de Gs. 100.000. Los valores usan PYG y la cantidad real. Los identificadores de evento de Meta se conservan para deduplicar con la API de conversiones.

Las etiquetas publicitarias se cargan después de aceptar cookies. La elección existente `aura_consent_v1` se respeta; rechazar descarta los eventos pendientes. La cola temporal evita perder eventos emitidos antes de que los SDK estén listos. El panel administrativo se excluye de los eventos de la tienda.

## Verificación

`npm run test:marketing` cubre consentimiento, colas, duplicados, importes, correspondencia de códigos, separación de consultas/compras, navegación y feed. La prueba del navegador debe visitar fichas, abrir la vista rápida, agregar dos veces el mismo producto y abrir el pago. No se deben crear ventas ficticias para hacer desaparecer avisos de falta de eventos.

El catálogo tenía una advertencia histórica por `GIFT-CARD` y un aviso de ausencia de compras en los últimos siete días. El primer aviso debe resolverse cuando Meta importe el feed actualizado. El segundo depende de pagos reales confirmados.

Referencias: [Comercio electrónico de GA4](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce), [eventos de TikTok](https://ads.tiktok.com/resources/help/article/standard-events-parameters?lang=en), [consentimiento de TikTok Pixel](https://business-api.tiktok.com/portal/docs/pixel-cookie-consent-mode/v1.3).
