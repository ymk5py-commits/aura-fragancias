'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createUser, deleteUser, listUsers, resetUserPassword, type PanelUser } from '../lib/usersService';

const inputCls = 'w-full border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink transition-colors';
const labelCls = 'text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1.5 block';
const smallButton = 'inline-flex items-center gap-1.5 border border-zinc-300 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-700 hover:border-aura-ink transition-colors disabled:opacity-40';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-PY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Asuncion' }) : 'Todavía no entró';

interface Secret { email: string; password: string; kind: 'created' | 'reset'; sessionsClosed: boolean }

const AdminUsers: React.FC = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<PanelUser[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [secret, setSecret] = useState<Secret | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const refresh = useCallback(async () => {
    try {
      setUsers(await listUsers());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la lista.');
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setError('');
    try {
      await task();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setBusy('');
    }
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    void run('create', async () => {
      const result = await createUser(email, name);
      setSecret({ email: result.user.email, password: result.temporaryPassword, kind: 'created', sessionsClosed: true });
      setCopied(false);
      setEmail('');
      setName('');
    });
  };

  const reset = (target: PanelUser) => {
    if (!confirm(`¿Darle una contraseña nueva a ${target.email}? La actual deja de servir y se cierran sus sesiones abiertas.`)) return;
    void run(`reset:${target.id}`, async () => {
      const result = await resetUserPassword(target.id);
      setSecret({ email: target.email, password: result.temporaryPassword, kind: 'reset', sessionsClosed: result.sessionsClosed });
      setCopied(false);
    });
  };

  const remove = (target: PanelUser) => {
    if (!confirm(`¿Quitar a ${target.email}? Pierde el acceso al panel y no se puede deshacer.`)) return;
    void run(`delete:${target.id}`, async () => {
      await deleteUser(target.id);
      if (secret?.email === target.email) setSecret(null);
    });
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.password);
      setCopied(true);
    } catch {
      setError('No se pudo copiar automáticamente: seleccioná la contraseña y copiala a mano.');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white border border-zinc-100 p-5 sm:p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-aura-gold-deep mb-2">Usuarios con acceso al panel</h3>
        <p className="text-[12px] text-zinc-500 mb-5 leading-relaxed">
          Todos los usuarios del panel tienen los mismos permisos. Al crear una cuenta o darle una contraseña nueva, el sistema genera una temporal que se muestra una sola vez; quien la reciba elige la propia al entrar.
        </p>

        {secret && (
          <div role="status" className="mb-5 border border-aura-gold bg-aura-ivory p-4">
            <p className="text-sm font-semibold text-aura-ink">
              {secret.kind === 'created' ? 'Cuenta creada' : 'Contraseña nueva'} para {secret.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="select-all bg-white border border-zinc-200 px-3 py-2 font-mono text-base tracking-wider text-aura-ink">{secret.password}</code>
              <button type="button" onClick={copy} className={smallButton}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copiada' : 'Copiar'}</button>
            </div>
            <p className="mt-3 text-[12px] text-zinc-600 leading-relaxed">
              Se muestra solo ahora: pasásela por un medio privado. Es temporal; al entrar tiene que elegir otra.
              {!secret.sessionsClosed && ' No pudimos cerrar sus sesiones abiertas: pueden seguir activas hasta que venzan.'}
            </p>
            <button type="button" onClick={() => setSecret(null)} className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-800">Listo, ya la copié</button>
          </div>
        )}

        {error && <p role="alert" className="mb-4 bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}

        {users === null && !error ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-zinc-500"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
        ) : (
          <ul className="divide-y divide-zinc-100 border-y border-zinc-100">
            {(users ?? []).map((u) => {
              const mine = u.id === me?.id;
              return (
                <li key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-aura-ink truncate">
                      {u.name || u.email}{mine && <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-aura-gold-deep">Tu cuenta</span>}
                    </p>
                    {u.name && <p className="text-[12px] text-zinc-500 truncate">{u.email}</p>}
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {when(u.lastSignInAt)}
                      {u.mustChangePassword && <span className="ml-2 bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">Contraseña temporal sin cambiar</span>}
                    </p>
                  </div>
                  {!mine && (
                    <div className="flex gap-2 shrink-0">
                      <button type="button" className={smallButton} disabled={Boolean(busy)} onClick={() => reset(u)}>
                        {busy === `reset:${u.id}` ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Contraseña nueva
                      </button>
                      <button type="button" aria-label={`Quitar a ${u.email}`} className={`${smallButton} hover:!border-red-600 hover:text-red-600`} disabled={Boolean(busy)} onClick={() => remove(u)}>
                        {busy === `delete:${u.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Quitar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={create} className="bg-white border border-zinc-100 p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-aura-gold-deep">Agregar usuario</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Correo</span>
            <input type="email" required maxLength={254} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="nombre@correo.com" />
          </label>
          <label className="block">
            <span className={labelCls}>Nombre (opcional)</span>
            <input maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Yohana" />
          </label>
        </div>
        <button disabled={Boolean(busy) || !email} className="inline-flex items-center gap-2 bg-aura-ink text-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-aura-gold transition-colors disabled:opacity-50">
          {busy === 'create' ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Crear usuario
        </button>
      </form>
    </div>
  );
};

export default AdminUsers;
