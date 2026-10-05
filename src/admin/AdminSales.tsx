'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Pencil, Plus, Search, Wallet, BarChart3, Receipt, FlaskConical, AlertCircle } from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useSettings } from '../context/SettingsContext';
import type { Perfume } from '../types';
import { INITIAL_COSTS, paraguayDate, saleTotals, salesCsv, type Sale, type SaleSize } from '../lib/sales';
import { EXPENSE_TYPES, INITIAL_RECIPE, erpSummary, expensesCsv, type CostRecipe, type Expense } from '../lib/erp';
import { saveSale, saveExpense, saveCostRecipe, subscribeSales, subscribeExpenses, subscribeSaleCosts, subscribeCostRecipe, importLedger, loadImportSnapshot } from '../lib/salesService';
import { CostForm, ExpenseForm, SaleForm, inputClass, money, primaryClass, secondaryClass } from './ErpForms';
import AdminConversions from './AdminConversions';
import AdminImport from './AdminImport';
import type { ImportRow } from '../lib/erpImport';

export interface ErpPanelProps {
  sales: Sale[]; expenses: Expense[]; costs: Record<SaleSize, number>; recipe: CostRecipe;
  products: Perfume[]; prices: Record<SaleSize, number>; month: string; setMonth: (month: string) => void;
  loading: boolean; error: string;
  onSaveSale: (sale: Sale) => Promise<void>; onSaveExpense: (expense: Expense) => Promise<void>; onSaveRecipe: (recipe: CostRecipe) => Promise<void>;
  onImport?: (rows: ImportRow[], onProgress: (done: number) => void) => Promise<{ created: number; skipped: number }>;
}

