import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Eye, EyeOff, Pencil, Trash2, LogOut, Download, Loader2, ExternalLink, PackageOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductsContext';
import { Perfume } from '../types';
import { toggleVisible, deleteProduct, seedCatalog } from '../lib/productsService';
import ProductForm from './ProductForm';
import SettingsForm from './SettingsForm';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { products, source } = useProducts();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Perfume | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'products' | 'settings'>('products');

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = [...products].sort((a, b) => (b.salesScore || 0) - (a.salesScore || 0));
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.inspiration.toLowerCase().includes(q)
    );
  }, [products, query]);

  const docId = (p: Perfume) => p.id || p.code;

  const handleToggle = async (p: Perfume) => {
    setBusyId(docId(p));
    try {
      await toggleVisible(docId(p), p.visible === false);
    } catch {
      notify('No se pudo cambiar. ¿Importaste el catálogo a Firebase?');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (p: Perfume) => {
    if (!confirm(`¿Eliminar "${p.name}" (${p.code})? Esta acción no se puede deshacer.`)) return;
    setBusyId(docId(p));
    try {
      await deleteProduct(docId(p));
      notify('Producto eliminado.');
    } catch {
      notify('No se pudo eliminar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSeed = async () => {
    if (!confirm('Esto importará el catálogo incluido (47 productos) a Firebase. ¿Continuar?')) return;
    setSeeding(true);
    try {
      const n = await seedCatalog();
      notify(`✓ ${n} productos importados a Firebase.`);
    } catch (err) {
      notify((err as Error).message || 'No se pudo importar.');
    } finally {
      setSeeding(false);
    }
  };

  const visibleCount = products.filter((p) => p.visible !== false).length;

  return (
    <div className="min-h-dvh bg-zinc-50">
      {/* Top bar */}
      <header className="bg-aura-ink text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Äura" className="w-9 h-9 rounded-full" width={36} height={36} />
            <div>
              <h1 className="text-lg font-luxury font-semibold tracking-[0.18em] leading-none">ÄURA</h1>
              <span className="text-[9px] tracking-[0.25em] uppercase text-aura-gold">Panel Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70 hover:text-white transition-colors">
              <ExternalLink size={13} /> Ver tienda
            </a>
            <span className="hidden md:block text-[11px] text-white/50">{user?.email}</span>
            <button onClick={() => logout()} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors">
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-100 sticky top-[57px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1">
          {([
            { key: 'products', label: 'Productos' },
            { key: 'settings', label: 'Configuración' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] border-b-2 transition-colors ${
                tab === t.key ? 'border-aura-ink text-aura-ink' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'settings' && <SettingsForm />}

        {tab === 'products' && (
        <>
        {/* Stats + seed notice */}
        {source === 'local' && (
          <div className="bg-amber-50 border border-amber-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <PackageOpen size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Estás viendo el catálogo incluido (no editable)</p>
                <p className="text-[12px] text-amber-700 mt-0.5">Importá los 47 productos a Firebase para poder crear, editar y ocultar.</p>
              </div>
            </div>
            <button onClick={handleSeed} disabled={seeding} className="shrink-0 inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-amber-700 transition-colors disabled:opacity-60">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {seeding ? 'Importando…' : 'Importar catálogo'}
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-luxury font-semibold text-aura-ink">Productos</h2>
            <p className="text-[12px] text-zinc-500">{products.length} en total · {visibleCount} visibles · {products.length - visibleCount} ocultos</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="w-full border border-zinc-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink" />
            </div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              disabled={source === 'local'}
              title={source === 'local' ? 'Primero importá el catálogo a Firebase' : ''}
              className="inline-flex items-center gap-2 bg-aura-ink text-white px-4 sm:px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-aura-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Plus size={15} /> Nuevo
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-100 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-[0.15em] text-zinc-400">
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Género</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Ventas</th>
                <th className="px-4 py-3 font-semibold text-center">Visible</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const id = docId(p);
                const busy = busyId === id;
                const hidden = p.visible === false;
                return (
                  <tr key={id} className={`border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors ${hidden ? 'opacity-55' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-12 bg-aura-ivory border border-zinc-100 overflow-hidden shrink-0">
                          {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-aura-ink truncate max-w-[200px]">{p.name}</p>
                          <p className="text-[11px] text-zinc-400">{p.code} · {p.inspiration}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[12px] text-zinc-600">
                      {p.gender === 'Man' ? 'Hombre' : p.gender === 'Woman' ? 'Mujer' : 'Unisex'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[12px] text-zinc-600 tabular">{p.salesScore || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={busy || source === 'local'}
                        title={hidden ? 'Oculto — clic para mostrar' : 'Visible — clic para ocultar'}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors disabled:opacity-40 ${hidden ? 'bg-zinc-100 text-zinc-400' : 'bg-green-50 text-green-600'}`}
                      >
                        {busy ? <Loader2 size={15} className="animate-spin" /> : hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(p); setShowForm(true); }}
                          disabled={source === 'local'}
                          className="p-2 text-zinc-500 hover:text-aura-ink hover:bg-zinc-100 transition-colors disabled:opacity-40"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={busy || source === 'local'}
                          className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-400">No hay productos que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </main>

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); notify(editing ? 'Producto actualizado.' : 'Producto creado.'); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] bg-aura-ink text-white px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase shadow-2xl animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
