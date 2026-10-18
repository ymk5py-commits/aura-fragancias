-- Usuario de base de datos del servidor de la web (transacciones del panel) y del trabajador de avisos.
-- Omite la seguridad por fila (BYPASSRLS) porque las escrituras de caja/gift cards viven solo en el servidor,
-- pero solo tiene permisos de datos sobre el esquema public: no puede crear ni borrar tablas ni tocar auth/storage.
-- La contraseña NO va en este archivo: se asigna aparte con ALTER ROLE ... PASSWORD.
do $$ begin
  create role aura_server login bypassrls nosuperuser nocreatedb nocreaterole;
exception when duplicate_object then null; end $$;
grant usage on schema public to aura_server;
grant select, insert, update, delete on all tables in schema public to aura_server;
grant usage, select on all sequences in schema public to aura_server;
alter default privileges for role supabase_admin in schema public grant select, insert, update, delete on tables to aura_server;
