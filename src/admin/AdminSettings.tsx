'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PasswordForm } from './ChangePassword';
import SettingsForm from './SettingsForm';
import AdminUsers from './AdminUsers';

type Section = 'store' | 'users' | 'account';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'store', label: 'Tienda' },
  { key: 'users', label: 'Usuarios' },
  { key: 'account', label: 'Mi cuenta' },
];

const MyAccount: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-md bg-white border border-zinc-100 p-5 sm:p-6">
      <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-aura-gold-deep mb-2">Mi cuenta</h3>
      <p className="text-[12px] text-zinc-500 mb-5">Entraste como <strong className="text-zinc-800">{user?.email}</strong>.</p>
      <PasswordForm />
    </div>
  );
};

/** Pestaña Configuración: datos de la tienda, usuarios del panel y la cuenta de quien está conectado. */
const AdminSettings: React.FC = () => {
  const [section, setSection] = useState<Section>('store');
  return (
    <div className="space-y-5">
      <nav className="inline-flex max-w-full overflow-x-auto gap-1 bg-zinc-100 p-1" aria-label="Secciones de configuración">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} aria-current={section === s.key ? 'page' : undefined}
            className={`whitespace-nowrap px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] ${section === s.key ? 'bg-white text-aura-ink shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>
            {s.label}
          </button>
        ))}
      </nav>
      {section === 'store' && <SettingsForm />}
      {section === 'users' && <AdminUsers />}
      {section === 'account' && <MyAccount />}
    </div>
  );
};

export default AdminSettings;
