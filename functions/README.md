# Avisos de pedidos de Äura por WhatsApp

Emisor autorizado: **+595 994 414 986** (YCloud / cuenta Meta **Aura**).
Destino autorizado: **+595 984 348 058**. Ambos están fijados en código; ningún
campo del checkout puede cambiar el destinatario.

## Estado en producción

**Activado el 13/10/2026.** Las cinco funciones están desplegadas en Firebase y
la conexión existente de YCloud está guardada en Secret Manager. La fecha de
corte configurada es `2026-10-13T23:21:51Z`; no se reenvía el historial previo.
Las claves no se incorporan al repositorio ni a la web pública. Desplegar
solamente la web en Vercel no modifica estas funciones ni sus secretos.

Se verificó la entrega real desde el disparador de Firestore, la cola, el
trabajador y YCloud hasta el teléfono autorizado:

| Aviso de prueba | ID de YCloud | Entregado el 13/10, hora de Asunción |
| --- | --- | --- |
| Nuevo pedido | `6acec050ef512c313a91aa22` | 20:35:52 |
| Pago confirmado | `6acec090871280044bac2d40` | 20:36:51 |

Ambos corresponden a `AURA-PRUEBA13OCT2026`, fueron entregados y tienen un único
intento. Se repitió la transición de confirmación y se comprobó que conservaran
los mismos IDs y un solo intento. La prueba utilizó un registro privado de
diagnóstico; no generó pedidos comerciales, ventas ni eventos Purchase.
Pasaron nueve pruebas unitarias y siete pruebas con Firestore Emulator.

YCloud informó un costo final de **USD 0,0113 por mensaje de prueba**. Es el costo
observado en esas entregas, no una tarifa garantizada para futuros mensajes.

Existe una comprobación interna en `whatsappAlertTests`, sin acceso desde el
checkout o el panel. Solo acepta códigos `AURA-PRUEBA…` y recorre el mismo
trabajador de envío y conciliación. No crea pedidos, ventas ni conversiones.
Los registros de prueba se conservan separados del historial comercial.

Plantillas creadas en Meta el 13/10/2026, categoría Utilidad, idioma `es`,
WABA `1397375458766668`:

| Plantilla | ID en Meta | Variables del cuerpo |
| --- | --- | --- |
| `aura_pedido_web` | `996505026801522` | código del pedido, total en guaraníes |
| `aura_pago_confirmado_web` | `39432628936350786` | código, importe cobrado, medio de pago |

Ambas tienen un botón estático **Ver pedidos** hacia
`https://www.aurafragancias.store/admin#pedidos`. Ambas figuran aprobadas en Meta
y YCloud. Se configuró una ventana de entrega de **12 horas** en Meta, para que
el aviso no venza a los diez minutos si el teléfono está temporalmente sin red.

## Funcionamiento

1. `auraOrderAlerts` observa pedidos nuevos y transiciones a confirmado en
   Firestore. Usa la fecha de creación real de Firestore para excluir el
   historial anterior a la activación. Las transferencias generan aviso de pago
   cuando un administrador verifica el comprobante y confirma la venta.
2. Cada pedido/evento se guarda una sola vez en `whatsappAlerts`. Las
   transacciones coordinan ejecuciones concurrentes. El mensaje solo incluye
   código, importe y estado/medio de pago; no incluye nombre, teléfono,
   domicilio, RUC ni comprobantes del comprador.
3. `auraSendOrderAlert` encola la plantilla en YCloud desde el servidor. El
   comprador no necesita enviar el mensaje de WhatsApp y el panel puede estar
   cerrado. Un pedido cancelado no genera un aviso pendiente atrasado.
4. `auraReconcileOrderAlerts` consulta cada cinco minutos los IDs de YCloud para
   diferenciar aceptado, enviado, entregado, leído y fallido. Solo reintenta un
   rechazo explícito por límite de frecuencia (429). Ante una desconexión sin
   respuesta segura deja `unknown` y registra un error para revisar, evitando
   reenviar a ciegas. `externalId` sirve para conciliar, no es una garantía de
   idempotencia de YCloud.
5. `auraVerifyCardPayments` comprueba cada cinco minutos los pedidos con tarjeta
   usando la API existente de Äura, que consulta el hub de ALBA/Pagopar. Compara
   código, hash, importe y estado pagado antes de encolar el aviso. Usa HTTPS,
   un dominio fijo y no admite redirecciones ni URLs enviadas por el comprador.
   Así el aviso de tarjeta funciona aunque no se abra el administrador y no
   depende de los reintentos del callback externo. No copia tokens del hub, no
   agrega un endpoint público y no modifica las transacciones existentes de
   Caja ni la emisión de Gift Cards.

