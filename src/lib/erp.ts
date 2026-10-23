import { MAX_SALE_SIZES, PAYMENT_METHODS, SALE_SIZES, csvCell, isSaleSize, saleTotals, sortSizes, type Sale, type SaleSize } from './sales';

export const EXPENSE_TYPES = ['Operativo', 'Mercadería', 'Inversión', 'Retiro'] as const;
export type ExpenseType = typeof EXPENSE_TYPES[number];
export interface Expense {
  id: string;
  date: string;
  type: ExpenseType;
  category: string;
  description: string;
  payee: string;
  amount: number;
  paymentMethod: string;
  status: 'pagado' | 'pendiente' | 'anulado';
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PackagingCosts { bottle: number; box: number; bag: number; label: number; largeLabel: number; other: number }
export const PACKAGING_KEYS = ['bottle', 'box', 'bag', 'label', 'largeLabel', 'other'] as const;
export interface CostRecipe {
  essencePercent: number;
  fixativePercent: number;
  essenceRate: number;
  fixativeRate: number;
  alcoholRate: number;
  /** Una entrada por presentación: las de la tienda (10, 30 y 50 ML) y las que se crean en Costos. */
  packaging: Record<SaleSize, PackagingCosts>;
  /** Precio de venta sugerido para Caja de las presentaciones creadas en Costos (las de la tienda usan el precio de Configuración). */
  prices?: Record<SaleSize, number>;
}
export const INITIAL_RECIPE: CostRecipe = {
  essencePercent: 30, fixativePercent: 5, essenceRate: 550, fixativeRate: 120, alcoholRate: 24,
  packaging: {
    '10 ML': { bottle: 5500, box: 0, bag: 1200, label: 0, largeLabel: 0, other: 200 },
    '30 ML': { bottle: 6400, box: 1900, bag: 2500, label: 400, largeLabel: 0, other: 600 },
    '50 ML': { bottle: 8500, box: 1900, bag: 3000, label: 400, largeLabel: 857, other: 0 },
  },
};

export const emptyPackaging = (): PackagingCosts => ({ bottle: 0, box: 0, bag: 0, label: 0, largeLabel: 0, other: 0 });
export const recipeSizes = (recipe: Pick<CostRecipe, 'packaging'>): SaleSize[] => sortSizes(Object.keys(recipe.packaging));
/** Presentación sin packaging cargado: su costo solo incluye el líquido, hasta que se completen frasco, caja, etc. */
export const packagingMissing = (recipe: Pick<CostRecipe, 'packaging'>, size: SaleSize) =>
  !recipe.packaging[size] || Object.values(recipe.packaging[size]).every((n) => !n);

export function recipeCost(recipe: CostRecipe, size: SaleSize) {
  if (!recipe.packaging[size]) throw new Error(`No hay costos cargados para ${size}.`);
  const ml = parseInt(size);
  const essence = ml * recipe.essencePercent / 100;
  const fixative = ml * recipe.fixativePercent / 100;
  const alcohol = ml - essence - fixative;
  const liquid = essence * recipe.essenceRate + fixative * recipe.fixativeRate + alcohol * recipe.alcoholRate;
  const packaging = Object.values(recipe.packaging[size]).reduce((sum, n) => sum + n, 0);
  return { essence, fixative, alcohol, liquid: Math.round(liquid), packaging, total: Math.round(liquid + packaging) };
}

export function validateRecipe(recipe: CostRecipe) {
  if (!recipe || typeof recipe !== 'object' || !recipe.packaging || typeof recipe.packaging !== 'object') return 'Revisá los costos y porcentajes.';
  const sizes = Object.keys(recipe.packaging);
  if (!sizes.every(isSaleSize)) return 'Una presentación tiene un nombre inválido. Usá solo mililitros enteros, por ejemplo 100 ML.';
  if (!SALE_SIZES.every((size) => sizes.includes(size))) return 'Las presentaciones de la tienda (10, 30 y 50 ML) no se pueden quitar.';
  if (sizes.length > MAX_SALE_SIZES) return `Podés tener hasta ${MAX_SALE_SIZES} presentaciones.`;
  const packs = Object.values(recipe.packaging);
  if (!packs.every((pack) => pack && typeof pack === 'object' && PACKAGING_KEYS.every((key) => key in pack))) return 'Revisá los costos y porcentajes.';
  const values = [recipe.essencePercent, recipe.fixativePercent, recipe.essenceRate, recipe.fixativeRate, recipe.alcoholRate, ...packs.flatMap((pack) => PACKAGING_KEYS.map((key) => pack[key]))];
  if (!values.every((n) => Number.isFinite(n) && n >= 0 && n <= 1e9)) return 'Revisá los costos y porcentajes.';
  if (recipe.essencePercent + recipe.fixativePercent > 100) return 'Los porcentajes de esencia y fijador no pueden superar el 100%.';
  if (recipe.prices !== undefined) {
    const entries = recipe.prices && typeof recipe.prices === 'object' ? Object.entries(recipe.prices) : null;
    if (!entries || !entries.every(([size, price]) => sizes.includes(size) && Number.isSafeInteger(price) && price >= 0 && price <= 1e9)) return 'Revisá los precios de venta sugeridos.';
  }
  return null;
}

export function validateExpense(expense: Expense) {
  const date = new Date(`${expense.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== expense.date) return 'Elegí una fecha válida.';
  if (!EXPENSE_TYPES.includes(expense.type) || !['pagado', 'pendiente', 'anulado'].includes(expense.status)) return 'Revisá el tipo y el estado.';
  if (!expense.id || expense.id.includes('/')) return 'El gasto necesita un identificador válido.';
  if (!PAYMENT_METHODS.includes(expense.paymentMethod)) return 'Elegí una forma de pago.';
  if (!expense.category.trim() || !expense.description.trim()) return 'Completá la categoría y el detalle.';
  if (expense.category.length > 100 || expense.description.length > 300 || expense.payee.length > 120 || expense.notes.length > 2000) return 'Uno de los textos es demasiado largo.';
  if (!Number.isSafeInteger(expense.amount) || expense.amount <= 0 || expense.amount > 1e12) return 'El monto debe ser un entero mayor que cero.';
  return null;
}

export function erpSummary(sales: Sale[], expenses: Expense[]) {
  const active = sales.filter((s) => s.status !== 'anulada');
  const totals = active.map(saleTotals);
  const exp = expenses.filter((e) => e.status !== 'anulado');
  const paid = expenses.filter((e) => e.status === 'pagado');
  const sum = (type: ExpenseType) => exp.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);
  const costsComplete = totals.every((t) => t.costsComplete);
  const grossProfit = costsComplete ? totals.reduce((s, t) => s + (t.profit || 0), 0) : null;
  const operating = sum('Operativo');
  const collected = active.reduce((s, sale) => s + sale.collected, 0);
  const saleCashCosts = active.reduce((s, sale) => s + sale.deliveryActual + sale.otherCosts, 0);
  return {
    count: active.length, units: totals.reduce((s, t) => s + t.units, 0),
    revenue: totals.reduce((s, t) => s + t.revenue, 0), collected,
    receivable: totals.reduce((s, t) => s + t.balance, 0),
    productCost: totals.reduce((s, t) => s + t.productCost, 0),
    deliveryMargin: totals.reduce((s, t) => s + t.deliveryDifference, 0),
    grossProfit, operating, netProfit: grossProfit == null ? null : grossProfit - operating,
    merchandise: sum('Mercadería'), investment: sum('Inversión'), withdrawals: sum('Retiro'),
    cashFlow: collected - saleCashCosts - paid.reduce((s, e) => s + e.amount, 0),
    payable: exp.filter((e) => e.status === 'pendiente').reduce((s, e) => s + e.amount, 0),
    missingCosts: totals.filter((t) => !t.costsComplete).length,
  };
}

export function expensesCsv(expenses: Expense[]) {
  return '\uFEFF' + [
    ['Movimiento', 'Fecha', 'Tipo', 'Categoría', 'Detalle', 'Proveedor / socio', 'Monto', 'Pago', 'Estado', 'Notas'],
    ...expenses.map((e) => [e.id, e.date, e.type, e.category, e.description, e.payee, e.amount, e.paymentMethod, e.status, e.notes]),
  ].map((row) => row.map(csvCell).join(';')).join('\r\n');
}
