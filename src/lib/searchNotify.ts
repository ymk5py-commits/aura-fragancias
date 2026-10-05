import { getFirebaseAuth } from './firebase';

/** Avisar después del guardado: una falla del buscador no revierte el producto. */
export async function notifySearch(code?: string) {
  try {
    const user = (await getFirebaseAuth()).currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const result = await fetch('/api/search-index', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(code ? { code } : { catalog: true }), signal: AbortSignal.timeout(12000), keepalive: true,
    });
    if (!result.ok) console.warn('[Äura] No se pudo avisar al buscador; el catálogo se actualizará por su refresco automático.');
  } catch { console.warn('[Äura] Aviso a buscadores sin conexión; el guardado se conserva.'); }
}
