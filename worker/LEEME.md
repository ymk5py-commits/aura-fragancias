# Trabajador de avisos de WhatsApp de Äura

Reemplaza a las 5 Cloud Functions de Firebase (`functions/src`) por un proceso Node propio que corre en el servidor GMKtec
contra el Supabase de Aura. Manda los mismos avisos (plantillas `aura_pedido_web` y `aura_pago_confirmado_web` de YCloud/Meta,
mismo emisor y mismo destino fijos en `src/alerts.js`) con la misma lógica: **`src/alerts.js` es una copia exacta, sin cambios**, de
`functions/src/alerts.js`.

> **Estado (17-oct-2026): instalado y APAGADO** (`WHATSAPP_ALERTS_ENABLED=false`). Mientras la web siga usando Firebase, las
> funciones de Google son las que envían los avisos. Si se enciende este trabajador a la vez, **cada aviso sale dos veces**.
> El encendido y el apagado de las funciones de Google se hacen juntos, en el corte (ver "Corte" más abajo).

## Qué reemplaza a qué
| Firebase (`functions/src/index.js`) | Acá |
|---|---|
| `auraOrderAlerts` (disparador de `orders`) | Carril **eventos**, cada 30 s: lee `order_events` (la llena un disparador de la base cuando se inserta un pedido o cambia su `status` o su `pagopar_hash`) y marca `processed_at`. Misma regla: pedido nuevo ⇒ aviso `pedido` (o `pago` si ya nace confirmado); paso a `confirmado` ⇒ `pago`; sin reenviar el historial (`WHATSAPP_ALERTS_STARTED_AT` + `orders.created_at` de la fila). |
| `auraOrderAlertTests` | `cli probar-aviso` y `whatsapp_alert_tests` (solo códigos `AURA-PRUEBA…`). No crea pedidos, ventas ni conversiones. |
| `auraSendOrderAlert` | Envío inmediato al crear el aviso, más reintento en la conciliación. |
| `auraVerifyCardPayments` | Carril **pagos**, cada 5 min: consulta `https://www.aurafragancias.store/api/pagopar/estado` por cada pedido con tarjeta (cursor `payment` en `worker_cursors`, 50 por vuelta). |
| `auraReconcileOrderAlerts` | Carril **conciliacion**, cada 5 min: reintenta 429, detecta envíos interrumpidos y consulta la entrega en YCloud (cursor `delivery`, 100 por vuelta). |
| Transacciones de Firestore | Transacciones de Postgres: `INSERT … ON CONFLICT DO NOTHING` (un aviso por pedido y evento, mismo id hash que en Firebase) y reclamo con `SELECT … FOR UPDATE SKIP LOCKED`. |
| `whatsappAlertBudget` | `whatsapp_alert_budget` con alta atómica contra el tope diario (`WHATSAPP_ALERTS_DAILY_LIMIT`, por día UTC). |

Los ids de los avisos son idénticos a los de Firebase (`sha256("<código>:<evento>")`), por eso lo ya migrado a `whatsapp_alerts`
no se vuelve a enviar.

## Dónde está todo
- **Código** (aún sin commit, a propósito): `aura-fragancias/worker/` en este repo. Copia desplegada: servidor `~/aura-worker/`.
- **Contenedor**: `aura-worker` (Docker Compose, `restart: unless-stopped`), en la red `9yus3novbjqin3vcs5mpkj1b` del servicio
  Supabase (llega a `supabase-db-9yus3novbjqin3vcs5mpkj1b:5432`; el puerto no se publica en el host). Sin dominio ni puertos expuestos.
- **Secretos** (modo 600, nunca en el repo ni en el chat):
  `~/.aura-secrets/ycloud-api-key` (clave de YCloud, copiada de Google Secret Manager) y
  `~/.aura-secrets/aura-worker.env` (`DATABASE_URL` del rol `aura_worker`). La clave de YCloud entra al contenedor como archivo de solo lectura.
- **Configuración no secreta**: `~/aura-worker/.env` (`WHATSAPP_ALERTS_ENABLED`, `WHATSAPP_ALERTS_STARTED_AT=2026-10-13T23:21:51Z`,
  `WHATSAPP_ALERTS_DAILY_LIMIT=100`).
