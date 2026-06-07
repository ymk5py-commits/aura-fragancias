'use client';

import React, { useState } from 'react';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Email o contraseña incorrectos.');
      } else if (code.includes('too-many-requests')) {
        setError('Demasiados intentos. Esperá unos minutos.');
      } else {
        setError('No se pudo iniciar sesión. Revisá tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-aura-ink px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Äura" className="w-16 h-16 rounded-full mb-4" width={64} height={64} />
          <h1 className="text-2xl font-luxury font-semibold tracking-[0.2em] text-white">ÄURA</h1>
          <p className="text-[10px] tracking-[0.3em] uppercase text-aura-gold mt-1">Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-7 shadow-2xl">
          <h2 className="text-xl font-luxury text-aura-ink mb-6 text-center">Iniciar sesión</h2>

          <label className="block mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Email</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-200 pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-aura-ink transition-colors"
                placeholder="admin@aura.com"
              />
            </div>
          </label>

          <label className="block mb-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Contraseña</span>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-zinc-200 pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-aura-ink transition-colors"
                placeholder="••••••••"
              />
            </div>
          </label>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 mb-4" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-aura-ink text-white py-3.5 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-aura-gold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <a href="/" className="block text-center text-[10px] tracking-[0.2em] uppercase text-white/40 hover:text-white/70 mt-6 transition-colors">
          ← Volver a la tienda
        </a>
      </div>
    </div>
  );
};

export default AdminLogin;