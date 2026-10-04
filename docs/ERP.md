# Caja Äura

Acceso: `/admin#ventas`, pestaña **Caja / ERP**. Etiquetas mantiene su pestaña `/admin#etiquetas`.

## Uso

- Registrar una venta: seleccionar código del catálogo, presentación y cantidad. Precio y costo son editables. Agregar las demás fragancias, descuento, delivery cobrado/real y comisión. Pagada registra el total cobrado; Pendiente permite un cobro parcial. Anulada conserva el movimiento y lo excluye del resultado.
- Registrar un gasto: Operativo (publicidad, celular/internet, impuestos), Mercadería (insumos/envases), Inversión (equipamiento) o Retiro (socios). Elegir fecha, monto, categoría, detalle y estado.
- Costos: receta y packaging por 10, 30 y 50 ml, según la pestaña COSTOS de AURA CAJA. Guardar afecta las próximas ventas. Las ventas existentes conservan el costo de cada unidad.
- Resumen: elegir el mes. Ganancia = venta de productos menos costos vendidos, más diferencia de delivery, menos comisiones y gastos operativos. Compras, inversiones y retiros se presentan aparte. Flujo = cobros menos delivery real, comisiones y gastos pagados; no incluye saldo inicial.
- Exportar: CSV de todos los movimientos que coinciden con el filtro del mes, aunque la tabla muestre una sola página. En ventas con varias fragancias los importes compartidos figuran una sola vez.

## Pedidos web

Confirmar desde Pedidos guarda el pedido y su venta en una única transacción, con un ID estable. Repetir no duplica el movimiento. Cancelar anula también la venta; reabrir y confirmar reutiliza el registro con sus costos originales. Revisar delivery real y comisiones después de confirmar. Los pedidos ya confirmados tienen un botón para registrarlos en caja sin reenviar conversiones a Meta. La herramienta manual de Meta sigue disponible en Resumen; no crea ventas de caja.

## Planilla e historial

La estructura se basa en AURA CAJA: Fecha, COD, Fragancia, Cliente, ML, Cantidad, PV, Total cobrado, Delivery cobrado/real, Costo UN, Total costo y Ganancia. El ERP agrupa varias fragancias en una venta y separa cobros, gastos y resultados.

El historial de Sheets aún no está migrado. Antes de hacerlo hay que confirmar el alcance de meses, el importe CEL/INTERNET escrito como decimal y las fechas 01/07 repetidas en otros meses. Se deben preservar los precios y costos históricos, revisar códigos y filas incompletas y evitar duplicados por pestaña/fila. No se modifica la planilla original. Este módulo no calcula stock físico ni registra cuotas en meses distintos como movimientos separados.

## Persistencia y verificación

Firestore: `sales`, `expenses`, `salesConfig/costs`. Datos de caja privados para la cuenta administrativa actual. Los movimientos no se borran: se anulan. Ediciones con versiones anteriores se rechazan para evitar sobrescrituras entre ventanas. Las reglas de las colecciones existentes se conservan.

Verificación: `npm run test:erp`, pruebas con emulador en `scripts/test-rules.mjs`, `npm run lint`, `npm run build` y prueba de formularios en navegador con movimientos locales temporales. No se cargan ventas ficticias en producción.