La verificación automática y una confirmación posterior desde el administrador usan
la misma identidad de aviso; no generan dos mensajes de pago. Si se confirma
el pago antes de enviar el aviso pendiente, ese aviso pendiente se omite.

## Configuración y despliegues posteriores

Proyecto Firebase existente: `aura-fragancias`; Firestore Standard,
`southamerica-east1`. La facturación del proyecto ya está habilitada. Las
funciones usan la cuenta de servicio del entorno y no requieren una clave JSON
de Firebase en Vercel. No cambian las reglas existentes: las nuevas colecciones
de cola y presupuesto quedan sin acceso desde clientes por denegación implícita.

1. Iniciar sesión en la cuenta correcta de YCloud y comprobar que el emisor
   `+595994414986` esté conectado. Recuperar la credencial autorizada con el
   mecanismo de seguridad de YCloud. No copiarla a chats, capturas ni `.env`
   públicos. Guardar `YCLOUD_API_KEY` en Firebase Secret Manager.
2. Configurar en `functions/.env.aura-fragancias` (ignorado por Git) los parámetros
   `WHATSAPP_ALERTS_ENABLED=true`, `WHATSAPP_ALERTS_STARTED_AT=<fecha ISO UTC de
   activación>` y `WHATSAPP_ALERTS_DAILY_LIMIT=100`. La fecha es obligatoria y no
   debe retrocederse para reenviar historial. El límite cuenta intentos por día
   UTC; los excedentes esperan en cola y vencen a las 24 horas. Ajustar este
   límite según el volumen autorizado del negocio.
3. Desplegar solamente la nueva base `order-alerts`, sin reemplazar otras
   funciones existentes:

   ```sh
   npm --prefix functions ci
   firebase deploy --only functions:order-alerts --project aura-fragancias
   ```

4. Hacer una compra de prueba identificada, verificar en YCloud y en el teléfono
   que llega el aviso de pedido; confirmar su pago y comprobar el segundo aviso.
   Esperar otra comprobación y abrir Pedidos para verificar que no se duplica. No dar
   por activo el sistema hasta comprobar `delivered` o `read` y la recepción real.

YCloud y Meta pueden cobrar por mensajes según el plan y la categoría. La
creación/aprobación de una plantilla no demuestra que exista saldo o crédito de
envío. Verificar esas condiciones en la cuenta existente antes de activar.

## Revisión de fallas

Consultar `whatsappAlerts` en Firebase con acceso administrativo y los logs de
las funciones. `accepted` y `sent` no equivalen a entrega. Para `unknown`, buscar
el `externalId` en YCloud y resolver primero si se aceptó/envió. **No volver a
poner el aviso en pendiente ni borrar la cola sin esa conciliación.** Un 4xx,
plantilla rechazada o mensaje fallido exige corregir la causa y revisar el envío.
Los rechazos 429 tienen hasta cinco intentos, separados por al menos cinco
minutos. Los avisos aún no enviados vencen a las 24 horas; los estados de entrega
sin resolver dejan de consultarse después de 48 horas y requieren revisión.

Las comprobaciones de tarjetas duran siete días desde su registro. Los pedidos
cancelados salen de esa cola. Un cursor circular recorre hasta 50 comprobaciones
por ejecución, para que los pagos pendientes anteriores no bloqueen los nuevos.
Con más de 50 pendientes el ciclo completo puede tardar más de cinco minutos.
La conciliación de entrega de WhatsApp es un trabajo independiente de las
consultas de pago; una pasarela lenta no bloquea el envío de pedidos nuevos.

Para pausar envíos cambiar `WHATSAPP_ALERTS_ENABLED=false` y redesplegar las
funciones. Conservar la cola y revisar los avisos antes de reactivar; no alterar
la fecha original de activación para los avisos ya registrados.

## Verificación local

```sh
npm run lint
npm run test:whatsapp
firebase emulators:exec --only firestore --project demo-aura-alerts \
  'npm --prefix functions run test:integration'
npm run build
```

Las pruebas de integración exigen el emulador y el proyecto de demostración.
Usan Firestore real del emulador para verificar transacciones y concurrencia;
las respuestas de YCloud se simulan sin enviar WhatsApps ni tocar producción.

Fuentes: [YCloud OpenAPI oficial](https://github.com/YCloud-Developers/ycloud-whatsapp-mcp-server/blob/main/ycloud-api-v2.yaml),
[claves API de YCloud](https://docs.ycloud.com/en/documentation/developer/manage-api-keys),
[eventos Firestore](https://firebase.google.com/docs/functions/firestore-events).
