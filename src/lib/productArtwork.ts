import type { Perfume } from '../types';
import { catalogOlfactoryNotes } from './catalogNotes';

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
  ['madera', /madera|sandalo|cedro|abedul|amberwood|ambarwood/],
  ['manzana', /manzana/],
  ['pera', /^pera(?: |$)/],
  ['limon', /limon/],
  ['mandarina', /mandarina|madarina/],
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
  ['pachuli', /pachuli/],
  ['jengibre', /jengibre/],
  ['naranja', /^naranja(?: amarga)?$/],
  ['ambar', /^ambar$/],
  ['cuero', /cuero/],
  ['ciruela', /ciruela/],
  ['menta', /menta/],
  ['pimienta-negra', /^pimienta(?: negra| sichuan)?$/],
  ['benjui', /benjui/],
  ['romero', /romero/],
  ['acuatico', /notas? (?:marinas?|acuosas?|acuaticas?)|calipsone/],
  ['almizcle', /almizcle|amizcle/],
  ['salvia', /salvia/],
  ['canela', /^canela$/],
  ['caramelo', /caramelo|tofe/],
  ['anis', /^anis(?: estrellado)?$/],
  ['casis', /grosell|casis/],
  ['pepino', /pepino/],
  ['vetiver', /vetiver/],
  ['enebro', /enebro/],
  ['frutos-rojos', /frambuesa|franmbuesa|fambrueza|boysen|frutas rojas|bayas rojas/],
  ['cannabis', /cannabis/],
  ['licor', /^(?:ron|whisky|licor)$/],
  ['incienso', /incienso|insienso/],
  ['pimienta-blanca', /pimienta blanca/],
  ['tonka', /tonka/],
  ['pino', /^pino$/],
  ['cilantro', /cilantro/],
  ['laurel', /laurel/],
  ['verbena', /verbena/],
  ['especias', /^especias$/],
  ['avellana', /avellana/],
  ['cafe', /cafe/],
  ['tabaco', /tabaco/],
  ['champagne', /champagne|cahmpagne/],
  ['hojas-manzano', /hojas de manzano/],
  ['magnolia', /magnolia/],
  ['fresia', /fresia/],
  ['durazno', /^durazno$/],
  ['nardo', /^nardo$/],
  ['sal', /^sal$/],
  ['crema', /crema batida/],
  ['praline', /praline/],
  ['te', /te lapsang/],
  ['lirio-valles', /lirio de los valles/],
  ['notas-verdes', /notas? verdes?/],
  ['frutas', /^frutas(?: tropicales)?$/],
] as const;

export type BotanicalKey = typeof BOTANICAL_RULES[number][0];
export const BOTANICAL_KEYS: readonly string[] = BOTANICAL_RULES.map(([key]) => key);

export function productBotanicalSelections(notes: readonly string[] = []): { key: BotanicalKey; note: string }[] {
  const normalized = notes.map(note => ({ note, value: note.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() }));
  return BOTANICAL_RULES.flatMap(([key, pattern]) => {
    const match = normalized.find(({ value }) => pattern.test(value));
    return match ? [{ key, note: match.note }] : [];
  }).slice(0, 3);
}

export function productBotanicals(notes: readonly string[] = []): BotanicalKey[] {
  return productBotanicalSelections(notes).map(({ key }) => key);
}

/** Solo presentación de la tienda: conserva la foto original en administración. */
export function productArtworkUrl(product: Pick<Perfume, 'code' | 'notes' | 'imageUrl'>, view: 'catalog' | 'cutout' = 'catalog'): string {
  if (!/^(CC|DD|UU)\d{3,6}$/i.test(product.code)) return product.imageUrl;
  const params = new URLSearchParams({ v: '4', notes: productBotanicals(catalogOlfactoryNotes(product)).join(',') });
  if (view === 'cutout') params.set('view', 'cutout');
  return `/api/perfume-art/${encodeURIComponent(product.code.toUpperCase())}?${params}`;
}
