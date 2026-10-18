-- Aura Fragancias en Supabase (propio, en el servidor GMKtec). Reemplaza a Firestore.
-- Fuente de las reglas: firestore.rules + storage.rules del repo. Se ejecuta una sola vez.
-- Convenciones: columnas en snake_case; fechas que la app trata como milisegundos quedan como bigint.

begin;

-- ---------------------------------------------------------------------------
-- Quién es admin: SOLO cuentas con app_metadata.aura_role = 'admin'.
-- app_metadata no lo puede editar el usuario (solo el servidor), a diferencia de
-- Firebase, donde bastaba "estar logueado". El registro público además se cierra.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'aura_role', '') = 'admin'
$$;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Catálogo y configuración (lectura pública, escritura admin)
-- ---------------------------------------------------------------------------
create table public.products (
  id text primary key,
  code text not null,
  name text not null,
  inspiration text not null default '',
  family text not null default '',
  notes text[] not null default '{}',
  intensity int not null default 1,
  duration text not null default '',
  gender text not null default 'Unisex',
  category text not null default 'Daily',
  badge text,
  image_url text not null default '',
  visible boolean not null default true,
  sales_score int not null default 0,
  description text not null default '',
  updated_at timestamptz not null default now()
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pedidos de la tienda (el cliente crea sin login; solo admin lee y modifica)
-- ---------------------------------------------------------------------------
create table public.orders (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  order_id text not null check (char_length(order_id) > 3), -- NO único: el checkout duplica pedidos si el cliente toca dos veces
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmado', 'cancelado')),
  name text not null check (char_length(name) between 1 and 119),
  phone text not null check (char_length(phone) < 40),
  city_and_neighborhood text not null default '',
  address text not null check (char_length(address) < 400),
  subtotal bigint not null default 0,
  discount_percent int not null default 0,
  discount_amount bigint not null default 0,
  total bigint not null check (total >= 0),
  shipping_cost bigint,
  free_shipping boolean not null default false,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  receipt_url text,
  payment_method text not null default '',
  email text,
  document text,
  invoice jsonb,
  pagopar_hash text,
  pagopar_numero_pedido text,
  pagopar_status text,
  pagopar_attempts int,
  pagopar_payment jsonb,
  paid_at bigint,
  created_at timestamptz not null default now()
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_order_id_idx on public.orders (order_id);

-- Alertas: compras que no se pudieron completar (el navegador las crea; admin las gestiona)
create table public.incidents (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  source text not null check (char_length(source) between 1 and 40),
  message text not null check (char_length(message) between 1 and 500),
  detail text check (char_length(detail) <= 2000),
  order_id text,
  payment_method text,
  total bigint,
  customer_name text check (char_length(customer_name) <= 120),
  customer_phone text check (char_length(customer_phone) <= 40),
  page text,
  user_agent text check (char_length(user_agent) <= 300),
  created_at bigint not null,
  seen boolean not null default false,
  seen_at bigint
);
create index incidents_created_at_idx on public.incidents (created_at desc);

-- Reseñas (cliente crea pendiente; se publican al aprobar)
create table public.reviews (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  product_id text not null check (char_length(product_id) between 1 and 40),
  product_name text,
  name text not null check (char_length(name) between 2 and 60),
  city text,
  rating int not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 10 and 600),
  approved boolean not null default false,
  created_at bigint not null
);
create index reviews_product_idx on public.reviews (product_id) where approved;

-- ---------------------------------------------------------------------------
-- Caja (ventas, gastos, costos, importación): solo admin
-- ---------------------------------------------------------------------------
create table public.sales (
  id text primary key,
  date date not null,
  customer text not null default '' check (char_length(customer) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  channel text not null check (channel in ('Mostrador', 'WhatsApp', 'Instagram', 'Web', 'Mayorista', 'Otro')),
  payment_method text not null check (payment_method in ('Efectivo', 'Transferencia', 'QR', 'Tarjeta', 'Otro')),
  status text not null check (status in ('pagada', 'pendiente', 'anulada')),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  discount bigint not null default 0 check (discount between 0 and 1000000000000),
  delivery_charged bigint not null default 0 check (delivery_charged between 0 and 1000000000000),
  delivery_actual bigint not null default 0 check (delivery_actual between 0 and 1000000000000),
  other_costs bigint not null default 0 check (other_costs between 0 and 1000000000000),
  collected bigint not null default 0 check (collected between 0 and 1000000000000),
  notes text not null default '' check (char_length(notes) <= 2000),
  source_order_id text check (char_length(source_order_id) <= 128),
  source_order_code text check (char_length(source_order_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sales_date_idx on public.sales (date desc);

create table public.expenses (
  id text primary key,
  date date not null,
  type text not null check (type in ('Operativo', 'Mercadería', 'Inversión', 'Retiro')),
  category text not null check (char_length(category) between 1 and 100),
  description text not null check (char_length(description) between 1 and 300),
  payee text not null default '' check (char_length(payee) <= 120),
  amount bigint not null check (amount > 0 and amount <= 1000000000000),
  payment_method text not null check (payment_method in ('Efectivo', 'Transferencia', 'QR', 'Tarjeta', 'Otro')),
  status text not null check (status in ('pagado', 'pendiente', 'anulado')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (date desc);

create table public.sales_config (
  id text primary key,
  costs jsonb,
  recipe jsonb,
  updated_at timestamptz not null default now()
);

create table public.erp_imports (
  id text primary key,
  contents text not null check (char_length(contents) <= 800000),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Gift Cards (solo admin lee; las escrituras son transacciones del servidor)
-- ---------------------------------------------------------------------------
create table public.gift_card_payments (
  order_code text primary key,
  order_id text not null,
  amount bigint not null check (amount >= 100000),
  activated_at bigint not null
);

create table public.gift_cards (
  id text primary key,
  code text not null unique check (code ~ '^AURA-[A-F0-9]{32}$'),
  order_id text not null check (char_length(order_id) <= 100),
  order_code text not null check (order_code ~ '^AURA-[A-Z0-9]{4,20}$'),
  customer text not null check (char_length(customer) <= 120),
  phone text not null check (char_length(phone) <= 40),
  amount bigint not null check (amount between 100000 and 50000000),
  balance bigint not null check (balance >= 0 and balance <= amount),
  activated_at bigint not null,
  expires_at bigint not null,
  status text not null check (status in ('activa', 'agotada', 'anulada')),
  recipient text not null default '' check (char_length(recipient) <= 80),
  sender text not null default '' check (char_length(sender) <= 80),
  message text not null default '' check (char_length(message) <= 300),
  line_index int not null check (line_index between 0 and 49),
  copy_index int not null check (copy_index between 0 and 49),
  last_redemption_id text,
  check (expires_at = activated_at + 5184000000),
  check (status <> 'activa' or balance > 0),
  check (status <> 'agotada' or balance = 0)
);
create index gift_cards_activated_idx on public.gift_cards (activated_at desc);

create table public.gift_card_redemptions (
  id text primary key,
  gift_card_id text not null references public.gift_cards (id),
  amount bigint not null check (amount > 0),
  balance_before bigint not null,
  balance_after bigint not null check (balance_after >= 0),
  reference text not null check (char_length(reference) between 1 and 200),
  created_at timestamptz not null default now(),
  check (balance_before - amount = balance_after)
);
create index gift_card_redemptions_card_idx on public.gift_card_redemptions (gift_card_id);

-- ---------------------------------------------------------------------------
-- Cola para los avisos de WhatsApp (reemplaza los disparadores de Firestore).
-- Un trabajador en el servidor lee order_events y usa las tablas whatsapp_*.
-- Ninguna de estas tablas tiene políticas: solo el servidor (service_role) las toca.
-- ---------------------------------------------------------------------------
create table public.order_events (
  id bigserial primary key,
  order_pk text not null,
  order_code text not null,
  kind text not null check (kind in ('created', 'status', 'pagopar')),
  old_status text,
  new_status text,
  payment_method text,
  pagopar_hash text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index order_events_pending_idx on public.order_events (id) where processed_at is null;

create or replace function public.log_order_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_pk, order_code, kind, new_status, payment_method, pagopar_hash)
    values (new.id, new.order_id, 'created', new.status, new.payment_method, new.pagopar_hash);
  else
    if new.status is distinct from old.status then
      insert into public.order_events (order_pk, order_code, kind, old_status, new_status, payment_method, pagopar_hash)
      values (new.id, new.order_id, 'status', old.status, new.status, new.payment_method, new.pagopar_hash);
    end if;
    if new.pagopar_hash is distinct from old.pagopar_hash then
      insert into public.order_events (order_pk, order_code, kind, old_status, new_status, payment_method, pagopar_hash)
      values (new.id, new.order_id, 'pagopar', old.status, new.status, new.payment_method, new.pagopar_hash);
    end if;
  end if;
  return null;
end $$;
create trigger orders_event_log after insert or update on public.orders
  for each row execute function public.log_order_event();

create table public.whatsapp_alerts (
  id text primary key,
  event text not null,
  order_code text not null,
  order_document_id text not null,
  amount bigint not null,
  method text not null,
  state text not null default 'pending',
  attempts int not null default 0,
  created_at_ms bigint not null,
  next_attempt_at_ms bigint not null,
  expires_at_ms bigint not null,
  lease_until_ms bigint,
  provider_id text,
  error_code text,
  checked_at_ms bigint,
  test boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.whatsapp_payment_checks (
  id text primary key,
  order_document_id text not null,
  state text not null default 'pending',
  next_check_at_ms bigint not null default 0,
  expires_at_ms bigint not null
);
create table public.whatsapp_alert_budget (
  day date primary key,
  count int not null default 0,
  updated_at timestamptz not null default now()
);
create table public.whatsapp_alert_tests (
  id text primary key,
  order_id text,
  items jsonb,
  payment_method text,
  status text,
  total bigint
);
create table public.worker_cursors (
  name text primary key,
  last_id text
);

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.incidents enable row level security;
alter table public.reviews enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.sales_config enable row level security;
alter table public.erp_imports enable row level security;
alter table public.gift_cards enable row level security;
alter table public.gift_card_redemptions enable row level security;
alter table public.gift_card_payments enable row level security;
alter table public.order_events enable row level security;
alter table public.whatsapp_alerts enable row level security;
alter table public.whatsapp_payment_checks enable row level security;
alter table public.whatsapp_alert_budget enable row level security;
alter table public.whatsapp_alert_tests enable row level security;
alter table public.worker_cursors enable row level security;

-- Catálogo: el público ve solo lo visible (más estricto que Firestore, donde se leía todo).
create policy products_select_public on public.products for select to anon, authenticated
  using (visible = true or public.is_admin());
create policy products_write_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy settings_select_public on public.settings for select to anon, authenticated using (true);
create policy settings_write_admin on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Pedidos: crear sin login (validado); todo lo demás, admin.
create policy orders_insert_public on public.orders for insert to anon, authenticated
  with check (status = 'pendiente' and id ~ '^[a-f0-9]{32}$' and paid_at is null and pagopar_payment is null);
create policy orders_admin_select on public.orders for select to authenticated using (public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders for delete to authenticated using (public.is_admin());

-- Alertas de compra.
create policy incidents_insert_public on public.incidents for insert to anon, authenticated
  with check (seen = false and seen_at is null);
create policy incidents_admin_select on public.incidents for select to authenticated using (public.is_admin());
create policy incidents_admin_update on public.incidents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy incidents_admin_delete on public.incidents for delete to authenticated using (public.is_admin());

-- Reseñas: el público lee las aprobadas y crea pendientes.
create policy reviews_select on public.reviews for select to anon, authenticated
  using (approved = true or public.is_admin());
create policy reviews_insert_public on public.reviews for insert to anon
  with check (approved = false);
create policy reviews_admin_all on public.reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Caja y Gift Cards: el admin LEE; las escrituras las hace el servidor (service_role omite RLS).
create policy sales_admin_select on public.sales for select to authenticated using (public.is_admin());
create policy expenses_admin_select on public.expenses for select to authenticated using (public.is_admin());
create policy sales_config_admin_select on public.sales_config for select to authenticated using (public.is_admin());
create policy erp_imports_admin_select on public.erp_imports for select to authenticated using (public.is_admin());
create policy gift_cards_admin_select on public.gift_cards for select to authenticated using (public.is_admin());
create policy gift_card_redemptions_admin_select on public.gift_card_redemptions for select to authenticated using (public.is_admin());
create policy gift_card_payments_admin_select on public.gift_card_payments for select to authenticated using (public.is_admin());

-- Tablas internas: sin ninguna política y sin permisos para el navegador.
revoke all on public.order_events, public.whatsapp_alerts, public.whatsapp_payment_checks,
  public.whatsapp_alert_budget, public.whatsapp_alert_tests, public.worker_cursors from anon, authenticated;
revoke all on public.sales, public.expenses, public.sales_config, public.erp_imports,
  public.gift_cards, public.gift_card_redemptions, public.gift_card_payments from anon;
revoke insert, update, delete on public.sales, public.expenses, public.sales_config, public.erp_imports,
  public.gift_cards, public.gift_card_redemptions, public.gift_card_payments from authenticated;
revoke all on public.orders from anon;
grant insert on public.orders to anon;
revoke all on public.incidents from anon;
grant insert on public.incidents to anon;
-- Alertas: el admin solo puede marcarlas como revisadas (no reescribir el mensaje), como en Firestore.
revoke update on public.incidents from authenticated;
grant update (seen, seen_at) on public.incidents to authenticated;
revoke all on public.reviews from anon;
grant select, insert on public.reviews to anon;
revoke all on public.products, public.settings from anon;
grant select on public.products, public.settings to anon;

-- ---------------------------------------------------------------------------
-- Tiempo real para el panel (RLS también filtra lo que recibe cada usuario)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.products, public.settings, public.orders, public.incidents, public.reviews,
  public.sales, public.expenses, public.sales_config, public.gift_cards, public.gift_card_redemptions;

commit;
