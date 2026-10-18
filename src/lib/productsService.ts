// CRUD de productos (solo lo usa /admin). El SDK de Supabase se importa dinámicamente
// para no entrar en el bundle de la tienda.
import { getSupabase, toError } from './supabase';
import { PERFUMES, SALES_BY_CODE } from '../constants';
import { Perfume } from '../types';
import { notifySearch } from './searchNotify';
import { snakeifyObject } from './supabaseMap';

const TABLE = 'products';

/** Crea o reemplaza un producto. Usa el `code` como id de la fila. */
export async function saveProduct(p: Perfume): Promise<void> {
  const sb = await getSupabase();
  const id = (p.id || p.code).trim();
  const { error } = await sb.from(TABLE).upsert(
    {
      id,
      code: p.code.trim(),
      name: p.name.trim(),
      inspiration: p.inspiration.trim(),
      family: p.family.trim(),
      notes: p.notes,
      intensity: Number(p.intensity) || 1,
      duration: p.duration.trim(),
      gender: p.gender,
      category: p.category,
      image_url: p.imageUrl || '',
      visible: p.visible !== false,
      sales_score: Number(p.salesScore) || 0,
      description: (p.description || '').trim(),
      badge: p.badge || null,
    },
    { onConflict: 'id' },
  );
  if (error) throw toError(error);
  void notifySearch(p.code);
}

export async function updateProductFields(id: string, fields: Partial<Perfume>): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).update(snakeifyObject(fields as Record<string, unknown>, ['id', 'updatedAt'])).eq('id', id);
  if (error) throw toError(error);
  void notifySearch(fields.code || id);
}

export async function deleteProduct(id: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw toError(error);
  void notifySearch(id);
}

export async function toggleVisible(id: string, visible: boolean): Promise<void> {
  await updateProductFields(id, { visible });
}

/**
 * Sube una imagen al almacenamiento y devuelve su URL pública.
 * Antes de subir la comprime en el navegador (JPEG, ver imageCompress.ts):
 * una foto del panel pasa de ~2 MB a unos cientos de KB.
 */
export async function uploadProductImage(file: File, code: string): Promise<string> {
  const [sb, { compressImage }] = await Promise.all([getSupabase(), import('./imageCompress')]);
  const upload = await compressImage(file);
  const safeCode = (code || 'producto').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeName = upload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${safeCode}-${Date.now()}-${safeName}`;
  const { error } = await sb.storage.from('products').upload(path, upload, { contentType: upload.type, upsert: false });
  if (error) throw toError(error, 'No se pudo subir la imagen');
  return sb.storage.from('products').getPublicUrl(path).data.publicUrl;
}

/** Importa el catálogo incluido si la tabla está vacía. */
export async function seedCatalog(): Promise<number> {
  const sb = await getSupabase();
  const { count, error } = await sb.from(TABLE).select('id', { count: 'exact', head: true });
  if (error) throw toError(error);
  if ((count ?? 0) > 0) {
    throw new Error('Ya hay productos cargados. La importación solo corre cuando está vacío.');
  }
  let imported = 0;
  for (const p of PERFUMES) {
    await saveProduct({ ...p, visible: true, salesScore: SALES_BY_CODE[p.code] || 0 });
    imported++;
  }
  return imported;
}
