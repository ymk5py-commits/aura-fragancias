'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Gift, Search } from 'lucide-react';
import { giftCardState, type GiftCard } from '../lib/giftCards';
import { redeemGiftCard, subscribeGiftCards, subscribeGiftCardUses } from '../lib/giftCardsService';
import { downloadGiftCard } from '../lib/giftCardVoucher';

const money = (amount: number) => `Gs. ${amount.toLocaleString('es-PY')}`;
const date = (timestamp: number) => new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
const input = 'w-full border border-zinc-200 bg-white px-3 py-3 text-sm focus:outline-aura-wine';

export default function AdminGiftCards() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [uses, setUses] = useState<{ id: string; amount: number; reference: string; createdAt?: { seconds: number } }[]>([]);
  const operation = useRef({ signature: '', id: '' });
  const card = cards.find(item => item.id === selected);

  useEffect(() => {
    let active = true; let unsubscribe = () => {};
    subscribeGiftCards(list => { if (active) { setCards(list); setLoading(false); } }, issue => { if (active) { setError(issue.message); setLoading(false); } }).then(fn => { if (active) unsubscribe = fn; else fn(); }).catch(issue => { setError(issue.message); setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    setUses([]); if (!selected) return;
    let active = true; let unsubscribe = () => {};
    subscribeGiftCardUses(selected, rows => { if (active) setUses(rows); }, issue => { if (active) setError(issue.message); }).then(fn => { if (active) unsubscribe = fn; else fn(); }).catch(issue => setError(issue.message));
    return () => { active = false; unsubscribe(); };
  }, [selected]);

  const matching = cards.filter(item => [item.code, item.customer, item.recipient, item.orderCode].some(value => value.toLocaleLowerCase('es-PY').includes(query.toLocaleLowerCase('es-PY'))));
  const activeBalance = cards.filter(item => giftCardState(item) === 'Activa').reduce((sum, item) => sum + item.balance, 0);

  return <div className="space-y-6">
    <div><p className="eyebrow text-aura-wine">Regalos Äura</p><h2 className="mt-2 font-luxury text-3xl font-semibold tracking-tight">Gift Cards</h2><p className="mt-2 text-sm text-zinc-600">Se emiten al confirmar el pago en Pedidos. Mínimo Gs. 100.000 · vigencia de 60 días. Descargá la tarjeta para enviarla al comprador y registrá cada canje.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{[['Tarjetas emitidas', String(cards.length)], ['Importe emitido', money(cards.reduce((sum, item) => sum + item.amount, 0))], ['Saldo activo por canjear', money(activeBalance)]].map(([label, value]) => <div key={label} className="border border-zinc-200 bg-white p-5"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}</div>
    <p className="border-l-2 border-aura-wine bg-aura-ivory px-4 py-3 text-xs leading-relaxed text-zinc-600">El cobro de Gift Cards se muestra aquí por separado: no suma unidades ni margen de perfumes en Caja / ERP. Al canjear, registrá la venta de los perfumes en Caja y usá su número como referencia del canje para conservar los costos reales.</p>
    {error && <p role="alert" className="bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <label className="relative block max-w-lg"><span className="sr-only">Buscar Gift Card</span><Search size={16} className="absolute left-3 top-4 text-zinc-400"/><input className={`${input} pl-9`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Código, destinatario, cliente o pedido" /></label>
    <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white">{loading ? <p className="p-6 text-sm">Cargando Gift Cards…</p> : matching.length === 0 ? <div className="p-8 text-center text-zinc-500"><Gift className="mx-auto mb-3"/><p className="text-sm">Las tarjetas aparecerán al confirmar el primer pedido de Gift Card.</p></div> : matching.map(item => <button type="button" key={item.id} onClick={() => { setSelected(item.id); setAmount(''); setReference(''); setNotice(''); setError(''); }} className={`block w-full p-5 text-left ${selected === item.id ? 'bg-aura-ivory' : 'hover:bg-zinc-50'}`}><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{item.recipient || item.customer}</span><span className="text-xs text-aura-wine">{giftCardState(item)}</span></span><span className="mt-2 block text-xs text-zinc-500">{item.orderCode} · {money(item.amount)}</span><span className="mt-2 block text-sm font-semibold">Saldo: {money(item.balance)}</span><span className="mt-1 block text-xs text-zinc-500">Vence: {date(item.expiresAt)}</span></button>)}</div>
      {card && <section className="space-y-5 border border-zinc-200 bg-white p-5 sm:p-7">
        <img src="/brand/aura-wordmark-burgundy.svg" alt="Äura" width={150} height={50}/>
        <h3 className="font-luxury text-2xl font-semibold">{money(card.amount)} · Gift Card</h3>
        <p className="text-sm">Para: {card.recipient || 'A definir'}<br/>De: {card.sender || card.customer}</p>
        {card.message && <p className="whitespace-pre-wrap text-sm italic text-zinc-500">{card.message}</p>}
        <div className="bg-aura-ivory p-4"><p className="mb-2 text-xs text-zinc-500">Código de canje · {giftCardState(card)}</p><p className="break-all font-mono text-sm">{card.code}</p><p className="mt-3 text-xs">Activada: {date(card.activatedAt)}<br/>Vence: {date(card.expiresAt)} (hora Paraguay)</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" className="inline-flex min-h-11 items-center gap-2 border border-zinc-200 px-3 text-xs" onClick={() => navigator.clipboard.writeText(card.code).then(() => setNotice('Código copiado.')).catch(() => setError('No se pudo copiar. Seleccioná el código para copiarlo.'))}><Copy size={14}/> Copiar código</button><button type="button" className="inline-flex min-h-11 items-center gap-2 bg-aura-wine px-3 text-xs text-white" onClick={() => downloadGiftCard(card).catch(() => setError('No se pudo descargar la tarjeta.'))}><Download size={14}/> Descargar tarjeta PNG</button></div>
        <form className="space-y-3 border-t border-zinc-200 pt-5" onSubmit={async e => {
          e.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice('');
          const signature = `${card.id}|${amount}|${reference}`;
          if (operation.current.signature !== signature) operation.current = { signature, id: crypto.randomUUID() };
          try { await redeemGiftCard(card.id, Number(amount), reference, operation.current.id); setAmount(''); setReference(''); operation.current = { signature: '', id: '' }; setNotice('Canje registrado. El saldo se actualizó automáticamente.'); }
          catch (issue) { setError(issue instanceof Error ? issue.message : 'No se pudo registrar el canje.'); }
          finally { setBusy(false); }
        }}><h4 className="text-sm font-semibold">Registrar un canje</h4><p className="text-xs text-zinc-500">Saldo disponible: {money(card.balance)}. Comprobá el código y registrá la venta de perfumes en Caja antes del canje.</p><label className="block text-xs">Importe a utilizar (Gs.)<input className={`${input} mt-2`} type="number" min={1} max={card.balance || 1} step={1} required value={amount} onChange={e => setAmount(e.target.value)}/></label><label className="block text-xs">Número de venta o pedido<input className={`${input} mt-2`} required maxLength={200} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej: VENTA-…"/></label><button disabled={busy || giftCardState(card) !== 'Activa'} className="min-h-11 bg-aura-ink px-4 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Guardando…' : 'Registrar canje'}</button></form>
        <div className="border-t border-zinc-200 pt-4"><h4 className="mb-3 text-sm font-semibold">Historial de canjes</h4>{uses.length ? [...uses].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(use => <p key={use.id} className="mb-3 text-xs">{money(use.amount)} · {use.reference}<span className="block text-zinc-500">{use.createdAt ? date(use.createdAt.seconds * 1000) : 'Guardando fecha…'}</span></p>) : <p className="text-xs text-zinc-500">Sin canjes registrados.</p>}</div>
      </section>}
    </div>
  </div>;
}