function download(contents: string, name: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const statusStyle = (status: string) => ['pagada', 'pagado'].includes(status) ? 'bg-emerald-50 text-emerald-700' : status === 'pendiente' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500';
const shortDate = (date: string) => date.split('-').reverse().join('/');

export function ErpPanel(props: ErpPanelProps) {
  const { sales, expenses, costs, recipe, products, prices, month, setMonth, loading, error } = props;
  const [view, setView] = useState<'summary' | 'sales' | 'expenses' | 'costs' | 'import'>('summary');
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('todos'); const [type, setType] = useState('todos');
  const [page, setPage] = useState(1); const [saleForm, setSaleForm] = useState<Sale | null>(null); const [expenseForm, setExpenseForm] = useState<Expense | null>(null);
  const [message, setMessage] = useState(''); const [conversions, setConversions] = useState(false);
  const summary = useMemo(() => erpSummary(sales, expenses), [sales, expenses]);
  const text = query.toLocaleLowerCase().trim();
  const filteredSales = sales.filter((s) => status === 'todos' || s.status === status).filter((s) => !text || [s.customer, s.phone, s.id, s.sourceOrderCode, ...s.items.flatMap((i) => [i.code, i.name])].some((v) => v?.toLocaleLowerCase().includes(text)));
  const filteredExpenses = expenses.filter((e) => type === 'todos' || e.type === type).filter((e) => !text || [e.category, e.description, e.payee].some((v) => v.toLocaleLowerCase().includes(text)));
  const rows = view === 'expenses' ? filteredExpenses.length : filteredSales.length; const pages = Math.max(1, Math.ceil(rows / 25));
  useEffect(() => setPage(1), [month, query, status, type, view]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const selectedMonth = new Date(`${month}-15T12:00:00Z`).toLocaleDateString('es-PY', { month: 'long', year: 'numeric', timeZone: 'America/Asuncion' });
  const newSale = () => setSaleForm({ id: `VENTA-${crypto.randomUUID()}`, date: paraguayDate(), customer: '', phone: '', channel: 'WhatsApp', paymentMethod: 'Transferencia', status: 'pagada', discount: 0, deliveryCharged: 0, deliveryActual: 0, otherCosts: 0, collected: 0, notes: '', items: [{ code: '', name: '', size: '30 ML', quantity: 1, unitPrice: prices['30 ML'], unitCost: costs['30 ML'] }] });
  const newExpense = () => setExpenseForm({ id: `GASTO-${crypto.randomUUID()}`, date: paraguayDate(), type: 'Operativo', category: '', description: '', payee: '', amount: 0, paymentMethod: 'Transferencia', status: 'pagado', notes: '' });
  const saveWithNotice = async (kind: 'sale' | 'expense', data: Sale | Expense) => {
    if (kind === 'sale') await props.onSaveSale(data as Sale); else await props.onSaveExpense(data as Expense);
    setMessage(`${kind === 'sale' ? 'Venta guardada' : 'Gasto guardado'}. ${data.date.slice(0, 7) !== month ? `Registrado en ${data.date.slice(0, 7)}; cambiá el período para verlo.` : 'El resumen se actualiza automáticamente.'}`);
  };
  const ranking = useMemo(() => {
    const map = new Map<string, { name: string; units: number }>();
    for (const sale of sales.filter((s) => s.status !== 'anulada')) for (const item of sale.items) {
      const previous = map.get(item.code) || { name: item.name, units: 0 };
      map.set(item.code, { name: item.name, units: previous.units + item.quantity });
    }
    return [...map.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 5);
  }, [sales]);
  const breakdown = (title: string, values: [string, number | null][], note?: string) => <section className="bg-white rounded-xl border border-zinc-200 p-5"><h3 className="font-semibold text-sm">{title}</h3><div className="mt-4 divide-y divide-zinc-100 text-xs">{values.map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-3"><span className="text-zinc-500">{label}</span><strong className="tabular-nums whitespace-nowrap">{money(value)}</strong></div>)}</div>{note && <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">{note}</p>}</section>;
  return <div className="space-y-6">
    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
      <div><span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-aura-gold-deep">Administración del negocio</span><h2 className="text-3xl font-luxury font-semibold mt-1">Caja Äura</h2><p className="text-xs text-zinc-500 mt-1">Ventas, gastos y resultados en un solo lugar.</p></div>
      <div className="flex flex-wrap items-end gap-2"><label><span className="block text-[10px] text-zinc-500 mb-1">Período</span><input aria-label="Período de caja" type="month" value={month} min="2020-01" max="2100-12" onChange={(e) => { if (e.target.value) setMonth(e.target.value); }} className={`${inputClass} max-w-44`} /></label><button onClick={newExpense} disabled={loading || !!error} className={secondaryClass}><Plus size={15} /> Gasto</button><button onClick={newSale} disabled={loading || !!error} className={primaryClass}><Plus size={15} /> Nueva venta</button></div>
    </div>
    <nav className="inline-flex max-w-full overflow-x-auto gap-1 rounded-xl bg-zinc-100 p-1" aria-label="Secciones de caja">{([{ id: 'summary', label: 'Resumen', icon: BarChart3 }, { id: 'sales', label: 'Ventas', icon: Wallet }, { id: 'expenses', label: 'Gastos', icon: Receipt }, { id: 'costs', label: 'Costos', icon: FlaskConical }, ...(props.onImport ? [{ id: 'import' as const, label: 'Historial', icon: Download }] : [])] as const).map((item) => <button key={item.id} onClick={() => { setView(item.id); setQuery(''); }} aria-current={view === item.id ? 'page' : undefined} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold ${view === item.id ? 'bg-white text-aura-ink shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}><item.icon size={15} />{item.label}</button>)}</nav>
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex justify-between gap-3">{message}<button onClick={() => setMessage('')} aria-label="Cerrar aviso">×</button></div>}
    {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex gap-2"><AlertCircle size={18} className="shrink-0" />No se pudo cargar la caja. {error}</div>}
    {loading && !error && <div className="flex items-center gap-2 text-sm text-zinc-500 py-12 justify-center"><Loader2 size={18} className="animate-spin" />Cargando caja…</div>}
    {!loading && !error && view === 'summary' && <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
        { label: 'Ventas de productos', value: summary.revenue, hint: `${summary.count} ventas · ${summary.units} unidades` },
        { label: 'Cobrado', value: summary.collected, hint: `Por cobrar: ${money(summary.receivable)}` },
        { label: 'Gastos operativos', value: summary.operating, hint: 'Publicidad, servicios y funcionamiento' },
        { label: 'Ganancia neta', value: summary.netProfit, hint: 'Margen de ventas − gastos operativos', accent: true },
      ].map((card) => <section key={card.label} className={`rounded-xl border border-zinc-200 p-5 ${card.accent ? 'bg-aura-ink text-white border-aura-ink' : 'bg-white border-zinc-200'}`}><p className={`text-[10px] uppercase tracking-wider font-semibold ${card.accent ? 'text-white/50' : 'text-zinc-400'}`}>{card.label}</p><p className={`text-xl sm:text-2xl font-luxury font-semibold mt-3 tabular-nums ${card.accent ? 'text-aura-gold' : 'text-zinc-900'}`}>{money(card.value)}</p><p className={`text-[10px] mt-2 ${card.accent ? 'text-white/50' : 'text-zinc-500'}`}>{card.hint}</p></section>)}</div>
      {summary.missingCosts > 0 && <p className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">Hay {summary.missingCosts} ventas sin costo completo. Completalas para calcular la ganancia del período.</p>}
      <div className="grid lg:grid-cols-2 gap-5">
        {breakdown(`Resultado de ${selectedMonth}`, [['Ventas de productos (con descuentos)', summary.revenue], ['Costo de mercadería vendida', summary.productCost], ['Margen delivery (cobrado − real)', summary.deliveryMargin], ['Margen de ventas (incluye comisiones)', summary.grossProfit], ['Gastos operativos', summary.operating], ['Ganancia neta del período', summary.netProfit]])}
        {breakdown('Movimientos y flujo de caja', [['Compras de mercadería / insumos', summary.merchandise], ['Inversiones / equipamiento', summary.investment], ['Retiros de socios', summary.withdrawals], ['Gastos pendientes de pago', summary.payable], ['Flujo de caja del período', summary.cashFlow]], 'Flujo = cobros − delivery real − comisiones − gastos pagados. Es el movimiento del período, sin saldo inicial. Las compras de insumos no vuelven a descontarse de la ganancia, que ya incluye el costo vendido.')}
      </div>
      <div className="grid lg:grid-cols-2 gap-5"><section className="bg-white rounded-xl border border-zinc-200 p-5"><h3 className="font-semibold text-sm mb-4">Fragancias más vendidas</h3>{ranking.length ? <div className="space-y-4">{ranking.map(([code, item], index) => <div key={code} className="flex gap-3 items-center"><span className="w-7 h-7 rounded-full bg-aura-ivory text-aura-gold-deep text-xs flex justify-center items-center">{index + 1}</span><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{item.name}</p><p className="text-[10px] text-zinc-400">{code}</p></div><span className="text-xs font-semibold">{item.units} un.</span></div>)}</div> : <p className="text-xs text-zinc-400 py-5">Las fragancias aparecerán al registrar ventas.</p>}</section><section className="bg-white rounded-xl border border-zinc-200 p-5"><h3 className="font-semibold text-sm mb-3">Empezá a gestionar desde acá</h3><p className="text-xs text-zinc-500 leading-relaxed">Registrá ventas de WhatsApp, mostrador o mayoristas con sus precios reales. Los nuevos pedidos web entran automáticamente en caja cuando los confirmás en Pedidos. Revisá después el delivery y las comisiones.</p><div className="flex flex-wrap gap-2 mt-4"><button className={primaryClass} onClick={newSale}><Plus size={15} /> Registrar venta</button><button className={secondaryClass} onClick={newExpense}><Plus size={15} /> Registrar gasto</button></div><p className="text-[11px] text-zinc-400 mt-4">La caja muestra los registros guardados en el ERP. Podés revisar e incorporar la copia de Google Sheets en Historial.</p></section></div>
      <button className="text-xs text-zinc-500 underline" onClick={() => setConversions(!conversions)}>{conversions ? 'Cerrar conversiones de Meta' : 'Herramienta de conversiones de Meta'}</button>{conversions && <div className="bg-white border border-zinc-200 rounded-xl p-5"><p className="text-xs text-amber-800 mb-4">Solo envía conversiones a Meta, sin crear registros de caja. Evitá repetir conversiones de pedidos web ya confirmados.</p><AdminConversions /></div>}
    </>}
    {!loading && !error && (view === 'sales' || view === 'expenses') && <>
      <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center"><div><h3 className="font-luxury text-xl font-semibold">{view === 'sales' ? 'Registro de ventas' : 'Registro de gastos'}</h3><p className="text-xs text-zinc-400 mt-1">{rows} registros · {selectedMonth}</p></div><div className="flex flex-wrap gap-2"><div className="relative flex-1 min-w-40"><Search size={15} className="absolute top-3 left-3 text-zinc-400" /><input aria-label="Buscar en caja" className={`${inputClass} pl-9`} placeholder={view === 'sales' ? 'Cliente, fragancia, código…' : 'Categoría, proveedor, detalle…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>{view === 'sales' ? <select aria-label="Estado de ventas" className={`${inputClass} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos los estados</option><option value="pagada">Pagadas</option><option value="pendiente">Pendientes</option><option value="anulada">Anuladas</option></select> : <select aria-label="Tipo de gastos" className={`${inputClass} w-auto`} value={type} onChange={(e) => setType(e.target.value)}><option value="todos">Todos los tipos</option>{EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>}<button disabled={!rows} className={secondaryClass} onClick={() => download(view === 'sales' ? salesCsv(filteredSales) : expensesCsv(filteredExpenses), `aura-${view === 'sales' ? 'ventas' : 'gastos'}-${month}.csv`)}><Download size={15} /> Exportar</button></div></div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        {view === 'sales' ? <table className="w-full text-left min-w-[850px] text-xs"><thead className="bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-wider"><tr>{['Fecha / canal', 'Cliente / fragancias', 'Productos', 'Delivery', 'Costo total', 'Margen', 'Cobro / estado', ''].map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{filteredSales.slice((page - 1) * 25, page * 25).map((sale) => {
          const totals = saleTotals(sale);
          return <tr key={sale.id} className={`border-t hover:bg-zinc-50 ${sale.status === 'anulada' ? 'opacity-50' : ''}`}><td className="p-4 whitespace-nowrap"><span className="font-medium">{shortDate(sale.date)}</span><p className="text-[10px] text-zinc-400 mt-1">{sale.channel}</p>{sale.sourceOrderCode && <p className="text-[10px] text-blue-600 mt-1">{sale.sourceOrderCode}</p>}</td><td className="p-4"><p className="font-semibold">{sale.customer || 'Sin nombre'}</p><div className="mt-1 space-y-1">{sale.items.map((item, i) => <p key={i} className="text-[10px] text-zinc-500">{item.quantity} × {item.name} · {item.size}<span className="text-zinc-400"> · {item.code}</span></p>)}</div></td><td className="p-4 whitespace-nowrap tabular-nums">{money(totals.revenue)}</td><td className="p-4 whitespace-nowrap"><p className="tabular-nums">{money(sale.deliveryCharged)}</p><p className="text-[10px] text-zinc-400 mt-1">Real: {money(sale.deliveryActual)}</p></td><td className="p-4 whitespace-nowrap tabular-nums">{totals.costsComplete ? money(totals.productCost) : 'Por completar'}{sale.items.length === 1 && <p className="text-[10px] text-zinc-400 mt-1 font-normal">Unitario: {money(sale.items[0].unitCost)}</p>}</td><td className={`p-4 whitespace-nowrap font-semibold tabular-nums ${(totals.profit ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{money(totals.profit)}</td><td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-[10px] ${statusStyle(sale.status)}`}>{sale.status}</span><p className="text-[10px] text-zinc-500 mt-2">{money(sale.collected)} · {sale.paymentMethod}</p>{totals.balance > 0 && <p className="text-[10px] text-amber-700 mt-1">Saldo: {money(totals.balance)}</p>}</td><td className="p-4"><button aria-label={`Editar venta de ${sale.customer || sale.items[0]?.name}`} className="p-2 rounded-lg hover:bg-zinc-100" onClick={() => setSaleForm(sale)}><Pencil size={15} /></button></td></tr>;
        })}</tbody></table> : <table className="w-full text-left min-w-[650px] text-xs"><thead className="bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-wider"><tr>{['Fecha', 'Tipo / categoría', 'Detalle / proveedor', 'Monto', 'Estado', ''].map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{filteredExpenses.slice((page - 1) * 25, page * 25).map((expense) => <tr key={expense.id} className={`border-t hover:bg-zinc-50 ${expense.status === 'anulado' ? 'opacity-50' : ''}`}><td className="p-4 whitespace-nowrap">{shortDate(expense.date)}</td><td className="p-4"><p className="font-medium">{expense.type}</p><p className="text-[10px] text-zinc-400 mt-1">{expense.category}</p></td><td className="p-4"><p>{expense.description}</p><p className="text-[10px] text-zinc-400 mt-1">{expense.payee || '—'} · {expense.paymentMethod}</p></td><td className="p-4 font-semibold whitespace-nowrap tabular-nums">{money(expense.amount)}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-[10px] ${statusStyle(expense.status)}`}>{expense.status}</span></td><td className="p-4"><button aria-label={`Editar gasto ${expense.description}`} className="p-2 hover:bg-zinc-100 rounded-lg" onClick={() => setExpenseForm(expense)}><Pencil size={15} /></button></td></tr>)}</tbody></table>}
        {rows === 0 && <div className="text-center py-16 px-5"><Wallet size={28} className="text-zinc-300 mx-auto mb-3" /><p className="font-medium text-sm">{query ? 'No hay coincidencias' : `Todavía no hay ${view === 'sales' ? 'ventas' : 'gastos'} en este período`}</p><p className="text-xs text-zinc-400 mt-2">{query ? 'Probá con otro nombre o código.' : 'Registrá el primer movimiento o elegí otro mes.'}</p></div>}
      </div>
      {rows > 25 && <div className="flex justify-between items-center text-xs text-zinc-500"><span>Página {page} de {pages} · Exportar incluye todos los resultados</span><div className="flex gap-2"><button className={secondaryClass} disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><button className={secondaryClass} disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></div></div>}
    </>}
    {!loading && !error && view === 'costs' && <CostForm initial={recipe} onSave={props.onSaveRecipe} />}
    {!loading && !error && view === 'import' && props.onImport && <AdminImport products={products.map(p => ({ id: p.code, name: p.name }))} month={month} onImport={props.onImport} onLoadSnapshot={loadImportSnapshot} />}
    {saleForm && <SaleForm initial={saleForm} products={products} costs={costs} prices={prices} onClose={() => setSaleForm(null)} onSave={(sale) => saveWithNotice('sale', sale)} />}
    {expenseForm && <ExpenseForm initial={expenseForm} onClose={() => setExpenseForm(null)} onSave={(expense) => saveWithNotice('expense', expense)} />}
  </div>;
}

export default function AdminSales() {
  const { products } = useProducts(); const { settings } = useSettings();
  const [month, setMonth] = useState(paraguayDate().slice(0, 7)); const [sales, setSales] = useState<Sale[]>([]); const [expenses, setExpenses] = useState<Expense[]>([]);
  const [costs, setCosts] = useState(INITIAL_COSTS); const [recipe, setRecipe] = useState(INITIAL_RECIPE);
  const [loaded, setLoaded] = useState({ sales: false, expenses: false, costs: false, recipe: false }); const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false; const subscriptions: (() => void)[] = [];
    const fail = (e: Error) => { if (!cancelled) setError(e.message); };
    const ready = (key: keyof typeof loaded) => { if (!cancelled) setLoaded((l) => ({ ...l, [key]: true })); };
    setError(''); setLoaded({ sales: false, expenses: false, costs: false, recipe: false }); setSales([]); setExpenses([]);
    const [year, m] = month.split('-').map(Number); const from = `${month}-01`; const to = `${month}-${new Date(Date.UTC(year, m, 0)).getUTCDate()}`;
    const attach = async (promise: Promise<() => void>) => { try { const unsubscribe = await promise; if (cancelled) unsubscribe(); else subscriptions.push(unsubscribe); } catch (e) { fail(e instanceof Error ? e : new Error(String(e))); } };
    void attach(subscribeSales(from, to, (data) => { if (!cancelled) { setSales(data); ready('sales'); } }, fail));
    void attach(subscribeExpenses(from, to, (data) => { if (!cancelled) { setExpenses(data); ready('expenses'); } }, fail));
    void attach(subscribeSaleCosts((data) => { if (!cancelled) { setCosts(data); ready('costs'); } }, fail));
    void attach(subscribeCostRecipe((data) => { if (!cancelled) { setRecipe(data); ready('recipe'); } }, fail));
    return () => { cancelled = true; subscriptions.forEach((unsubscribe) => unsubscribe()); };
  }, [month]);
  return <ErpPanel sales={sales} expenses={expenses} costs={costs} recipe={recipe} products={products} prices={{ '10 ML': settings.price10, '30 ML': settings.price30, '50 ML': settings.price50 }} month={month} setMonth={setMonth} loading={!Object.values(loaded).every(Boolean)} error={error} onSaveSale={saveSale} onSaveExpense={saveExpense} onSaveRecipe={saveCostRecipe} onImport={importLedger} />;
}
