// Guardado de configuración (solo lo usa /admin). El SDK se importa dinámicamente
// para no entrar en el bundle de la tienda.
import { getSupabase, toError } from './supabase';
import { SiteSettings } from '../types';
import { notifySearch } from './searchNotify';

export async function saveSettings(settings: SiteSettings): Promise<void> {
  const sb = await getSupabase();
  // Fusiona con lo guardado (como setDoc con merge en Firestore): los campos que no se mandan se conservan.
  const { data: current, error: readError } = await sb.from('settings').select('data').eq('id', 'site').maybeSingle();
  if (readError) throw toError(readError);
  const merged: Record<string, unknown> = { ...((current?.data as Record<string, unknown>) || {}) };
  for (const [key, value] of Object.entries(settings)) {
    if (key !== 'updatedAt' && value !== undefined) merged[key] = value;
  }
  const { error } = await sb.from('settings').upsert({ id: 'site', data: merged }, { onConflict: 'id' });
  if (error) throw toError(error);
  void notifySearch();
}
