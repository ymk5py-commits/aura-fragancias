// Cuentas del panel: las operaciones las ejecuta el servidor (/api/admin/users) con la clave de servicio.
import { adminCall } from './adminApi';
import type { PanelUser } from './server/adminUsers';

export type { PanelUser };

export interface TemporaryPassword {
  user: PanelUser;
  temporaryPassword: string;
}

export async function listUsers(): Promise<PanelUser[]> {
  return (await adminCall<{ users: PanelUser[] }>('users', { action: 'list' })).users;
}

export const createUser = (email: string, name: string) =>
  adminCall<TemporaryPassword>('users', { action: 'create', email, name });

export const resetUserPassword = (id: string) =>
  adminCall<TemporaryPassword & { sessionsClosed: boolean }>('users', { action: 'reset-password', id });

export const deleteUser = (id: string) => adminCall<{ deleted: true }>('users', { action: 'delete', id });
