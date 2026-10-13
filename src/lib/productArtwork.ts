import type { Perfume } from '../types';

// Las notas del catálogo eligen la ambientación; nunca se deducen del género.
export const BOTANICAL_RULES = [
  ['peonia', /peonia/],
  ['rosa', /^rosas?(?: |$)/],
  ['azahar', /azahar|azhaar|flor del naranjo|neroli/],
  ['jazmin', /jazmin/],
  ['iris', /^iris(?: |$)/],
  ['orquidea', /orquidea/],
  ['flor-durazno', /flor de durazno/],
  ['lavanda', /lavanda/],
  ['vainilla', /vainilla/],
  ['bergamota', /bergamota|bergamonta/],
  ['cardamomo', /cardamomo|cardomomo/],
  ['madera', /madera|sandalo|cedro|abedul/],
  ['manzana', /manzana/],
  ['pera', /^pera(?: |$)/],
  ['limon', /limon/],
  ['mandarina', /mandarina/],
  ['pina', /pina/],
  ['melon', /melon/],
  ['coco', /coco/],
  ['cereza', /cereza/],
  ['pitahaya', /pitahaya/],
  ['toronja', /toronja|toronjo/],
  ['mango', /^mango(?: |$)/],
  ['miel', /^miel(?: |$)/],
  ['maracuya', /maracuya/],
  ['granada', /granada/],
  ['pimienta-rosa', /pimienta rosa/],
] as const;

export type BotanicalKey = typeof BOTANICAL_RULES[number][0];
export const BOTANICAL_KEYS: readonly string[] = BOTANICAL_RULES.map(([key]) => key);

export function productBotanicals(notes: readonly string[] = []): BotanicalKey[] {
  const normalized = notes.map(note => note.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  return BOTANICAL_RULES.filter(([, pattern]) => normalized.some(note => pattern.test(note))).slice(0, 3).map(([key]) => key);
}

/** Solo presentación de la tienda: conserva la foto original en administración. */
export function productArtworkUrl(product: Pick<Perfume, 'code' | 'notes' | 'imageUrl'>): string {
  if (!/^(CC|DD|UU)\d{3,6}$/i.test(product.code)) return product.imageUrl;
  const params = new URLSearchParams({ v: '1', notes: productBotanicals(product.notes).join(',') });
  return `/api/perfume-art/${encodeURIComponent(product.code.toUpperCase())}?${params}`;
}