- **Rol de base de datos** `aura_worker` (`sql/rol-trabajador.sql`, repetible): puede leer solo 9 columnas de `orders` (sin nombre,
  teléfono, dirección, RUC ni comprobantes), marcar `order_events.processed_at` y escribir en las tablas `whatsapp_*` y `worker_cursors`.
  Nada más. Si alguna vez se restaura la base en otro servidor, hay que volver a crearlo y actualizar `aura-worker.env`.

## Manejo diario (en el servidor: `ssh gmktec`, carpeta `~/aura-worker`)
```bash
scripts/aura-worker.sh estado        # contenedor, si está encendido, avisos por estado, tope del día y avisos a revisar
scripts/aura-worker.sh logs 100      # últimas 100 líneas del registro (JSON, una por línea)
scripts/aura-worker.sh apagar        # WHATSAPP_ALERTS_ENABLED=false y recrea el contenedor
scripts/aura-worker.sh encender      # pide escribir ENCENDER; ver "Corte" antes de usarlo
scripts/aura-worker.sh reconstruir   # recompila la imagen con el código de la carpeta
```
Verificar que vive: `docker ps` debe mostrar `aura-worker … (healthy)` (el healthcheck falla si el carril de eventos no da señales
en 5 min o si la base no responde). Apagado, el registro dice `avisos APAGADOS: no consume eventos ni envía nada` y no escribe nada en la base.

### Apagado = inerte
Con `WHATSAPP_ALERTS_ENABLED=false` el trabajador solo comprueba que la base responde (`SELECT 1`). **No consume `order_events`**:
al encenderlo procesa lo acumulado, salvo eventos de más de 24 h (se descartan, igual que los avisos pendientes vencen a las 24 h).
Cada aviso nace con la hora del evento que lo originó, así que vence 24 h después del pedido y no 24 h después de procesarlo.

## Corte (coordinado por la sesión principal)
Orden recomendado para que no haya avisos dobles ni huecos (adapta el paso 5 de `migracion/SUPABASE-DISENO.md` §9):
1. Reglas de Firestore a solo lectura (no entran pedidos nuevos a Firebase).
2. **Apagar las funciones de Google** (`WHATSAPP_ALERTS_ENABLED=false` en `functions/.env.aura-fragancias` y desplegar `order-alerts`).
   Esperar un par de minutos y comprobar en Firestore que no queden `whatsappAlerts` en `pending` ni `dispatching`.
   Hacerlo ANTES del último respaldo: así el estado de `whatsapp_alerts` que se migra es el definitivo y no se reenvía nada.
3. Último respaldo + `migrar-a-supabase.py --limpiar` (copia `whatsapp_alerts`, `whatsapp_payment_checks` y los cursores; los
   disparadores van apagados durante la carga, así que no se generan eventos por pedidos viejos).
4. Si hubo pedidos de prueba en Supabase después de la limpieza: `scripts/aura-worker.sh cli descartar-eventos --si`.
   (No ejecutarlo si ya entraron pedidos reales, porque los descartaría.)
5. Desplegar la web ya apuntando a Supabase.
6. `scripts/aura-worker.sh encender` → procesa los pedidos que entraron desde el paso 5 y retoma los cobros con tarjeta pendientes.
7. Probar: pedido por transferencia ⇒ llega "Nuevo pedido"; confirmarlo en el panel ⇒ llega "Pago confirmado"; en `estado`, ambos `delivered`.

Antes del corte conviene revisar:
- **Saldo de YCloud**: verificarlo antes de encender (`GET /v2/balance`; cada aviso cuesta ≈ USD 0,0113 y el tope diario de 100 puede llegar a ≈ USD 1,13 por día).
  El 17-oct alcanzaba para unos 17 avisos.
- Hoy hay **1 comprobación de tarjeta pendiente** migrada de Firestore (pedido `AURA-MVD1WKET`). Al encender, se verificará con Pagopar y, si ya está pagada, saldrá su
  aviso de pago (por eso las funciones de Google tienen que estar apagadas antes).

