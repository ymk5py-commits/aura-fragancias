# Caja Äura

Acceso: `/admin#ventas`, pestaña **Caja / ERP**. Etiquetas mantiene su pestaña `/admin#etiquetas`.

## Uso

- Registrar una venta: seleccionar código del catálogo, presentación y cantidad. El precio es editable; el costo unitario es automático y está protegido. Las ventas nuevas usan el parámetro vigente en Costos y las guardadas conservan su costo histórico. Cambiar a otra presentación usa su costo actual; volver a la presentación original recupera el costo histórico. El costo total multiplica el costo unitario por la cantidad. Agregar las demás fragancias, descuento, delivery cobrado/real y comisión. Pagada registra el total cobrado; Pendiente permite un cobro parcial. Anulada conserva el movimiento y lo excluye del resultado.
- Registrar un gasto: Operativo (publicidad, celular/internet, impuestos), Mercadería (insumos/envases), Inversión (equipamiento) o Retiro (socios). Elegir fecha, monto, categoría, detalle y estado.
- Costos: receta y packaging por 10, 30 y 50 ml, según la pestaña COSTOS de AURA CAJA. Guardar afecta las próximas ventas. Las ventas existentes conservan el costo de cada unidad.
- Resumen: elegir el mes. Ganancia = venta de productos menos costos vendidos, más diferencia de delivery, menos comisiones y gastos operativos. Compras, inversiones y retiros se presentan aparte. Flujo = cobros menos delivery real, comisiones y gastos pagados; no incluye saldo inicial.
- Exportar: CSV de todos los movimientos que coinciden con el filtro del mes, aunque la tabla muestre una sola página. En ventas con varias fragancias los importes compartidos figuran una sola vez.

## Pedidos web

Confirmar desde Pedidos guarda el pedido y su venta en una única transacción, con un ID estable. Repetir no duplica el movimiento. Cancelar anula también la venta; reabrir y confirmar reutiliza el registro con sus costos originales. Revisar delivery real y comisiones después de confirmar. Los pedidos ya confirmados tienen un botón para registrarlos en caja sin reenviar conversiones a Meta. La herramienta manual de Meta sigue disponible en Resumen; no crea ventas de caja.

## Planilla e historial

La estructura se basa en AURA CAJA: Fecha, COD, Fragancia, Cliente, ML, Cantidad, PV, Total cobrado, Delivery cobrado/real, Costo UN, Total costo y Ganancia. El ERP agrupa varias fragancias en una venta y separa cobros, gastos y resultados.

**Historial** carga una copia privada de las 20 pestañas de ventas y gastos de AURA CAJA, leída el 4 de octubre de 2026, incluyendo meses ocultos. La copia se prepara en `erpImports/aura-caja`; todavía no crea movimientos. También admite cargar o descargar una copia revisada. Los datos de clientes e importes no se incluyen en el repositorio ni en archivos públicos.

Elegir todo el historial o un mes, revisar observaciones y corregir filas con **Revisar → Aplicar a la copia**. Las correcciones de CEL/INTERNET a Gs. 214.914 y de fechas ausentes o copiadas de otro mes requieren activar sus opciones explícitas; no se aplican por defecto. La fecha mensual asignada es el primer día del mes y conserva una nota de que el día real no está confirmado. Guardar la copia revisada antes de salir si se quiere conservar el trabajo de revisión sin importar.

Se conserva una venta por fila, sin agrupar clientes ni deducir tickets. Cantidad, precio, costo histórico y delivery se toman de la fila. Diferencias entre cantidad × precio y Total Cobrado se presentan como descuentos para revisar; totales superiores al precio bloquean la fila. Códigos cortos reconocibles se completan con ceros y se señalan; códigos fuera del catálogo y fragancias combinadas se mantienen como históricos. Canal y pago no informados se registran como Otro. Costos desconocidos no se convierten en cero. Totales y fórmulas de filas vacías se omiten.

**Importar registros revisados** incorpora solamente filas válidas y deja las incompletas pendientes. Una ID por planilla/pestaña/fila/bloque impide duplicados: repetir la importación conserva los registros existentes, incluso editados o anulados. Se procesa en transacciones de 20 movimientos; un error permite reanudar sin duplicar los bloques ya guardados. No modifica la planilla original ni envía conversiones a Meta.

El resultado puede diferir del RESUMEN de Sheets cuando sus fórmulas difieren de los importes efectivos. Antes de la migración definitiva queda pendiente confirmar el alcance y los gastos dudosos. Este módulo no calcula stock físico ni registra cuotas en meses distintos como movimientos separados.

## Persistencia y verificación

Firestore: `sales`, `expenses`, `salesConfig/costs`, `erpImports/aura-caja`. Datos de caja privados para las cuentas autenticadas que acceden al administrador. Todas esas cuentas pueden gestionar ventas, gastos, costos e historial con los mismos permisos del panel. Los movimientos no se borran: se anulan. Ediciones con versiones anteriores se rechazan para evitar sobrescrituras entre ventanas. Las reglas de las colecciones existentes se conservan.

Verificación: `npm run test:import` (incluye los cálculos ERP), pruebas con emulador en `scripts/test-rules.mjs`, `npm run lint`, `npm run build` y prueba de formularios en navegador con movimientos locales temporales. No se cargan ventas ficticias en producción.
