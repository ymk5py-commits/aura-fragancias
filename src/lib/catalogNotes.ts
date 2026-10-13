import type { Perfume } from '../types';

// Perfiles incompletos del catálogo, contrastados con las fichas oficiales de
// YSL MYSLF EDP y Valentino Born in Roma Donna Extradose (13/10/2026).
// No se reemplazan listas completas que el administrador haya cargado.
const VERIFIED_NOTES: Record<string, readonly string[]> = {
  CC251: ['BERGAMOTA', 'FLOR DEL NARANJO', 'NOTAS AMADERADAS'],
  DD185: ['VAINILLA', 'GROSELLA NEGRA', 'RON'],
};

export function catalogOlfactoryNotes(product: Pick<Perfume, 'code' | 'notes'>): string[] {
  const notes = product.notes || [];
  const confirmed = VERIFIED_NOTES[product.code.toUpperCase()];
  if (!confirmed || notes.length >= 3) return notes;
  const actual = notes.filter(note => !/^oriental\s+vainilla$/i.test(note.trim()));
  return Array.from(new Set([...actual, ...confirmed])).slice(0, 3);
}
