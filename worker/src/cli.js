import { alertKey, CODE_PATTERN, makeAlert, messagePayload, MAX_AGE_MS, RECIPIENT, TEMPLATES } from './alerts.js';
import { loadConfig, runtimeConfig, validateConfig } from './config.js';
import { createPool } from './db.js';
import { createWorker } from './worker.js';
import { buscarEnYcloud } from './ycloud.js';

const AYUDA = `Herramientas de operación del trabajador de avisos de WhatsApp.

  estado                                   Resumen: avisos por estado, eventos pendientes, tope del día, avisos a revisar.
  descartar-eventos --si                   Marca como procesados TODOS los eventos pendientes de order_events (no envía nada).
  probar-aviso [pedido|pago]               Muestra el mensaje de prueba que se enviaría. No envía ni escribe nada.
  probar-aviso [pedido|pago] --enviar      ENVÍA 1 WhatsApp REAL de prueba (requiere WHATSAPP_ALERTS_ENABLED=true en este comando).
  buscar-en-ycloud <aviso>                 Busca en YCloud (solo lectura) si ese aviso llegó a enviarse.
  resolver <aviso> enviado <idYCloud>      Registra que SÍ se envió (estado accepted); la conciliación confirma la entrega.
  resolver <aviso> reintentar --confirmo-que-no-se-envio
                                            Vuelve a poner el aviso en cola. Solo después de comprobar en YCloud que NO se envió.

<aviso> es el id (64 hex) o  CODIGO/evento  (por ejemplo AURA-MU12345/pedido).`;

const [command, ...args] = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter(a => !a.startsWith('--'));

function resolveAlertId(ref) {
  if (/^[a-f0-9]{64}$/.test(ref || '')) return ref;
  const [code, event] = String(ref || '').split('/');
  if (CODE_PATTERN.test(code) && Object.hasOwn(TEMPLATES, event)) return alertKey(code, event);
  throw new Error('Indicá el aviso como id de 64 hex o como CODIGO/evento (pedido|pago).');
}

async function main() {
  if (!command || command === 'ayuda' || command === '--help') { console.log(AYUDA); return; }
  const raw = loadConfig();
  const problems = validateConfig(raw).filter(p => raw.enabled || p.includes('DATABASE_URL'));
  if (command === 'probar-aviso' && !flags.has('--enviar')) {
    const event = positional[0] || 'pedido';
    if (!Object.hasOwn(TEMPLATES, event)) throw new Error('El evento debe ser pedido o pago.');
    const order = { orderId: 'AURA-PRUEBA00000000', status: 'pendiente', total: 100000, items: [{ code: 'PRUEBA', quantity: 1 }], paymentMethod: 'Transferencia' };
    const { externalId, ...rest } = messagePayload(makeAlert(order, 'prueba', event));
    console.log(JSON.stringify({ aviso: 'SIMULACIÓN: no se envió nada', destino: RECIPIENT, mensaje: rest }, null, 2));
    return;
  }
  if (problems.length) throw new Error(problems.join(' '));
  const config = runtimeConfig(raw);
  const pool = createPool(config.databaseUrl);
  const worker = createWorker({ pool, config, log: { info() {}, warn: m => console.error('aviso:', m), error: (m, f) => console.error('ERROR:', m, JSON.stringify(f || {})) } });
  try {
    if (command === 'estado') await estado(pool);
    else if (command === 'descartar-eventos') {
      if (!flags.has('--si')) throw new Error('Esto descarta los eventos pendientes sin generar avisos. Repetí el comando con --si para confirmar.');
      const { rowCount } = await pool.query('UPDATE order_events SET processed_at = now() WHERE processed_at IS NULL');
      console.log(`Eventos descartados: ${rowCount}`);
    } else if (command === 'probar-aviso') await probar(pool, worker, config);
    else if (command === 'buscar-en-ycloud') {
      if (!config.apiKey) throw new Error('Falta YCLOUD_API_KEY.');
      console.log(JSON.stringify(await buscarEnYcloud(resolveAlertId(positional[0]), { apiKey: config.apiKey }), null, 2));
    } else if (command === 'resolver') await resolver(pool, positional, flags);
    else { console.log(AYUDA); process.exitCode = 2; }
  } finally {
    await pool.end();
  }
}

