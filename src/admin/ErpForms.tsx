'use client';

import React, { useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import type { Perfume } from '../types';
import { PAYMENT_METHODS, SALE_CHANNELS, SALE_SIZES, saleTotals, validateSale, saleLineId, changeSaleSize, type Sale, type SaleItem, type SaleSize } from '../lib/sales';
import { EXPENSE_TYPES, INITIAL_RECIPE, recipeCost, validateExpense, type CostRecipe, type Expense } from '../lib/erp';

export const money = (n: number | null) => n == null ? 'Por completar' : `Gs. ${n.toLocaleString('es-PY')}`;
export const inputClass = 'w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aura-gold/30 focus:border-aura-gold';
export const primaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-aura-ink text-white px-4 py-2.5 text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed';
export const secondaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block min-w-0"><span className="block text-xs font-medium text-zinc-600 mb-1.5">{label}</span>{children}{hint && <span className="block text-[11px] text-zinc-400 mt-1">{hint}</span>}</label>;
}

export function MoneyInput({ value, onChange, label, optional = false }: { value: number | null; onChange: (n: number | null) => void; label: string; optional?: boolean }) {
  return <input aria-label={label} className={`${inputClass} tabular-nums`} type="number" min="0" step="1" inputMode="numeric" required={!optional} value={value == null || !Number.isFinite(value) ? '' : value} onChange={(e) => onChange(e.target.value === '' ? (optional ? null : NaN) : Number(e.target.value))} />;
}

function Modal({ title, close, children, busy }: { title: string; close: () => void; children: React.ReactNode; busy: boolean }) {
  const dialog = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close();
      if (e.key === 'Tab') {
        const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', key); };
  }, [busy, close]);
  return <div className="fixed inset-0 z-[1000] bg-black/55 flex justify-end" ref={dialog} role="dialog" aria-modal="true" aria-label={title}>
    <div className="w-full max-w-3xl bg-zinc-50 shadow-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 bg-white border-b px-5 sm:px-7 py-4 flex justify-between items-center"><h3 className="text-2xl font-luxury font-semibold">{title}</h3><button aria-label="Cerrar formulario" onClick={close} disabled={busy} className="p-2 rounded-lg hover:bg-zinc-100"><X size={20} /></button></header>
      {children}
    </div>
  </div>;
}

