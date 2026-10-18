-- Almacenamiento: reemplaza storage.rules de Firebase.
--  products     -> fotos de producto y banners: lectura pública, escritura solo admin.
--  comprobantes -> comprobantes de transferencia: el cliente sube (imagen o PDF, 5 MB) sin cuenta;
--                  la URL pública lleva un nombre aleatorio imposible de adivinar (como el token de Firebase).
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('products', 'products', true, 10485760, array['image/*']),
  ('comprobantes', 'comprobantes', true, 5242880, array['image/*', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy aura_products_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

create policy aura_comprobantes_insert_public on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'comprobantes' and name ~ '^[A-Za-z0-9._-]{20,200}$');

create policy aura_comprobantes_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'comprobantes' and public.is_admin())
  with check (bucket_id = 'comprobantes' and public.is_admin());

commit;
