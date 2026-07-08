'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

/**
 * Cierre del loop de venta. Cuando el vendedor confirma el pago en WhatsApp,
 * registra acá la venta y se dispara el Purchase REAL por Conversions API
 * (con event_id propio para dedup). Esto le enseña a Meta/Google a buscar
 * gente que COMPRA, no que solo abre el chat.
 */
const AdminSales: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [codes, setCodes] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const submit = async () => {
    const value = parseInt(amount.replace(/\D/g, ''), 10);
    if (!value || value <= 0) {
      setResult({ ok: false, msg: 'Ingresá un monto válido en guaraníes.' });
      return;
    }
    setSending(true);
    setResult(null);
    const orderId = `AURA-${Date.now().toString(36).toUpperCase()}`;
    const contentIds = codes.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    try {
      const res = await fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'Purchase',
          eventId: orderId,
          value,
          currency: 'PYG',
          contentIds: contentIds.length ? contentIds : undefined,
          numItems: contentIds.length || undefined,
          userData: { phone: phone || undefined, firstName: name || undefined },
          actionSource: 'website',
        }),
      });
      const json = await res.json();
      if (json.skipped) {
        setResult({ ok: false, msg: 'Falta configurar META_CAPI_TOKEN en Vercel para enviar la conversión.' });
      } else if (json.ok) {
        setResult({ ok: true, msg: `✓ Purchase enviado a Meta (${orderId}) por Gs. ${value.toLocaleString('es-PY')}.` });
        setAmount(''); setPhone(''); setName(''); setCodes('');
      } else {
        setResult({ ok: false, msg: `Meta rechazó el evento: ${JSON.stringify(json.meta?.error || json).slice(0, 160)}` });
      }
    } catch (e) {
      setResult({ ok: false, msg: 'Error de red: ' + String(e) });
    } finally {
      setSending(false);
    }
  };

  const inputCls = 'w-full border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink transition-colors';
  const labelCls = 'block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-1.5';

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-luxury font-semibold text-aura-ink mb-1">Confirmar venta</h2>
      <p className="text-[12px] text-zinc-500 mb-6 leading-relaxed">
        Usá esto cuando el cliente ya <strong>pagó</strong> (transferencia/QR confirmada por WhatsApp).
        Envía el <strong>Purchase real</strong> a Meta para que las pautas optimicen a ventas de verdad.
        El teléfono mejora el match (se hashea, nunca se guarda en texto).
      </p>

      <div className="bg-white border border-zinc-100 p-6 space-y-5">
        <div>
          <label className={labelCls}>Monto total pagado (Gs.) *</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="180000" inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Teléfono del cliente</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="0981 123 456" />
          </div>
          <div>
            <label className={labelCls}>Nombre (opcional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Juan" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Códigos de productos (opcional, separados por coma)</label>
          <input value={codes} onChange={(e) => setCodes(e.target.value)} className={inputCls} placeholder="CC034, DD192" />
        </div>

        <button
          onClick={submit}
          disabled={sending}
          className="w-full inline-flex items-center justify-center gap-2 bg-aura-ink text-white py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-aura-gold transition-colors disabled:opacity-60"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {sending ? 'Enviando…' : 'Confirmar venta y enviar a Meta'}
        </button>

        {result && (
          <div className={`flex items-start gap-2 p-3 text-[12px] ${result.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
            {result.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
            <span>{result.msg}</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-zinc-400 mt-4 leading-relaxed">
        Nota: para atribuir la venta a la conversación exacta de Click-to-WhatsApp hace falta migrar a la
        WhatsApp Cloud API (proyecto aparte). Por ahora, esto ya envía la compra confirmada con el mejor
        match posible (teléfono hasheado).
      </p>
    </div>
  );
};

export default AdminSales;
