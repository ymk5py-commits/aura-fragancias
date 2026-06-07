'use client';

import React, { useState } from 'react';
import { Loader2, Upload, Save, Image as ImageIcon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { saveSettings } from '../lib/settingsService';
import { uploadProductImage } from '../lib/productsService';
import { SiteSettings } from '../types';

const inputCls =
  'w-full border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink transition-colors';
const labelCls = 'text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1.5 block';

const ImageField: React.FC<{
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadName: string;
}> = ({ label, value, onChange, uploadName }) => {
  const [uploading, setUploading] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file, uploadName);
      onChange(url);
    } catch (err) {
      console.error(err);
      alert('No se pudo subir la imagen. Revisá las reglas de Storage.');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex gap-3 items-start">
      <div className="w-24 h-16 shrink-0 bg-aura-ivory border border-zinc-100 overflow-hidden flex items-center justify-center">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-zinc-300" />}
      </div>
      <div className="flex-1">
        <span className={labelCls}>{label}</span>
        <label className="inline-flex items-center gap-2 cursor-pointer border border-zinc-300 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-700 hover:border-aura-ink transition-colors">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? 'Subiendo…' : 'Subir'}
          <input type="file" accept="image/*" onChange={handle} className="hidden" disabled={uploading} />
        </label>
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="…o pegá una URL" className={`${inputCls} mt-2`} />
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white border border-zinc-100 p-5 sm:p-6">
    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-aura-gold-deep mb-5">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const SettingsForm: React.FC = () => {
  const { settings } = useSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar. Revisá las reglas de Firestore (debe incluir /settings).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <Section title="Hero principal (portada)">
        <label className="block">
          <span className={labelCls}>Título</span>
          <input value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Subtítulo</span>
          <input value={form.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} className={inputCls} />
        </label>
        <ImageField label="Imagen de fondo del hero" value={form.heroImage} onChange={(v) => set('heroImage', v)} uploadName="banner-hero" />
      </Section>

      <Section title="Banners de categorías">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Subtítulo Hombres</span>
            <input value={form.subtitleMen} onChange={(e) => set('subtitleMen', e.target.value)} className={inputCls} />
          </label>
          <ImageField label="Banner Hombres" value={form.bannerMen} onChange={(v) => set('bannerMen', v)} uploadName="banner-hombres" />
          <label className="block">
            <span className={labelCls}>Subtítulo Mujeres</span>
            <input value={form.subtitleWomen} onChange={(e) => set('subtitleWomen', e.target.value)} className={inputCls} />
          </label>
          <ImageField label="Banner Mujeres" value={form.bannerWomen} onChange={(v) => set('bannerWomen', v)} uploadName="banner-mujeres" />
          <label className="block">
            <span className={labelCls}>Subtítulo Unisex</span>
            <input value={form.subtitleUnisex} onChange={(e) => set('subtitleUnisex', e.target.value)} className={inputCls} />
          </label>
          <ImageField label="Banner Unisex" value={form.bannerUnisex} onChange={(v) => set('bannerUnisex', v)} uploadName="banner-unisex" />
        </div>
      </Section>

      <Section title="Barra de aviso y contacto">
        <label className="block">
          <span className={labelCls}>Texto de la barra superior</span>
          <input value={form.announcement} onChange={(e) => set('announcement', e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Número de WhatsApp (con código de país, sin +)</span>
          <input value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="595994414986" />
        </label>
      </Section>

      <Section title="Descuento de bienvenida">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Código</span>
            <input value={form.welcomeCode} onChange={(e) => set('welcomeCode', e.target.value.toUpperCase())} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Porcentaje (%)</span>
            <input type="number" min={0} max={100} value={form.welcomePercent} onChange={(e) => set('welcomePercent', Number(e.target.value))} className={inputCls} />
          </label>
        </div>
      </Section>

      <Section title="Precios por presentación (Gs.)">
        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className={labelCls}>10 ML</span>
            <input type="number" min={0} value={form.price10} onChange={(e) => set('price10', Number(e.target.value))} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>30 ML</span>
            <input type="number" min={0} value={form.price30} onChange={(e) => set('price30', Number(e.target.value))} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>50 ML</span>
            <input type="number" min={0} value={form.price50} onChange={(e) => set('price50', Number(e.target.value))} className={inputCls} />
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 bg-zinc-50 py-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-aura-ink text-white px-7 py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-aura-gold transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-[12px] font-semibold text-green-600">✓ Guardado. La tienda se actualiza al instante.</span>}
      </div>
    </div>
  );
};

export default SettingsForm;