## Probar un envío real (una sola vez, con permiso de Croman)
```bash
scripts/aura-worker.sh probar-real   # pide escribir ENVIAR
```
Manda 1 WhatsApp real (plantilla `aura_pedido_web`, código `AURA-PRUEBA<fecha>`) a +595 984 348 058, espera la entrega y la imprime.
Cuesta ≈ USD 0,01. No necesita encender el trabajador, no toca pedidos reales y usa solo `whatsapp_alert_tests`. Ver el mensaje sin enviarlo:
`scripts/aura-worker.sh cli probar-aviso pedido`.

## Ver el estado de los avisos
`scripts/aura-worker.sh estado` resume todo. Para mirar a mano:
```bash
docker exec -i supabase-db-9yus3novbjqin3vcs5mpkj1b psql -U supabase_admin -d postgres -c \
 "select order_code, event, state, error_code, attempts, to_timestamp(created_at_ms/1000) creado from whatsapp_alerts order by created_at_ms desc limit 20"
```
| Estado | Significado |
|---|---|
| `pending` | En cola (o esperando reintento por 429 o por el tope diario). Vence a las 24 h o a los 5 intentos. |
| `dispatching` | Reservado y enviándose (reserva de 2 min). Si queda así >2 min el envío se interrumpió ⇒ pasa a `unknown`. |
| `accepted` → `sent` → `delivered` → `read` | YCloud lo aceptó y avanza la entrega. `accepted` y `sent` **no** son entrega. |
| `failed` | Rechazo definitivo (4xx, plantilla rechazada, WhatsApp falló). Corregir la causa; ver `error_code`. |
| `unknown` | **No se sabe si salió.** No se reenvía solo. Ver abajo. |
| `expired` | Venció (24 h o 5 intentos) sin enviarse. |
| `cancelled` | El pedido se canceló o desapareció antes de enviar. |
| `superseded` | El aviso de "pedido" ya no hace falta porque el pedido se confirmó (sale el de "pago"). |

## Qué hacer ante `unknown`
Códigos: `UNCERTAIN_DELIVERY` (se cortó la conexión o YCloud dio 5xx al enviar), `INTERRUPTED_SEND` (el contenedor cayó enviando),
`DELIVERY_NOT_CONFIRMED` (48 h sin confirmación de entrega). **Nunca** poner el aviso en `pending` ni borrarlo sin conciliar antes.
```bash
scripts/aura-worker.sh estado                                   # copiar el código del pedido y el evento
scripts/aura-worker.sh cli buscar-en-ycloud AURA-XXXX/pedido    # busca en YCloud (solo lectura) el externalId aura-<id>
```
- Si **lo encuentra** (`found: true`): salió. `scripts/aura-worker.sh cli resolver AURA-XXXX/pedido enviado <id de YCloud>` lo registra
  como `accepted` y la conciliación sigue su entrega. Si en YCloud figura `failed`, resolver la causa (saldo, plantilla) y recién ahí reintentar.
- Si **no lo encuentra** y también falta en el panel de YCloud (Mensajes, destino +595984348058, hora del intento; la búsqueda mira los últimos
  ~500 mensajes): no salió. `scripts/aura-worker.sh cli resolver AURA-XXXX/pedido reintentar --confirmo-que-no-se-envio` lo vuelve a la cola
  (con 24 h nuevas de vigencia) y sale en el próximo ciclo de 5 min.
- Si hay duda, no reenviar: un aviso perdido cuesta menos que un aviso doble.

## Pruebas
- Unitarias (sin red ni base), en cualquier máquina con Node 22: `npm ci && npm test` (9 de `alerts.js` + 4 de configuración).
- Todo el conjunto (39 pruebas), en el servidor: `~/aura-worker/scripts/probar-en-servidor.sh`. Incluye:
  - **integración** contra el Postgres real en un **esquema temporal** `aura_test_xxxxxxxx` (copia la estructura de `public` y el disparador;
    se borra solo; no toca pedidos ni avisos reales): concurrencia, cancelados/superados, 429, `unknown`, verificación de tarjeta,
    cursores circulares, tope diario, historial/eventos viejos, apagado, evento envenenado y la herramienta `cli`;
  - el **proceso real** (`src/main.js`) arrancando, enviando (simulado) y apagándose con SIGTERM;
  - el **rol real** `aura_worker` sobre las tablas reales de `public`, dentro de una transacción que se revierte (`ROLLBACK`).
  YCloud y Pagopar están simulados en todas: **no sale ningún WhatsApp**.

