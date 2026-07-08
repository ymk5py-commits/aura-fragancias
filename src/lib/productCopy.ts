import { Perfume, SiteSettings } from '../types';

const USE_BY_CATEGORY: Record<string, string> = {
  Daily: 'el uso diario: oficina, estudio y planes de día',
  Casual: 'salidas, encuentros y planes casuales',
  Night: 'la noche y las ocasiones especiales',
};

const GENDER_LABEL: Record<string, string> = {
  Man: 'masculina',
  Woman: 'femenina',
  Unisex: 'unisex',
};

function toSentenceList(items: string[]): string {
  const clean = items.map((n) => n.toLowerCase());
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(', ')} y ${clean[clean.length - 1]}`;
}

/**
 * Prosa de ficha de producto. Si el producto trae `description` cargada
 * (Firestore/admin), manda esa; si no, se redacta una única a partir de
 * los datos reales del perfume (notas, familia, fijación, precios).
 */
export function buildProductDescription(perfume: Perfume, settings: SiteSettings): string {
  if (perfume.description?.trim()) return perfume.description.trim();

  const notas = toSentenceList(perfume.notes || []);
  const familia = (perfume.family || '').toLowerCase();
  const uso = USE_BY_CATEGORY[perfume.category] || 'todos los días';
  const genero = GENDER_LABEL[perfume.gender] || 'unisex';
  const precioDesde = settings.price10.toLocaleString('es-PY');

  return (
    `${perfume.name} es una fragancia ${genero} de Äura: una inspiración olfativa de ${perfume.inspiration} ` +
    `elaborada como Extrait de Parfum con 30% de concentración, el formato más intenso de la perfumería. ` +
    `Pertenece a la familia ${familia}${notas ? ` y despliega notas de ${notas}` : ''}, ` +
    `con una intensidad de ${perfume.intensity} sobre 5 y una fijación de ${perfume.duration} en la piel. ` +
    `Es ideal para ${uso}. ` +
    `Se elabora con esencias premium importadas y pasa por 21 días de macerado y reposo antes de cada envío. ` +
    `Está disponible en presentaciones de 10 ML, 30 ML y 50 ML desde Gs. ${precioDesde}, ` +
    `con despacho a todo Paraguay y delivery gratis en compras desde Gs. 300.000.`
  );
}
