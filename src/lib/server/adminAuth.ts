// Verifica que quien llama a /api/admin/* es un admin de Supabase: token firmado con el secreto JWT
// del servidor y rol aura_role = 'admin' en app_metadata (que el usuario no puede editar).
import { jwtVerify } from 'jose';

export class AdminAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function requireAdmin(request: Request): Promise<{ id: string; email?: string }> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 8192) throw new AdminAuthError('Acceso administrativo requerido.', 401);
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new AdminAuthError('Servicio no configurado.', 503);
  let payload;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] }));
  } catch {
    throw new AdminAuthError('Sesión inválida.', 401);
  }
  const meta = (payload.app_metadata ?? {}) as { aura_role?: string };
  if (payload.role !== 'authenticated' || meta.aura_role !== 'admin' || !payload.sub) {
    throw new AdminAuthError('Esta cuenta no tiene acceso al panel.', 403);
  }
  return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
}
