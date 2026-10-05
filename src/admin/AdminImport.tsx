'use client';

import { useEffect, useMemo, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { parseSnapshot, prepareImport, sheetDate, type SheetSnapshot, type ImportRow } from '../lib/erpImport';
import { saleTotals, type Sale } from '../lib/sales';
import type { Expense } from '../lib/erp';
import { inputClass, money, primaryClass } from './ErpForms';

export default function AdminImport({ products, month, onImport, initialSnapshot, onLoadSnapshot }: {
  products: { id: string; name: string }[]; month: string;
  initialSnapshot?: SheetSnapshot;
  onLoadSnapshot?: () => Promise<SheetSnapshot | null>;
  onImport: (rows: ImportRow[], onProgress: (done: number) => void) => Promise<{ created: number; skipped: number }>;
}) {
  const [snapshot, setSnapshot] = useState<SheetSnapshot | null>(initialSnapshot || null);
  const [loadingSource, setLoadingSource] = useState(!!onLoadSnapshot && !initialSnapshot);
  const [scope, setScope] = useState(month); const [monthlyDates, setMonthlyDates] = useState(false); const [internet, setInternet] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [page, setPage] = useState(1); const [onlyErrors, setOnlyErrors] = useState(false);
  const [editing, setEditing] = useState<{ row: ImportRow; values: string[]; headers: string[]; offset: number } | null>(null);
  useEffect(() => {
    if (!onLoadSnapshot || initialSnapshot) return;
    let cancelled = false;
    onLoadSnapshot().then(source => {
      if (cancelled) return;
      if (source) { prepareImport(source, { month: 'all', monthlyExpenseDates: false, correctInternet: false }, []); setSnapshot(source); }
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar la copia preparada.'); })
      .finally(() => { if (!cancelled) setLoadingSource(false); });
    return () => { cancelled = true; };
  }, [onLoadSnapshot, initialSnapshot]);
  const rows = useMemo(() => snapshot ? prepareImport(snapshot, { month: scope, monthlyExpenseDates: monthlyDates, correctInternet: internet }, products) : [], [snapshot, scope, monthlyDates, internet, products]);
  const valid = rows.filter(row => row.record && !row.errors.length); const blocked = rows.filter(row => row.errors.length);
  const visible = onlyErrors ? blocked : rows;
  const revenue = valid.filter(row => row.kind === 'sale').reduce((sum, row) => sum + saleTotals(row.record as Sale).revenue, 0);
  const expenses = valid.filter(row => row.kind === 'expense').reduce((sum, row) => sum + (row.record as Expense).amount, 0);
  const resetReview = () => { setAcknowledged(false); setPage(1); setNotice(''); setError(''); setEditing(null); };
  const editRow = (row: ImportRow) => {
    const sheet = snapshot!.sheets.find(s => s.title === row.sheet)!;
    const offset = row.kind === 'sale' ? 0 : Number(row.key.split('_').pop());
    const headers = sheet.rows[row.kind === 'sale' ? 0 : 1].slice(offset, row.kind === 'sale' ? undefined : offset + 4).map(String);
    const values = headers.map((_, i) => {
      const value = sheet.rows[row.row - 1][offset + i];
      return i === 0 ? sheetDate(value) || (value == null ? '' : String(value)) : value == null ? '' : String(value);
    });
    setEditing({ row, headers, values, offset }); setAcknowledged(false);
  };
  const saveRevision = () => {
    if (!editing || !snapshot) return;
    const { row, values, headers, offset } = editing;
    const sheets = snapshot.sheets.map(sheet => sheet.title !== row.sheet ? sheet : { ...sheet, rows: sheet.rows.map((raw, index) => {
      if (index !== row.row - 1) return raw;
      const copy = [...raw]; values.forEach((value, i) => {
        const numeric = /^(ML|Cantidad|PV|Total|Delivery|Dif|Costo|Ganacia|MONTO)/i.test(headers[i]);
        copy[offset + i] = !value.trim() ? null : numeric && Number.isFinite(Number(value)) ? Number(value) : value;
      }); return copy;
    }) });
    setSnapshot({ ...snapshot, sheets }); setEditing(null); setAcknowledged(false);
  };
  const downloadCopy = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'aura-caja-copia-revisada.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const loadFile = async (file?: File) => {
    if (!file) return;
    resetReview(); setSnapshot(null);
    try { if (file.size > 5_000_000) throw new Error('El archivo supera 5 MB.'); const parsed = parseSnapshot(await file.text()); prepareImport(parsed, { month: scope, monthlyExpenseDates: monthlyDates, correctInternet: internet }, products); setSnapshot(parsed); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el archivo.'); }
  };
  const save = async () => {
    setBusy(true); setProgress(0); setError(''); setNotice('');
    try { const result = await onImport(valid, setProgress); setNotice(`${result.created} registros importados. ${result.skipped} ya existían y se conservaron. ${blocked.length} filas siguen pendientes de revisión. Elegí el mes correspondiente en Caja para ver sus resultados.`); setAcknowledged(false); }
    catch (e) { setError(`${e instanceof Error ? e.message : 'No se pudo completar la importación.'} Podés volver a intentar: los registros ya guardados no se duplican.`); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 border border-zinc-200 bg-white rounded-xl p-5 sm:p-6">
    <div><h3 className="font-luxury text-2xl font-semibold">Historial de AURA CAJA</h3><p className="mt-2 text-sm text-zinc-500">Revisá las filas antes de incorporarlas. Se conservan precios y costos históricos. La planilla original permanece intacta.</p></div>
    {loadingSource && <p role="status" className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 size={16} className="animate-spin" />Cargando la copia preparada de tu planilla…</p>}
    <details><summary className="text-xs text-aura-wine cursor-pointer">Usar otra copia del historial</summary><label className="block mt-3"><span className="block text-xs font-semibold mb-2">Cargar copia del historial (.json)</span><input aria-label="Copia del historial" type="file" accept=".json,application/json" disabled={busy || loadingSource} onChange={e => void loadFile(e.target.files?.[0])} className={inputClass} /><span className="block mt-2 text-xs text-zinc-500">Archivo preparado a partir de las pestañas de ventas y gastos. Los datos se guardan en la caja privada al confirmar.</span></label></details>
    {snapshot && <>
      <p className="text-xs text-zinc-500">{snapshot.title} · copia del {snapshot.readAt} · {snapshot.sheets.length} pestañas</p>
      <button type="button" className="text-xs text-aura-wine underline" onClick={downloadCopy} disabled={busy}>Descargar copia con las revisiones</button>
      <label className="block max-w-xs"><span className="block text-xs font-semibold mb-2">Meses que vas a importar</span><select aria-label="Meses a importar" className={inputClass} disabled={busy} value={scope} onChange={e => { setScope(e.target.value); resetReview(); }}><option value="all">Todo el historial</option>{Array.from({ length: 12 }, (_, i) => `${snapshot.readAt.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`).map(m => <option key={m} value={m}>{m}</option>)}</select></label>
      <fieldset disabled={busy} className="space-y-3 rounded-lg bg-aura-ivory p-4 text-xs"><legend className="font-semibold">Correcciones de gastos para revisar</legend>
        <label className="flex gap-2 items-start"><input type="checkbox" checked={internet} onChange={e => { setInternet(e.target.checked); resetReview(); }} /><span>El importe decimal 214.914 de CEL/INTERNET significa Gs. 214.914.</span></label>
        <label className="flex gap-2 items-start"><input type="checkbox" checked={monthlyDates} onChange={e => { setMonthlyDates(e.target.checked); resetReview(); }} /><span>Asignar al primer día del mes de cada pestaña los gastos sin fecha o con fecha de otro mes. Es una fecha administrativa; el día real no está confirmado.</span></label>
      </fieldset>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">{[['Listos para importar', String(valid.length)], ['Pendientes de revisión', String(blocked.length)], ['Ventas de productos', money(revenue)], ['Gastos y otros egresos', money(expenses)]].map(([label, value]) => <div key={label} className="border border-zinc-200 rounded-lg p-3"><p className="text-zinc-500">{label}</p><p className="font-semibold text-lg mt-2">{value}</p></div>)}</div>
      <p className="text-xs text-zinc-500">Cada fila de ventas se conserva como un registro separado; no se agrupan compras por cliente. Códigos fuera del catálogo quedan como históricos. Medios de pago y canales no informados figuran como “Otro”. Los importes de delivery se calculan como cobrado menos real.</p>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyErrors} disabled={busy} onChange={e => { setOnlyErrors(e.target.checked); setPage(1); }} /> Mostrar solamente filas pendientes</label>
      {editing && <div className="border border-aura-wine rounded-lg p-4 space-y-4"><h4 className="font-semibold text-sm">Revisar {editing.row.sheet} · fila {editing.row.row}</h4><p className="text-xs text-zinc-500">Esta corrección se aplica a la copia que vas a importar. No modifica Google Sheets ni registros ya importados. Los totales y la ganancia del ERP se calculan a partir de cantidad, precio, costo y delivery.</p><div className="grid sm:grid-cols-3 gap-3">{editing.headers.map((header, i) => <label key={i}><span className="block text-xs mb-1">{header}</span><input className={inputClass} aria-label={`Revisar ${header}`} value={editing.values[i]} placeholder={i === 0 ? 'AAAA-MM-DD' : ''} onChange={e => setEditing({ ...editing, values: editing.values.map((v, n) => n === i ? e.target.value : v) })} /></label>)}</div><div className="flex gap-3"><button className={primaryClass} onClick={saveRevision}>Aplicar a la copia</button><button onClick={() => setEditing(null)} className="text-xs">Cancelar revisión</button></div></div>}
      <div className="overflow-x-auto max-h-96 border border-zinc-200 rounded-lg"><table className="w-full text-left text-xs min-w-[700px]"><thead className="bg-zinc-50"><tr>{['Origen', 'Registro', 'Fecha', 'Importe', 'Revisión', ''].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{visible.slice((page - 1) * 25, page * 25).map(row => <tr key={row.key} className="border-t border-zinc-100"><td className="p-3 whitespace-nowrap">{row.sheet} · fila {row.row}</td><td className="p-3">{row.record ? row.kind === 'sale' ? (row.record as Sale).items[0].name : (row.record as Expense).description : row.kind === 'sale' ? 'Venta pendiente' : 'Gasto pendiente'}</td><td className="p-3 whitespace-nowrap">{row.record?.date || 'Por revisar'}</td><td className="p-3 whitespace-nowrap">{row.record ? money(row.kind === 'sale' ? saleTotals(row.record as Sale).revenue : (row.record as Expense).amount) : 'Por revisar'}</td><td className="p-3"><span className={row.errors.length ? 'text-red-700' : row.warnings.length ? 'text-amber-800' : 'text-emerald-700'}>{[...row.errors, ...row.warnings].join(' ') || 'Lista'}</span></td><td className="p-3"><button disabled={busy} className="text-aura-wine underline" onClick={() => editRow(row)}>Revisar</button></td></tr>)}</tbody></table></div>
      {visible.length > 25 && <div className="flex justify-between text-xs"><button disabled={busy || page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {Math.ceil(visible.length / 25)}</span><button disabled={busy || page * 25 >= visible.length} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
      <label className="flex gap-2 text-xs items-start"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={e => setAcknowledged(e.target.checked)} /><span>Revisé los importes y las observaciones. Quiero incorporar los {valid.length} registros listos; las {blocked.length} filas pendientes quedan afuera. Los registros ya importados se conservarán sin sobrescribirlos.</span></label>
      <button className={primaryClass} disabled={busy || !acknowledged || !valid.length} onClick={() => void save()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{busy ? `Guardando ${progress} de ${valid.length}` : 'Importar registros revisados'}</button>
    </>}
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg">{notice}</p>}
  </section>;
}
