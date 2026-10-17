'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Gift, Check, CalendarDays, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { GIFT_CARD_PRODUCT, GIFT_CARD_IMAGE, GIFT_CARD_MIN, GIFT_CARD_MAX, GIFT_CARD_DAYS, validateGiftCardAmount } from '../lib/giftCards';
import smartImageLoader from '../lib/imageLoader';
import { trackProductView } from '../lib/productEvents';

export default function GiftCardProduct() {
  const { addGiftCard } = useCart();
  const trackedView = useRef(false);
  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    trackProductView(GIFT_CARD_PRODUCT, GIFT_CARD_MIN, 'Digital');
  }, []);
  const [amount, setAmount] = useState('100000');
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const value = Number(amount);
  const money = (n: number) => `Gs. ${n.toLocaleString('es-PY')}`;
  const input = 'w-full border border-aura-ink/20 bg-white px-4 py-3 text-sm focus:outline-2 focus:outline-aura-wine';

  return <main className="bg-aura-ivory pt-[104px] lg:pt-[98px]">
    <div className="section-shell grid gap-9 py-8 sm:py-14 lg:grid-cols-2 lg:gap-20">
      <div className="relative aspect-[4/5] max-h-[680px] overflow-hidden bg-aura-sand">
        <Image src={GIFT_CARD_IMAGE} alt="Gift Card Äura con el logo oficial y una cinta bordó" fill priority sizes="(min-width:1024px) 45vw, 100vw" loader={smartImageLoader} className="object-cover" />
        <span className="absolute bottom-5 left-5 bg-aura-ivory/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-aura-wine">Un regalo para elegir</span>
      </div>
      <div className="self-center">
        <p className="eyebrow mb-4 text-aura-wine">Äura / regalos</p>
        <h1 className="font-luxury text-5xl font-semibold leading-none tracking-[-0.055em] text-aura-wine sm:text-6xl">Gift Card Äura</h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-aura-ink/70">Vos elegís el monto. Esa persona, su próxima fragancia. Un detalle personal para regalar la libertad de elegir.</p>
        <form className="mt-7 space-y-5" onSubmit={event => {
          event.preventDefault();
          const issue = validateGiftCardAmount(value);
          if (issue) { setError(issue); return; }
          setError(''); addGiftCard(value, { recipient, sender, message });
        }}>
          <fieldset>
            <legend className="mb-3 text-xs font-semibold uppercase tracking-widest">Elegí un importe</legend>
            <div className="grid grid-cols-3 gap-2">
              {[100000, 200000, 300000].map(n => <button key={n} type="button" aria-pressed={value === n} onClick={() => { setAmount(String(n)); setError(''); }} className={`min-h-12 border px-2 text-xs font-semibold ${value === n ? 'border-aura-wine bg-aura-wine text-white' : 'border-aura-ink/20 bg-white text-aura-ink'}`}>{money(n)}</button>)}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold">O ingresá un monto personalizado (Gs.)
            <input className={`${input} mt-2`} type="number" inputMode="numeric" min={GIFT_CARD_MIN} max={GIFT_CARD_MAX} step={1} required value={amount} onChange={event => { setAmount(event.target.value); setError(''); }} aria-describedby="gift-card-conditions" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Para <span className="font-normal text-zinc-500">(opcional)</span><input className={`${input} mt-2`} value={recipient} onChange={e => setRecipient(e.target.value)} maxLength={80} placeholder="Nombre de quien recibe" /></label>
            <label className="block text-sm font-semibold">De <span className="font-normal text-zinc-500">(opcional)</span><input className={`${input} mt-2`} value={sender} onChange={e => setSender(e.target.value)} maxLength={80} placeholder="Tu nombre" /></label>
          </div>
          <label className="block text-sm font-semibold">Tu dedicatoria <span className="font-normal text-zinc-500">(opcional)</span><textarea className={`${input} mt-2 resize-none`} rows={2} maxLength={300} value={message} onChange={e => setMessage(e.target.value)} placeholder="Unas palabras para acompañar el regalo…" /></label>
          <p id="gift-card-conditions" className="text-xs leading-relaxed text-aura-ink/70">Mínimo Gs. 100.000. Vigencia: {GIFT_CARD_DAYS} días desde la confirmación del pago. Recibís un PDF por WhatsApp, sin costo de envío. Los cupones de descuento no aplican a Gift Cards.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="flex min-h-14 w-full items-center justify-between bg-aura-wine px-5 text-sm font-semibold text-white transition-colors hover:bg-aura-ink"><span className="flex items-center gap-2"><Gift size={18} /> Agregar Gift Card</span><span className="flex items-center gap-2">{value > 0 ? money(value) : ''}<ArrowUpRight size={18} /></span></button>
        </form>
        <div className="mt-7 grid gap-3 border-t border-aura-ink/15 pt-5 text-xs text-aura-ink/70">
          <p className="flex items-center gap-2"><Check size={15} /> Comprala con los medios de pago de la tienda.</p>
          <p className="flex items-center gap-2"><CalendarDays size={15} /> Recibí el código y la fecha exacta de vencimiento al activarla.</p>
          <p className="flex items-center gap-2"><MessageCircle size={15} /> Para canjear, escribinos por WhatsApp con el código y las fragancias elegidas.</p>
        </div>
      </div>
    </div>
    <section className="section-shell pb-16">
      <h2 className="mb-6 font-luxury text-3xl font-semibold tracking-tight text-aura-wine">Así se regala Äura</h2>
      <div className="grid gap-6 border-t border-aura-ink/15 pt-6 sm:grid-cols-3">{[
        ['01', 'Personalizá el regalo', 'Elegí desde Gs. 100.000 y sumá el nombre y una dedicatoria.'],
        ['02', 'Completá la compra', 'Una vez verificado el pago, te enviamos la Gift Card en PDF al WhatsApp que indicás al comprar. Podés reenviarla a la persona que recibe el regalo.'],
        ['03', 'Elegí la próxima fragancia', 'La persona que recibe el regalo nos contacta con su código. Tiene 60 días desde la confirmación del pago para utilizarlo. El delivery de los perfumes se cotiza según la dirección.'],
      ].map(([n, heading, text]) => <div key={n}><span className="text-xs font-bold text-aura-wine">{n}</span><h3 className="mb-2 mt-3 font-luxury text-xl font-semibold">{heading}</h3><p className="text-sm leading-relaxed text-aura-ink/65">{text}</p></div>)}</div>
    </section>
  </main>;
}