export function SaleForm({ initial, products, costs, prices, onSave, onClose }: {
  initial: Sale; products: Perfume[]; costs: Record<SaleSize, number>; prices: Record<SaleSize, number>;
  onSave: (sale: Sale) => Promise<void>; onClose: () => void;
}) {
  const [sale, setSale] = useState<Sale>(() => ({ ...initial, items: initial.items.map((item, i) => ({ ...item, lineId: saleLineId(item, i) })) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = saleTotals(sale);
  const patch = (fields: Partial<Sale>) => setSale((s) => ({ ...s, ...fields }));
  const patchItem = (index: number, fields: Partial<SaleItem>) => setSale((s) => ({ ...s, items: s.items.map((item, i) => i === index ? { ...item, ...fields } : item) }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = { ...sale, collected: sale.status === 'pagada' ? totals.total : sale.collected };
    const issue = validateSale(data);
    if (issue) { setError(issue); return; }
    setBusy(true); setError('');
    try { await onSave(data); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la venta.'); }
    finally { setBusy(false); }
  };
  return <Modal title={initial.updatedAt ? 'Editar venta' : 'Registrar venta'} close={onClose} busy={busy}>
    <form onSubmit={submit} className="p-5 sm:p-7 space-y-6">
      {sale.sourceOrderCode && <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Pedido {sale.sourceOrderCode}. Los cambios de caja no modifican el pedido ni vuelven a enviar la conversión a Meta.</p>}
      <section className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 grid grid-cols-2 gap-4">
        <Field label="Fecha"><input className={inputClass} type="date" required value={sale.date} onChange={(e) => patch({ date: e.target.value })} /></Field>
        <Field label="Estado"><select className={inputClass} value={sale.status} onChange={(e) => patch({ status: e.target.value as Sale['status'] })}><option value="pagada">Pagada</option><option value="pendiente">Pendiente / cobro parcial</option><option value="anulada">Anulada</option></select></Field>
        <Field label="Cliente"><input className={inputClass} autoFocus maxLength={120} value={sale.customer} onChange={(e) => patch({ customer: e.target.value })} placeholder="Nombre del cliente" /></Field>
        <Field label="Teléfono"><input className={inputClass} type="tel" maxLength={40} value={sale.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="0981…" /></Field>
        <Field label="Canal"><select className={inputClass} value={sale.channel} onChange={(e) => patch({ channel: e.target.value as Sale['channel'] })}>{SALE_CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Forma de pago"><select className={inputClass} value={sale.paymentMethod} onChange={(e) => patch({ paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Fragancias de la venta</h4><span className="text-xs text-zinc-500">{totals.units} unidades</span></div>
        <datalist id="erp-products">{products.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</datalist>
        <p className="rounded-lg bg-aura-ivory p-3 text-xs text-zinc-600">Costo automático por presentación, parametrizado en Costos. En una venta guardada se conserva el costo histórico; cambiar cliente, precio, cantidad o delivery no modifica el costo unitario. Una presentación distinta utiliza el costo actual.</p>
        {sale.items.map((item, index) => <div key={item.lineId} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Fragancia {index + 1}</span><button type="button" aria-label={`Quitar fragancia ${index + 1}`} disabled={sale.items.length === 1} onClick={() => patch({ items: sale.items.filter((_, i) => i !== index) })} className="p-1 text-zinc-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={16} /></button></div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Código"><input className={inputClass} required maxLength={60} list="erp-products" value={item.code} onChange={(e) => { const code = e.target.value.toUpperCase(); const product = products.find((p) => p.code === code); patchItem(index, { code, ...(product ? { name: product.name } : {}) }); }} placeholder="CC034" /></Field>
            <div className="col-span-2"><Field label="Fragancia"><input className={inputClass} required maxLength={200} value={item.name} onChange={(e) => patchItem(index, { name: e.target.value })} placeholder="Nombre de la fragancia" /></Field></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Presentación"><select className={inputClass} value={item.size} onChange={(e) => { const size = e.target.value as SaleSize; const original = initial.updatedAt ? initial.items.find((line, i) => saleLineId(line, i) === item.lineId) : undefined; patchItem(index, changeSaleSize(item, size, costs, prices, original)); }}>{SALE_SIZES.map((size) => <option key={size}>{size}</option>)}</select></Field>
            <Field label="Cantidad"><input className={inputClass} required type="number" min={1} max={10000} step={1} value={item.quantity} onChange={(e) => patchItem(index, { quantity: Number(e.target.value) })} /></Field>
            <Field label="Precio unitario (Gs.)"><MoneyInput label={`Precio fragancia ${index + 1}`} value={item.unitPrice} onChange={(n) => patchItem(index, { unitPrice: n })} /></Field>
            <Field label="Costo unitario automático (Gs.)" hint={initial.updatedAt && initial.items.some((line, i) => saleLineId(line, i) === item.lineId && line.size === item.size) ? "Costo histórico conservado." : "Parametrizado en Costos."}><input aria-label={`Costo fragancia ${index + 1}`} className={`${inputClass} bg-zinc-100 tabular-nums`} readOnly value={money(item.unitCost)} /></Field>
          </div>
          <p className="text-xs text-right text-zinc-500">Importe: <strong className="text-zinc-900">{money(item.unitPrice * item.quantity)}</strong></p>
        </div>)}
        <button type="button" disabled={sale.items.length >= 50} className={`${secondaryClass} w-full`} onClick={() => patch({ items: [...sale.items, { lineId: crypto.randomUUID(), code: '', name: '', size: '30 ML', quantity: 1, unitPrice: prices['30 ML'], unitCost: costs['30 ML'] }] })}><Plus size={15} /> Agregar fragancia</button>
      </section>
      <section className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 grid grid-cols-2 gap-4">
        <Field label="Descuento de la venta (Gs.)"><MoneyInput label="Descuento" value={sale.discount} onChange={(n) => patch({ discount: n })} /></Field>
        <Field label="Comisiones / otros costos (Gs.)"><MoneyInput label="Otros costos" value={sale.otherCosts} onChange={(n) => patch({ otherCosts: n })} /></Field>
        <Field label="Delivery cobrado al cliente (Gs.)"><MoneyInput label="Delivery cobrado" value={sale.deliveryCharged} onChange={(n) => patch({ deliveryCharged: n })} /></Field>
        <Field label="Delivery pagado al repartidor (Gs.)"><MoneyInput label="Delivery real" value={sale.deliveryActual} onChange={(n) => patch({ deliveryActual: n })} /></Field>
        {sale.status === 'pendiente' && <Field label="Cobrado hasta ahora (Gs.)"><MoneyInput label="Cobrado" value={sale.collected} onChange={(n) => patch({ collected: n })} /></Field>}
        <div className="col-span-2"><Field label="Notas"><textarea className={inputClass} maxLength={2000} rows={2} value={sale.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field></div>
      </section>
      <section className="rounded-xl bg-aura-ink text-white p-5 grid grid-cols-2 gap-4">
        <div><p className="text-xs text-white/50">Total a cobrar</p><p className="text-2xl font-luxury mt-1">{money(totals.total)}</p></div>
        <div><p className="text-xs text-white/50">Margen de la venta</p><p className="text-2xl font-luxury text-aura-gold mt-1">{money(totals.profit)}</p></div>
        <p className="col-span-2 text-[11px] text-white/50">Productos − descuento − costo + delivery cobrado − delivery real − comisiones. Los gastos operativos se descuentan en el resumen.</p>
      </section>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className={secondaryClass}>Cancelar</button><button disabled={busy} className={primaryClass}>{busy && <Loader2 size={15} className="animate-spin" />} {busy ? 'Guardando…' : 'Guardar venta'}</button></div>
    </form>
  </Modal>;
}

export function ExpenseForm({ initial, onSave, onClose }: { initial: Expense; onSave: (expense: Expense) => Promise<void>; onClose: () => void }) {
  const [expense, setExpense] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const patch = (fields: Partial<Expense>) => setExpense((e) => ({ ...e, ...fields }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const issue = validateExpense(expense);
    if (issue) { setError(issue); return; }
    setBusy(true); setError('');
    try { await onSave(expense); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el gasto.'); }
    finally { setBusy(false); }
  };
  return <Modal title={initial.updatedAt ? 'Editar gasto' : 'Registrar gasto'} close={onClose} busy={busy}>
    <form onSubmit={submit} className="p-5 sm:p-7 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha"><input className={inputClass} required type="date" value={expense.date} onChange={(e) => patch({ date: e.target.value })} /></Field>
        <Field label="Tipo"><select className={inputClass} value={expense.type} onChange={(e) => patch({ type: e.target.value as Expense['type'] })}>{EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Categoría"><input autoFocus className={inputClass} list="erp-expense-categories" required maxLength={100} value={expense.category} onChange={(e) => patch({ category: e.target.value })} placeholder="Publicidad, Internet…" /></Field>
        <Field label="Proveedor / socio"><input className={inputClass} maxLength={120} value={expense.payee} onChange={(e) => patch({ payee: e.target.value })} placeholder="Nombre" /></Field>
        <div className="col-span-2"><Field label="Detalle"><input className={inputClass} required maxLength={300} value={expense.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Pauta de Instagram de octubre" /></Field></div>
        <Field label="Monto (Gs.)"><MoneyInput label="Monto del gasto" value={expense.amount} onChange={(n) => patch({ amount: n })} /></Field>
        <Field label="Estado"><select className={inputClass} value={expense.status} onChange={(e) => patch({ status: e.target.value as Expense['status'] })}><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="anulado">Anulado</option></select></Field>
        <Field label="Forma de pago"><select className={inputClass} value={expense.paymentMethod} onChange={(e) => patch({ paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <div className="col-span-2"><Field label="Notas"><textarea className={inputClass} rows={3} maxLength={2000} value={expense.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field></div>
      </div>
      <datalist id="erp-expense-categories">{['Publicidad', 'Celular / Internet', 'Movilidad', 'Impuestos', 'Insumos', 'Envases', 'Packaging', 'Equipamiento', 'Dividendos', 'Otros'].map((c) => <option key={c}>{c}</option>)}</datalist>
      <p className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">Los gastos operativos reducen la ganancia del período. Las compras de mercadería, inversiones y retiros se registran por separado en el flujo de caja, para no descontar dos veces el costo de los perfumes.</p>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" className={secondaryClass} disabled={busy} onClick={onClose}>Cancelar</button><button className={primaryClass} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Guardar gasto</button></div>
    </form>
  </Modal>;
}

export function CostForm({ initial = INITIAL_RECIPE, onSave }: { initial?: CostRecipe; onSave: (recipe: CostRecipe) => Promise<void> }) {
  const [recipe, setRecipe] = useState<CostRecipe>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dirty = React.useRef(false);
  React.useEffect(() => { if (!dirty.current) setRecipe(initial); }, [initial]);
  const patch = (fields: Partial<CostRecipe>) => { dirty.current = true; setRecipe((r) => ({ ...r, ...fields })); setMessage(''); };
  return <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMessage(''); try { await onSave(recipe); dirty.current = false; setMessage('Costos guardados. Se usarán en las próximas ventas; el historial conserva sus costos.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); } finally { setBusy(false); } }} className="space-y-5">
    <div><h3 className="text-xl font-luxury font-semibold">Costos por presentación</h3><p className="text-xs text-zinc-500 mt-1">Receta y packaging de la pestaña COSTOS de AURA CAJA. Los precios de venta de la tienda se gestionan en Configuración.</p></div>
    <div className="bg-white border border-zinc-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
      {([['essencePercent', 'Esencia (%)'], ['fixativePercent', 'Fijador (%)'], ['essenceRate', 'Esencia (Gs./gr)'], ['fixativeRate', 'Fijador (Gs./gr)'], ['alcoholRate', 'Alcohol (Gs./ml)']] as const).map(([key, label]) => <Field key={key} label={label}><input className={inputClass} type="number" min={0} max={key.includes('Percent') ? 100 : 1e9} step="any" required value={recipe[key]} onChange={(e) => patch({ [key]: Number(e.target.value) })} /></Field>)}
    </div>
    <div className="grid sm:grid-cols-3 gap-4">{SALE_SIZES.map((size) => {
      const cost = recipeCost(recipe, size);
      return <section key={size} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center"><h4 className="text-xl font-luxury">{size}</h4><span className="text-sm font-bold text-aura-gold-deep">{money(cost.total)}</span></div>
        <p className="text-[11px] text-zinc-500">Esencia {cost.essence.toLocaleString('es-PY')} gr · fijador {cost.fixative.toLocaleString('es-PY')} gr · alcohol {cost.alcohol.toLocaleString('es-PY')} ml</p>
        {([['bottle', 'Frasco'], ['box', 'Caja'], ['bag', 'Bolsa'], ['label', 'Etiqueta'], ['largeLabel', 'Etiqueta grande'], ['other', 'Varios']] as const).map(([key, label]) => <Field key={key} label={`${label} (Gs.)`}><MoneyInput label={`${label} ${size}`} value={recipe.packaging[size][key]} onChange={(n) => patch({ packaging: { ...recipe.packaging, [size]: { ...recipe.packaging[size], [key]: n } } })} /></Field>)}
        <div className="border-t border-zinc-200 pt-3 flex justify-between text-xs text-zinc-500"><span>Líquido: {money(cost.liquid)}</span><span>Packaging: {money(cost.packaging)}</span></div>
      </section>;
    })}</div>
    {message && <p role="status" className="rounded-lg bg-amber-50 text-amber-900 text-sm p-3">{message}</p>}
    <button className={primaryClass} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Guardar costos</button>
  </form>;
}
