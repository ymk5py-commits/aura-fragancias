-- Rol de base de datos del trabajador de avisos de WhatsApp (mínimo privilegio).
-- Se ejecuta UNA vez, como supabase_admin, en la base `postgres` del servicio Supabase de Aura:
--   docker exec -i supabase-db-9yus3novbjqin3vcs5mpkj1b psql -U supabase_admin -d postgres \
--     -v clave="'<contraseña>'" -f rol-trabajador.sql
-- Es repetible: si el rol existe, solo renueva contraseña y permisos.
-- BYPASSRLS hace falta porque las tablas whatsapp_* y order_events tienen RLS sin políticas
-- (solo `service_role` las veía); los permisos de tabla/columna de abajo siguen limitando qué toca.

do $$
begin
  if not exists (select from pg_roles where rolname = 'aura_worker') then
    create role aura_worker login bypassrls noinherit nosuperuser nocreatedb nocreaterole;
  end if;
end $$;

alter role aura_worker with login bypassrls password :clave;

revoke all on all tables in schema public from aura_worker;
grant usage on schema public to aura_worker;

-- Cola de eventos: lee todo y solo puede marcar processed_at.
grant select on public.order_events to aura_worker;
grant update (processed_at) on public.order_events to aura_worker;

-- Pedidos: solo lectura y SOLO las columnas que usa el trabajador (sin nombre, teléfono, dirección, RUC ni comprobantes).
grant select (id, order_id, status, total, shipping_cost, items, payment_method, pagopar_hash, created_at)
  on public.orders to aura_worker;

-- Tablas del propio trabajador.
grant select, insert, update on public.whatsapp_alerts, public.whatsapp_payment_checks,
  public.whatsapp_alert_budget, public.worker_cursors to aura_worker;
grant select, insert on public.whatsapp_alert_tests to aura_worker;
