import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export function loadTs(file, imports = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, Intl, URLSearchParams, require: (name) => {
    assert.ok(name in imports, `Unexpected import ${name}`); return imports[name];
  } });
  return exports;
}
export const sales = loadTs('../src/lib/sales.ts');
export const erp = loadTs('../src/lib/erp.ts', { './sales': sales });
export const sale = {
  id: 'VENTA-test', date: '2026-10-04', customer: 'Cliente prueba', phone: '', channel: 'WhatsApp', paymentMethod: 'Transferencia', status: 'pagada',
  items: [{ code: 'CC001', name: 'Perfume', size: '30 ML', quantity: 2, unitPrice: 50000, unitCost: 17398 }],
  discount: 10000, deliveryCharged: 12000, deliveryActual: 10900, otherCosts: 500, collected: 102000, notes: '',
};
export const expense = { id: 'GASTO-test', date: '2026-10-04', type: 'Operativo', category: 'Internet', description: 'Servicio mensual', payee: '', amount: 10000, paymentMethod: 'Transferencia', status: 'pagado', notes: '' };

test('sale totals include quantity, discount, delivery margin and fees exactly once', () => {
  const t = sales.saleTotals(sale);
  assert.equal(t.total, 102000); assert.equal(t.productCost, 34796); assert.equal(t.deliveryDifference, 1100); assert.equal(t.profit, 55804);
  assert.equal(sales.validateSale(sale), null);
});
test('delivery subsidy reduces profit rather than increasing it', () => {
  const t = sales.saleTotals({ ...sale, deliveryCharged: 0, deliveryActual: 20000 });
  assert.equal(t.deliveryDifference, -20000); assert.equal(t.profit, 34704);
});
test('unknown cost leaves profit unknown; zero is a valid explicit cost', () => {
  assert.equal(sales.saleTotals({ ...sale, items: [{ ...sale.items[0], unitCost: null }] }).profit, null);
  assert.equal(sales.saleTotals({ ...sale, items: [{ ...sale.items[0], unitCost: 0 }] }).profit, 90600);
});
test('rejects fractional quantities, negative amounts, overpayment and invalid dates', () => {
  for (const patch of [{ items: [{ ...sale.items[0], quantity: 1.5 }] }, { discount: -1 }, { collected: 102001 }, { date: '2026-02-30' }, { items: [] }]) assert.ok(sales.validateSale({ ...sale, ...patch }));
  assert.equal(sales.validateSale({ ...sale, status: 'pendiente', collected: 20000 }), null);
});
test('recipe reproduces the current COSTOS tab without changing historical sales', () => {
  for (const size of sales.SALE_SIZES) assert.equal(erp.recipeCost(erp.INITIAL_RECIPE, size).total, sales.INITIAL_COSTS[size]);
  assert.equal(sale.items[0].unitCost, 17398);
  assert.ok(erp.validateRecipe({ ...erp.INITIAL_RECIPE, essencePercent: 99 }));
});
test('operating result and cash flow treat merchandise, investment and withdrawals separately', () => {
  const expenses = [expense, { ...expense, id: 'm', type: 'Mercadería', amount: 30000 }, { ...expense, id: 'r', type: 'Retiro', amount: 5000 }, { ...expense, id: 'i', type: 'Inversión', amount: 7000 }, { ...expense, id: 'p', status: 'pendiente', amount: 4000 }, { ...expense, id: 'v', status: 'anulado', amount: 99999 }];
  const result = erp.erpSummary([sale, { ...sale, id: 'void', status: 'anulada' }], expenses);
  assert.equal(result.netProfit, 41804); assert.equal(result.cashFlow, 38600); assert.equal(result.payable, 4000); assert.equal(result.count, 1);
});
test('missing costs do not show a misleading net profit', () => {
  assert.equal(erp.erpSummary([{ ...sale, items: [{ ...sale.items[0], unitCost: null }] }], []).netProfit, null);
});
test('order import keeps discounts, shipping, original prices and stable identity', () => {
  const order = { id: 'order1', orderId: 'AURA-1', name: 'Cliente', phone: '', total: 90000, shippingCost: 12000, paymentMethod: 'pagopar', paidAt: Date.parse('2026-10-04T01:00:00Z'), items: [{ code: 'A', name: 'Perfume', size: '30 ML', quantity: 2, price: 50000 }] };
  const result = sales.orderToSale(order, sales.INITIAL_COSTS);
  assert.equal(result.id, 'web_order1'); assert.equal(result.discount, 10000); assert.equal(result.collected, 102000); assert.equal(result.date, '2026-10-03'); assert.equal(result.paymentMethod, 'Tarjeta'); assert.equal(sales.validateSale(result), null);
});
test('CSV places shared delivery and totals on only one line of a multi-item sale and escapes formulas', () => {
  const csv = sales.salesCsv([{ ...sale, customer: '=HYPERLINK("bad")', items: [...sale.items, { ...sale.items[0], code: 'DD001' }] }]);
  assert.ok(csv.includes("'=HYPERLINK")); const rows = csv.split('\r\n'); assert.equal(rows.length, 3);
  assert.equal((csv.match(/"12000"/g) || []).length, 1);
});
test('expenses require complete descriptions and integer guaranies', () => {
  assert.equal(erp.validateExpense(expense), null); assert.ok(erp.validateExpense({ ...expense, amount: 214.914 })); assert.ok(erp.validateExpense({ ...expense, date: '2026-02-30' }));
});
