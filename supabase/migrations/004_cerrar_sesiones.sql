-- Cierra las sesiones abiertas de una cuenta del panel: se usa al darle una contraseña nueva o al quitarle el acceso.
-- GoTrue guarda las sesiones en auth.sessions (sus refresh tokens se borran en cascada), esquema al que el usuario del
-- servidor no tiene acceso. La función corre con los permisos de quien la crea (supabase_admin) y solo la puede
-- ejecutar aura_server, el usuario de la web.
create or replace function public.aura_revoke_sessions(target uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare closed integer;
begin
  delete from auth.sessions where user_id = target;
  get diagnostics closed = row_count;
  return closed;
end $$;
revoke all on function public.aura_revoke_sessions(uuid) from public, anon, authenticated, service_role;
grant execute on function public.aura_revoke_sessions(uuid) to aura_server;
