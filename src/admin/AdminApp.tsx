import React from 'react';
import { Loader2, Settings } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const SetupNotice: React.FC = () => (
  <div className="min-h-dvh flex items-center justify-center bg-aura-ink px-5">
    <div className="max-w-lg text-center">
      <Settings size={40} className="text-aura-gold mx-auto mb-5" />
      <h1 className="text-2xl font-luxury text-white mb-3">Falta configurar Firebase</h1>
      <p className="text-white/60 text-sm leading-relaxed mb-6">
        Agregá las variables <code className="text-aura-gold">VITE_FIREBASE_*</code> en un archivo
        <code className="text-aura-gold"> .env</code> (local) y en las Environment Variables de Vercel.
        Mirá el archivo <code className="text-aura-gold">.env.example</code> y la guía
        <code className="text-aura-gold"> FIREBASE_SETUP.md</code> del proyecto.
      </p>
      <a href="/" className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">← Volver a la tienda</a>
    </div>
  </div>
);

const AdminApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (!isFirebaseConfigured) return <SetupNotice />;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-aura-ink">
        <Loader2 size={28} className="text-aura-gold animate-spin" />
      </div>
    );
  }

  if (!user) return <AdminLogin />;

  return <AdminDashboard />;
};

export default AdminApp;