## Variables
| Variable | Por defecto | Notas |
|---|---|---|
| `DATABASE_URL` | — (obligatoria) | Postgres del servicio Supabase, rol `aura_worker`. |
| `WHATSAPP_ALERTS_ENABLED` | `false` | Con `true` exige `WHATSAPP_ALERTS_STARTED_AT` válida y la clave; si falta algo, el proceso no arranca. |
| `WHATSAPP_ALERTS_STARTED_AT` | — | `2026-10-13T23:21:51Z`. No retroceder para reenviar historial. |
| `WHATSAPP_ALERTS_DAILY_LIMIT` | `100` | Intentos por día UTC; los excedentes esperan en `pending`. |
| `YCLOUD_API_KEY` / `YCLOUD_API_KEY_FILE` | — | El despliegue usa el archivo montado `/run/secrets/ycloud-api-key`. |
| `WORKER_POLL_MS` / `WORKER_SLOW_MS` | `30000` / `300000` | Carril de eventos / carriles de pagos y conciliación. |

## Pasar a Coolify (cuando el código esté commiteado)
El repo es público y hace autodeploy de la web con cada push, por eso hoy corre como contenedor local. Cuando `worker/` esté en `main`:
crear en Coolify una aplicación **Dockerfile** del mismo repositorio con *Base Directory* `/worker`, **sin dominio**, con
*Connect to predefined network* activado (también en el servicio Supabase, para que `supabase-db-…` resuelva), y las variables de arriba
(`DATABASE_URL` y `YCLOUD_API_KEY` como secretas; `WHATSAPP_ALERTS_ENABLED=false`). Luego `docker compose down` en `~/aura-worker`.
Dos trabajadores a la vez no duplican avisos (reclamo atómico), pero solo uno debería estar encendido.

## Decisiones y diferencias con las funciones de Google
- Eventos de pedidos: lo que antes veía el disparador de Firestore ahora llega por `order_events`; el trabajador relee el pedido y usa el estado
  del evento (antes/después) para decidir, igual que `handleOrder`. Un evento que falla (bloqueo, tiempo agotado…) se reintenta con espera creciente
  (30 s, 1, 2… hasta 30 min) hasta que cumpla 24 h; mientras espera no frena a los demás. Cada intento fallido queda en el registro con nivel `error`.
- **Fecha de creación del pedido** (para no avisar el historial): como `createTime` de Firestore, vale la hora del primer evento `created` de ese pedido,
  que la marca la base y no el visitante. Los pedidos migrados no tienen evento (la migración apaga los disparadores) y valen por `orders.created_at`.
  Así un reloj atrasado/adelantado o un `created_at` falso del comprador no silencia ni dispara avisos.
- Un importe fuera de rango (por ejemplo un `total` absurdo enviado por un visitante) no rompe nada: el pedido queda sin aviso. Conviene además que el
  esquema lo limite (`CHECK (total <= 100000000 AND shipping_cost BETWEEN 0 AND 100000000)`, el mismo tope de `orderAmount`).
- Al apagar/recrear el contenedor (`SIGTERM`) deja de tomar avisos nuevos y termina el envío en curso (hasta 35 s); `reconcile` solo pasa a `unknown`
  un aviso que siga en `dispatching` con la reserva vencida, así nunca pisa un resultado que acaba de llegar.
- Tope diario: como en el original, cualquiera que cree pedidos válidos puede gastar el cupo del día (los demás quedan `pending` y vencen a las 24 h).
- Las consultas a la API de la tienda llevan `User-Agent: aura-whatsapp-worker/1.0` (la tienda está detrás de Cloudflare).
- Registro: JSON por línea en stdout (`docker logs`); nunca incluye claves ni datos del comprador. Los avisos que necesitan revisión
  se registran con nivel `error` (`WhatsApp alert needs review`).
