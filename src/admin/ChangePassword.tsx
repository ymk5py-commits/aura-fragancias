'use client';

import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MIN_LENGTH = 12;

const ChangePassword: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) return setError(`Usá al menos ${MIN_LENGTH} caracteres.`);
    if (password !== repeat) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    try {
      await changePassword(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" role="dialog" aria-modal="true" aria-label="Cambiar contraseña">
      <div className="w-full max-w-sm bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-luxury text-aura-ink">Cambiar contraseña</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>
        {done ? (
          <div>
            <p className="mb-5 text-sm text-zinc-700">Listo, tu contraseña ya cambió. Usá la nueva la próxima vez que entres.</p>
            <button onClick={onClose} className="w-full bg-aura-ink px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Contraseña nueva
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-zinc-300 px-3 py-2.5 text-sm normal-case tracking-normal text-zinc-900" required />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Repetila
              <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="mt-1 w-full border border-zinc-300 px-3 py-2.5 text-sm normal-case tracking-normal text-zinc-900" required />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 bg-aura-ink px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" />} Guardar contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
