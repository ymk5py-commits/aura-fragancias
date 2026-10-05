import { saleTotals, validateSale, type Sale, type SaleSize } from './sales';
import { validateExpense, type Expense, type ExpenseType } from './erp';

export interface SheetSnapshot {
  version: 1; spreadsheetId: string; title: string; readAt: string;
  sheets: { title: string; sheetId: number; rows: unknown[][] }[];
}
export interface ImportOptions { month: string; monthlyExpenseDates: boolean; correctInternet: boolean }
export interface ImportRow {
  key: string; sheet: string; row: number; kind: 'sale' | 'expense';
  record: Sale | Expense | null; errors: string[]; warnings: string[];
}
const text = (v: unknown) => v == null ? '' : String(v).trim();
const normalized = (v: unknown) => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const amount = (v: unknown) => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && Math.abs(n - Math.round(n)) < 0.00001 ? Math.round(n) : NaN;
};
export function sheetDate(v: unknown): string {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 36526 && v <= 73415) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const s = text(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : '';
}
function tabMonth(title: string) {
  const label = normalized(title).split('.').pop()?.trim() || '';
  const prefixes = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
  const index = prefixes.findIndex(p => label.startsWith(p));
  return index < 0 ? '' : String(index + 1).padStart(2, '0');
}
export function parseSnapshot(contents: string): SheetSnapshot {
  if (contents.length > 5_000_000) throw new Error('El archivo es demasiado grande.');
  const value = JSON.parse(contents) as SheetSnapshot;
  if (!value || value.version !== 1 || typeof value.spreadsheetId !== 'string' || !/^[\w-]{10,100}$/.test(value.spreadsheetId) || typeof value.title !== 'string' || value.title.length > 100 || typeof value.readAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.readAt) || !Array.isArray(value.sheets) || value.sheets.length > 50) throw new Error('El archivo no es una copia de AURA CAJA compatible.');
  const ids = new Set<number>();
  for (const sheet of value.sheets) {
    if (typeof sheet.title !== 'string' || sheet.title.length > 100 || !Number.isSafeInteger(sheet.sheetId) || sheet.sheetId < 0 || ids.has(sheet.sheetId) || !Array.isArray(sheet.rows) || sheet.rows.length > 3000 || sheet.rows.some(row => !Array.isArray(row) || row.length > 30 || row.some(cell => cell !== null && !['string', 'number', 'boolean'].includes(typeof cell)))) throw new Error('Revisá las pestañas del archivo.');
    ids.add(sheet.sheetId);
  }
  return value;
}

