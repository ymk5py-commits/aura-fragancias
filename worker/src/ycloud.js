import { RECIPIENT } from './alerts.js';

const LIST = 'https://api.ycloud.com/v2/whatsapp/messages';

/**
 * Busca en YCloud (solo lectura) el mensaje que corresponde a un aviso, por su externalId (`aura-<id del aviso>`).
 * Sirve para resolver los avisos en estado `unknown` sin adivinar: si YCloud lo tiene, NO se reenvía.
 * Devuelve { found, message } con campos no sensibles, o { found: false }.
 */
export async function buscarEnYcloud(alertId, { apiKey, fetchImpl = globalThis.fetch, pages = 5 } = {}) {
  const externalId = `aura-${alertId}`;
  const limit = 100;
  for (let page = 1; page <= pages; page++) {
    const url = `${LIST}?${new URLSearchParams({ limit: String(limit), page: String(page), 'filter.to': RECIPIENT })}`;
    const response = await fetchImpl(url, { headers: { 'X-API-Key': apiKey }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`YCloud respondió HTTP ${response.status}`);
    const body = await response.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const hit = items.find(item => item.externalId === externalId);
    if (hit) {
      return { found: true, message: { id: hit.id, status: hit.status, createTime: hit.createTime, sendTime: hit.sendTime, deliverTime: hit.deliverTime,
        totalPrice: hit.totalPrice, currency: hit.currency, errorCode: hit.errorCode || '' } };
    }
    if (items.length < limit) break;
  }
  return { found: false };
}
