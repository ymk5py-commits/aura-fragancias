'use client';

import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MIN_PASSWORD_LENGTH = 12;

const inputCls = 'mt-1 w-full border border-zinc-300 px-3 py-2.5 text-sm normal-case tracking-normal text-zinc-900';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500';

/** Formulario de contraseña nueva: lo usa el diálogo del encabezado, «Mi cuenta» y el cambio obligatorio del primer ingreso. */
export const PasswordForm: React.FC<{ onDone?: () => void; doneLabel?: string }> = ({ onDone, doneLabel = 'Cerrar' }) => {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    if (password !== repeat) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    try {
      await changePassword(password);
      setPassword('');
      setRepeat('');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div>
        <p role="status" className="mb-5 text-sm text-zinc-700">Listo, tu contraseña ya cambió. Usá la nueva la próxima vez que entres.</p>
        {onDone && <button onClick={onDone} className="w-full bg-aura-ink px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white">{doneLabel}</button>}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className={labelCls}>
        Contraseña nueva
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required minLength={MIN_PASSWORD_LENGTH} />
      </label>
      <label className={labelCls}>
        Repetila
        <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputCls} required />
      </label>
      <p className="text-[11px] text-zinc-400">Mínimo {MIN_PASSWORD_LENGTH} caracteres. Mejor una frase larga que una palabra con números.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 bg-aura-ink px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-60">
        {busy && <Loader2 size={14} className="animate-spin" />} Guardar contraseña
      </button>
    </form>
  );
};

/** `required`: cambio obligatorio (contraseña temporal); no se puede cerrar hasta elegir una propia. */
const ChangePassword: React.FC<{ onClose?: () => void; required?: boolean }> = ({ onClose, required = false }) => {
  const { logout } = useAuth();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" role="dialog" aria-modal="true" aria-label={required ? 'Elegí tu contraseña' : 'Cambiar contraseña'}>
      <div className="w-full max-w-sm bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-luxury text-aura-ink">{required ? 'Elegí tu contraseña' : 'Cambiar contraseña'}</h2>
          {!required && onClose && <button onClick={onClose} aria-label="Cerrar" className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>}
        </div>
        {required && <p className="mb-5 text-sm text-zinc-600">Entraste con una contraseña temporal. Elegí una propia para seguir usando el panel.</p>}
        <PasswordForm onDone={onClose} />
        {required && <button onClick={() => void logout()} className="mt-4 w-full text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-700">Salir sin cambiarla</button>}
      </div>
    </div>
  );
};

export default ChangePassword;
