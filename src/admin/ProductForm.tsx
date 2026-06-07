'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { Perfume, Gender, Category, Badge } from '../types';
import { saveProduct, uploadProductImage } from '../lib/productsService';
import { cldn } from '../lib/img';

interface Props {
  product: Perfume | null; // null = nuevo
  onClose: () => void;
  onSaved: () => void;
}

const empty: Perfume = {
  code: '',
  name: '',
  inspiration: '',
  family: '',
  notes: [],
  intensity: 3,
  duration: '8-12h',
  gender: 'Man',
  category: 'Daily',
  imageUrl: '',
  visible: true,
  salesScore: 0,
};

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'Man', label: 'Hombre' },
  { value: 'Woman', label: 'Mujer' },
  { value: 'Unisex', label: 'Unisex' },
];
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'Daily', label: 'Diario' },
  { value: 'Casual', label: 'Salidas' },
  { value: 'Night', label: 'Noche' },
];
const BADGES: { value: Badge | ''; label: string }[] = [
  { value: '', label: 'Sin etiqueta' },
  { value: 'Bestseller', label: 'Top Venta' },
  { value: 'Recommended', label: 'Recomendado' },
  { value: 'New', label: 'Nuevo' },
];

const ProductForm: React.FC<Props> = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState<Perfume>(product ? { ...product } : { ...empty });
  const [notesText, setNotesText] = useState((product?.notes || []).join(', '));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof Perfume>(key: K, value: Perfume[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.code.trim()) {
      setError('Poné primero el código del producto antes de subir la imagen.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const url = await uploadProductImage(file, form.code);
      set('imageUrl', url);
    } catch (err) {
      setError('No se pudo subir la imagen. Revisá las reglas de Storage en Firebase.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('El código y el nombre son obligatorios.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await saveProduct({
        ...form,
        notes: notesText.split(',').map((n) => n.trim()).filter(Boolean),
      });
      onSaved();
    } catch (err) {
      setError('No se pudo guardar. Revisá tu conexión y las reglas de Firestore.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink transition-colors';
  const labelCls = 'text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1.5 block';

  return (
    <div className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-aura-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white shadow-2xl my-0 sm:my-8 z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-luxury font-semibold text-aura-ink">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 text-zinc-400 hover:text-aura-ink">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image */}
          <div className="flex gap-4 items-start">
            <div className="w-28 h-32 shrink-0 bg-aura-ivory border border-zinc-100 flex items-center justify-center overflow-hidden">
              {form.imageUrl ? (
                <img src={cldn(form.imageUrl, 300)} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={26} className="text-zinc-300" />
              )}
            </div>
            <div className="flex-1">
              <span className={labelCls}>Imagen del producto</span>
              <label className="inline-flex items-center gap-2 cursor-pointer border border-zinc-300 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-700 hover:border-aura-ink transition-colors">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Subiendo…' : 'Subir imagen'}
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" disabled={uploading} />
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="…o pegá una URL de imagen"
                className={`${inputCls} mt-2`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className={labelCls}>Código *</span>
              <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className={inputCls} placeholder="CC180" />
            </label>
            <label>
              <span className={labelCls}>Inspiración (marca)</span>
              <input value={form.inspiration} onChange={(e) => set('inspiration', e.target.value)} className={inputCls} placeholder="Azzaro" />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Nombre *</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="The Most Wanted Parfum" />
          </label>

          <label className="block">
            <span className={labelCls}>Familia olfativa</span>
            <input value={form.family} onChange={(e) => set('family', e.target.value)} className={inputCls} placeholder="ORIENTAL ESPECIADO" />
          </label>

          <label className="block">
            <span className={labelCls}>Notas (separadas por coma)</span>
            <input value={notesText} onChange={(e) => setNotesText(e.target.value)} className={inputCls} placeholder="CARDAMOMO, TÓFE, AMBARWOOD" />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label>
              <span className={labelCls}>Género</span>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)} className={inputCls}>
                {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </label>
            <label>
              <span className={labelCls}>Categoría</span>
              <select value={form.category} onChange={(e) => set('category', e.target.value as Category)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label>
              <span className={labelCls}>Intensidad (1-5)</span>
              <input type="number" min={1} max={5} value={form.intensity} onChange={(e) => set('intensity', Number(e.target.value))} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Duración</span>
              <input value={form.duration} onChange={(e) => set('duration', e.target.value)} className={inputCls} placeholder="12h+" />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <label>
              <span className={labelCls}>Etiqueta</span>
              <select value={form.badge || ''} onChange={(e) => set('badge', (e.target.value || undefined) as Badge | undefined)} className={inputCls}>
                {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </label>
            <label>
              <span className={labelCls}>Ventas (Top)</span>
              <input type="number" min={0} value={form.salesScore || 0} onChange={(e) => set('salesScore', Number(e.target.value))} className={inputCls} />
            </label>
            <label className="flex items-end pb-1">
              <span className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.visible !== false} onChange={(e) => set('visible', e.target.checked)} className="w-4 h-4 accent-aura-gold" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-700">Visible en la tienda</span>
              </span>
            </label>
          </div>

          {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2" role="alert">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-zinc-300 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 hover:border-zinc-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploading} className="flex-1 bg-aura-ink text-white py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-aura-gold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;