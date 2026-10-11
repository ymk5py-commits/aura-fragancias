# Gift Cards Äura

Compra pública: `/gift-card`. Gestión: `/admin#gift-cards`. Materiales de campaña: `/admin#marca`.

## Compra y entrega

Importe personalizable en guaraníes enteros desde Gs. 100.000. Se puede agregar destinatario, remitente y dedicatoria. Las tarjetas conservan el importe elegido al recuperar el carrito. Los descuentos se calculan solo sobre perfumes; el valor de Gift Cards tampoco suma al umbral de envío gratis. Un pedido exclusivamente digital no solicita dirección ni cobra delivery.

El pago usa el checkout existente: transferencia/QR y Pagopar cuando está habilitado. El servidor valida mínimo, cantidades y total antes de iniciar un cobro con tarjeta. Límite operativo: 50 tarjetas por pedido y Gs. 50.000.000 por tarjeta; el máximo total de la pasarela permanece en Gs. 50.000.000.

La Gift Card se emite al confirmar el pago en Pedidos. Un pago con tarjeta debe coincidir en código de pedido e importe con la respuesta de Pagopar. La confirmación guarda pedido, venta de perfumes cuando corresponda y tarjetas en una transacción. Los IDs por pedido/línea/unidad y un registro único por código de pedido impiden emisiones duplicadas. Reintentar nunca reinicia la vigencia.

En Gift Cards se puede descargar la tarjeta PDF personalizada en formato horizontal tipo cheque de 180 × 80 mm. Usa el logotipo oficial, fondo marfil, un talón borgoña con el importe y detalles dorados. Nombres y dedicatorias se distribuyen en varias líneas cuando hace falta, sin recortarlos. El código queda seleccionable en el documento. Un acceso abre el WhatsApp del comprador con el mensaje preparado; el administrador adjunta el PDF como documento y confirma el envío. El comprador puede reenviarlo al destinatario. El mensaje y el archivo no se envían automáticamente ni se marcan como entregados al abrir WhatsApp. La vigencia es exactamente 60 días desde la confirmación, con fecha y hora de vencimiento en Paraguay en la tarjeta.

## Canjes y caja

El destinatario contacta por WhatsApp con su código y las fragancias. El administrador registra la venta de perfumes en Caja / ERP y registra el canje con su número como referencia. Se permiten canjes parciales. Cada operación guarda un movimiento inmutable y disminuye el saldo de forma atómica. Reintentar la misma operación no vuelve a descontar. Se rechazan tarjetas vencidas, anuladas, agotadas o importes superiores al saldo.

El cobro de la Gift Card se presenta por separado en Gift Cards, sin sumar unidades, costo ficticio ni margen de perfumes. El canje requiere registrar la venta de los perfumes: todavía no existe canje automático en el checkout ni contabilización automática del movimiento de caja a partir del canje. Cancelar un pedido sin canjes anula sus tarjetas; si alguna ya fue usada, se bloquea la cancelación para revisión.

Colecciones privadas: `giftCards`, `giftCardPayments`, `giftCardRedemptions`. Usan el mismo acceso autenticado que el admin existente. El código usa 128 bits aleatorios; importe, activación y vencimiento son inmutables. No se permite lectura ni emisión pública, eliminación de tarjetas ni edición de movimientos de canje.

## Campaña y etiquetas

Hero de inicio adaptado al logo, colores y fuentes existentes; las colecciones mantienen su hero. Los diseños de etiquetas de 40 × 40 mm usan los trazos exactos del SVG oficial. El ZIP de Marca contiene cuatro flyers cuadrados PNG/JPG, copies y reel animado del 20% con audio original/sin audio y portada. El porcentaje proviene de la referencia del usuario; la vigencia y las fragancias de esa promoción no estaban confirmadas. La pieza remite a WhatsApp y no cambia los descuentos de la tienda.

## Verificación

`npm run test:gift-cards`: mínimo, enteros, vencimiento exacto, pago personalizado, carrito mixto, límites y logo en los tres diseños. `npm run test:erp` y `npm run test:seo`: compatibilidad con caja, catálogo y sitemap. `scripts/test-rules.mjs` en el emulador: acceso privado, emisión concurrente sin duplicados, pago repetido, vigencia y saldo inmutables, canjes concurrentes idempotentes, sobregiros, vencimiento y cancelación.

Además: tipos, build y compra hasta la vista previa de pago en navegador, con monto Gs. 150.000 y dedicatoria. Las pruebas no generan cobros, ventas ni canjes ficticios en producción.