/** Cada fila conserva su identidad de origen. No agrupa clientes ni inventa códigos de catálogo. */
export function prepareImport(snapshot: SheetSnapshot, options: ImportOptions, catalog: { id: string; name: string }[]): ImportRow[] {
  const out: ImportRow[] = [];
  for (const sheet of snapshot.sheets) {
    const month = tabMonth(sheet.title);
    const isSale = normalized(sheet.title).startsWith('V.');
    const isExpense = normalized(sheet.title).startsWith('G.');
    if ((!isSale && !isExpense) || !month) continue;
    const headers = (sheet.rows[isSale ? 0 : 1] || []).map(normalized);
    const required = isSale ? ['FECHA', 'FRAGANCIA', 'ML', 'CANTIDAD', 'TOTAL COBRADO', 'COSTO UN'] : ['FECHA', 'CATEGORIA', 'DETALLE', 'MONTO (GS)'];
    if (!required.every(h => headers.includes(h)) || (isSale && !headers.some(h => h === 'PV' || h === 'PV UN'))) throw new Error(`Las columnas de ${sheet.title} no coinciden con AURA CAJA.`);
    const getIndex = (...names: string[]) => headers.findIndex(h => names.includes(h));
    for (let index = isSale ? 1 : 2; index < sheet.rows.length; index++) {
      const raw = sheet.rows[index]; const rowNumber = index + 1;
      const source = `${snapshot.title || 'Google Sheets'} · ${sheet.title} · fila ${rowNumber}`;
      if (isSale) {
        const get = (...names: string[]) => raw[getIndex(...names)];
        // Las fórmulas de las filas vacías y las filas de totales no son ventas.
        if (!text(get('FECHA')) && !text(get('COD')) && !text(get('FRAGANCIA')) && !text(get('CLIENTE')) && !amount(get('CANTIDAD')) && !amount(get('PV', 'PV UN'))) continue;
        if (normalized(get('FECHA')).startsWith('TOTAL') || normalized(get('FRAGANCIA')).startsWith('TOTAL')) continue;
        const errors: string[] = []; const warnings: string[] = [];
        const date = sheetDate(get('FECHA'));
        if (options.month !== 'all' && (date ? date.slice(0, 7) !== options.month : month !== options.month.slice(5))) continue;
        if (!date) errors.push('Falta la fecha de venta.');
        else if (date.slice(5, 7) !== month) warnings.push('La fecha pertenece a otro mes; se conserva la fecha original.');
        const rawCode = normalized(get('COD'));
        const codeMatch = rawCode.match(/^(CC|DD|UU)(\d{1,3})$/);
        const code = codeMatch ? `${codeMatch[1]}${codeMatch[2].padStart(3, '0')}` : rawCode;
        if (code && code !== rawCode) warnings.push(`Código normalizado: ${rawCode} → ${code}.`);
        const product = catalog.find(p => p.id === code);
        const name = text(get('FRAGANCIA')) || product?.name || '';
        if (!name) errors.push('Falta el nombre de la fragancia.');
        if (!product) warnings.push(code ? 'Código histórico fuera del catálogo actual.' : 'Sin código: se conserva como fragancia histórica, sin asociarla al catálogo.');
        const size = `${amount(get('ML'))} ML` as SaleSize;
        const quantity = amount(get('CANTIDAD')); const unitPrice = amount(get('PV', 'PV UN'));
        const subtotal = quantity * unitPrice;
        const revenue = amount(get('TOTAL COBRADO'));
        const unitCost = get('COSTO UN') == null || get('COSTO UN') === '' ? null : amount(get('COSTO UN'));
        if (get('TOTAL COBRADO') == null || get('TOTAL COBRADO') === '') errors.push('Falta el total cobrado de productos.');
        if (unitCost === null) warnings.push('No tiene costo histórico: su ganancia quedará pendiente.');
        if (revenue > subtotal) errors.push('Total de productos superior a cantidad × precio. Revisar la fila.');
        if (revenue < subtotal) warnings.push(`Se conserva el total cobrado con un descuento de Gs. ${subtotal - revenue}.`);
        const key = `sheet_${snapshot.spreadsheetId}_${sheet.sheetId}_${rowNumber}_sale`;
        const record: Sale = { id: key, date, customer: text(get('CLIENTE')), phone: '', channel: 'Otro', paymentMethod: 'Otro', status: 'pagada',
          items: [{ code: code || `HIST-${sheet.sheetId}-${rowNumber}`, name, size, quantity, unitPrice, unitCost }],
          discount: Math.max(0, subtotal - revenue), deliveryCharged: amount(get('DELIVERY COBRADO')), deliveryActual: amount(get('DELIVERY REAL')), otherCosts: 0,
          collected: revenue + amount(get('DELIVERY COBRADO')), notes: `Importado de ${source}. Una fila de la planilla = un registro. Medio de pago y canal no informados.` };
        const validation = validateSale(record); if (validation) errors.push(validation);
        if (!errors.length) {
          const totals = saleTotals(record);
          if (get('TOTAL COSTO') != null && amount(get('TOTAL COSTO')) !== totals.productCost) warnings.push('El costo total de la planilla difiere de cantidad × costo unitario.');
          if (get('GANACIA NETA') != null && totals.profit !== null && amount(get('GANACIA NETA')) !== totals.profit) warnings.push('La ganancia de la planilla difiere del cálculo por precios, costos y delivery.');
        }
        record.notes += warnings.length ? ' ' + warnings.join(' ') : '';
        out.push({ key, sheet: sheet.title, row: rowNumber, kind: 'sale', record: errors.length ? null : record, errors, warnings });
      } else {
        for (const [offset, type] of [[0, 'Operativo'], [5, 'Mercadería'], [10, 'Retiro']] as [number, ExpenseType][]) {
          const [rawDate, category, detail, rawAmount] = raw.slice(offset, offset + 4);
          if (rawAmount == null || rawAmount === '' || (!text(rawDate) && !text(category) && !text(detail))) continue;
          if (/TOTAL|SUMA/.test(normalized(rawDate))) continue;
          const errors: string[] = []; const warnings: string[] = [];
          let date = sheetDate(rawDate); let value = amount(rawAmount);
          const year = options.month === 'all' ? (date.slice(0, 4) || snapshot.readAt?.slice(0, 4)) : options.month.slice(0, 4);
          if (options.month !== 'all' && month !== options.month.slice(5)) continue;
          if (!date || date.slice(5, 7) !== month) {
            if (options.monthlyExpenseDates && /^\d{4}$/.test(year || '')) { date = `${year}-${month}-01`; warnings.push('Fecha asignada al primer día del mes de la pestaña; el día real no está confirmado.'); }
            else errors.push(!date ? 'Gasto sin fecha.' : 'La fecha del gasto no corresponde al mes de la pestaña.');
          }
          if (normalized(category) === 'CEL/INTERNET' && typeof rawAmount === 'number' && Math.abs(rawAmount - 214.914) < 0.000001 && options.correctInternet) { value = 214914; warnings.push('CEL/INTERNET corregido a Gs. 214.914.'); }
          if (!Number.isSafeInteger(value)) errors.push('Importe decimal: confirmar el monto en guaraníes.');
          const key = `sheet_${snapshot.spreadsheetId}_${sheet.sheetId}_${rowNumber}_${offset}`;
          const record: Expense = { id: key, date, type, category: text(category) || (type === 'Operativo' ? text(detail) : type === 'Retiro' ? 'Dividendo' : 'Insumos'), description: text(detail) || text(category) || type,
            payee: type === 'Retiro' ? text(category) : '', amount: value, paymentMethod: 'Otro', status: 'pagado', notes: `Importado de ${source}. Columna ${offset + 1}. Fecha original: ${text(rawDate) || 'sin fecha'}. Importe original: ${text(rawAmount)}. ${warnings.join(' ')}` };
          const validation = validateExpense(record); if (validation) errors.push(validation);
          out.push({ key, sheet: sheet.title, row: rowNumber, kind: 'expense', record: errors.length ? null : record, errors, warnings });
        }
      }
    }
  }
  return out;
}