async function estado(pool) {
  const q = async (text, params) => (await pool.query(text, params)).rows;
  console.log('== Avisos por estado ==');
  console.table(await q(`SELECT state AS estado, test AS prueba, count(*) AS cantidad FROM whatsapp_alerts GROUP BY 1, 2 ORDER BY 1, 2`));
  const [events] = await q(`SELECT count(*) AS pendientes, min(created_at) AS el_mas_viejo FROM order_events WHERE processed_at IS NULL`);
  console.log(`== Eventos de pedidos sin procesar: ${events.pendientes}${events.el_mas_viejo ? ` (el más viejo: ${events.el_mas_viejo.toISOString()})` : ''}`);
  const budget = await q(`SELECT day::text AS dia, count AS enviados_hoy FROM whatsapp_alert_budget ORDER BY day DESC LIMIT 3`);
  console.log('== Tope diario (últimos días) =='); console.table(budget);
  const [checks] = await q(`SELECT count(*) AS pendientes FROM whatsapp_payment_checks WHERE state = 'pending'`);
  console.log(`== Pagos con tarjeta esperando verificación: ${checks.pendientes}`);
  const review = await q(`SELECT order_code AS pedido, event AS evento, state AS estado, error_code AS codigo, attempts AS intentos, id
                            FROM whatsapp_alerts WHERE state IN ('unknown', 'failed') ORDER BY created_at_ms DESC LIMIT 20`);
  console.log(`== A revisar (unknown/failed): ${review.length}`);
  if (review.length) console.table(review);
  const latest = await q(`SELECT order_code AS pedido, event AS evento, state AS estado, test AS prueba, to_timestamp(created_at_ms / 1000.0) AS creado
                            FROM whatsapp_alerts ORDER BY created_at_ms DESC LIMIT 5`);
  console.log('== Últimos 5 avisos =='); console.table(latest);
}

async function probar(pool, worker, config) {
  const event = positional[0] || 'pedido';
  if (!Object.hasOwn(TEMPLATES, event)) throw new Error('El evento debe ser pedido o pago.');
  if (!config.enabled) throw new Error('Para enviar de verdad hay que ejecutar este comando con WHATSAPP_ALERTS_ENABLED=true (el trabajador en marcha puede seguir apagado).');
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const code = `AURA-PRUEBA${stamp}`;
  const id = `prueba-${stamp}`;
  const status = event === 'pago' ? 'confirmado' : 'pendiente';
  await pool.query(
    `INSERT INTO whatsapp_alert_tests (id, order_id, items, payment_method, status, total) VALUES ($1, $2, $3::jsonb, 'Transferencia', $4, 100000)`,
    [id, code, JSON.stringify([{ code: 'PRUEBA', quantity: 1 }]), status]);
  const alertId = await worker.handleTestRow(null, { id, order_id: code, items: [{ code: 'PRUEBA', quantity: 1 }], payment_method: 'Transferencia', status, total: 100000 });
  if (!alertId) throw new Error('El aviso de prueba no se creó (revisá WHATSAPP_ALERTS_STARTED_AT).');
  console.log(`Aviso de prueba creado: ${code} / ${event} (id ${alertId}). Enviando a ${RECIPIENT}…`);
  const outcome = await worker.dispatch(alertId);
  console.log('Resultado del envío:', JSON.stringify(outcome));
  if (outcome?.state !== 'accepted') return;
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const { rows } = await pool.query('SELECT * FROM whatsapp_alerts WHERE id = $1', [alertId]);
    const enYcloud = await worker.checkDelivery({ id: alertId, providerId: rows[0].provider_id, expiresAtMs: rows[0].expires_at_ms });
    console.log(`  estado en YCloud: ${enYcloud ?? 'sin novedades'}`);
    if (['delivered', 'read', 'failed'].includes(enYcloud)) break;
  }
}

async function resolver(pool, positionalArgs, flagSet) {
  const [ref, action, providerId] = positionalArgs;
  const id = resolveAlertId(ref);
  const { rows } = await pool.query('SELECT state, order_code, event FROM whatsapp_alerts WHERE id = $1', [id]);
  if (!rows[0]) throw new Error('No existe ese aviso.');
  if (!['unknown', 'failed'].includes(rows[0].state)) throw new Error(`El aviso está en estado ${rows[0].state}; solo se resuelven unknown o failed.`);
  if (action === 'enviado') {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(providerId || '')) throw new Error('Falta el id de YCloud del mensaje.');
    await pool.query(`UPDATE whatsapp_alerts SET state = 'accepted', provider_id = $2, error_code = '', updated_at = now() WHERE id = $1`, [id, providerId]);
    console.log(`Aviso ${rows[0].order_code}/${rows[0].event} registrado como enviado (accepted). La conciliación consultará su entrega.`);
  } else if (action === 'reintentar') {
    if (!flagSet.has('--confirmo-que-no-se-envio')) throw new Error('Reintentar puede DUPLICAR el mensaje si YCloud sí lo envió. Comprobalo con buscar-en-ycloud y repetí con --confirmo-que-no-se-envio.');
    const at = Date.now();
    await pool.query(`UPDATE whatsapp_alerts SET state = 'pending', error_code = '', next_attempt_at_ms = $2, expires_at_ms = $3, updated_at = now() WHERE id = $1`, [id, at, at + MAX_AGE_MS]);
    console.log(`Aviso ${rows[0].order_code}/${rows[0].event} vuelto a la cola; sale en el próximo ciclo (hasta 5 min) si el trabajador está encendido.`);
  } else throw new Error('Acción desconocida: usá enviado o reintentar.');
}

main().catch(error => { console.error(`Error: ${error.message}`); process.exit(1); });
