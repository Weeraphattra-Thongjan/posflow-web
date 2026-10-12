-- ============ ENUMS ============
create type public.discount_type as enum ('percent', 'amount');
create type public.payment_method as enum ('cash', 'qr', 'card', 'transfer');
create type public.invite_status as enum ('pending', 'accepted', 'revoked');

-- ============ CATEGORIES ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);
create index idx_categories_store on public.categories(store_id);
alter table public.categories enable row level security;

create policy "categories_select" on public.categories for select to authenticated
  using (public.is_store_member(store_id, auth.uid()) or public.is_app_admin(auth.uid()));
create policy "categories_insert" on public.categories for insert to authenticated
  with check (public.is_store_member(store_id, auth.uid()));
create policy "categories_update" on public.categories for update to authenticated
  using (public.is_store_member(store_id, auth.uid()));
create policy "categories_delete" on public.categories for delete to authenticated
  using (public.is_store_owner(store_id, auth.uid()));

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_store on public.products(store_id);
create index idx_products_barcode on public.products(store_id, barcode);
alter table public.products enable row level security;

create policy "products_select" on public.products for select to authenticated
  using (public.is_store_member(store_id, auth.uid()) or public.is_app_admin(auth.uid()));
create policy "products_insert" on public.products for insert to authenticated
  with check (public.is_store_member(store_id, auth.uid()));
create policy "products_update" on public.products for update to authenticated
  using (public.is_store_member(store_id, auth.uid()));
create policy "products_delete" on public.products for delete to authenticated
  using (public.is_store_owner(store_id, auth.uid()));

create trigger trg_products_updated before update on public.products
  for each row execute function public.tg_set_updated_at();

-- ============ PROMOTIONS ============
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  code text,
  discount_type discount_type not null default 'percent',
  discount_value numeric(12,2) not null default 0,
  min_purchase numeric(12,2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_promos_store on public.promotions(store_id);
alter table public.promotions enable row level security;

create policy "promos_select" on public.promotions for select to authenticated
  using (public.is_store_member(store_id, auth.uid()) or public.is_app_admin(auth.uid()));
create policy "promos_insert" on public.promotions for insert to authenticated
  with check (public.is_store_member(store_id, auth.uid()));
create policy "promos_update" on public.promotions for update to authenticated
  using (public.is_store_member(store_id, auth.uid()));
create policy "promos_delete" on public.promotions for delete to authenticated
  using (public.is_store_owner(store_id, auth.uid()));

-- ============ SALES ============
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  receipt_no integer not null,
  cashier_id uuid not null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method payment_method not null default 'cash',
  promotion_id uuid references public.promotions(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create unique index uq_sales_receipt on public.sales(store_id, receipt_no);
create index idx_sales_store_created on public.sales(store_id, created_at desc);
alter table public.sales enable row level security;

create policy "sales_select" on public.sales for select to authenticated
  using (public.is_store_member(store_id, auth.uid()) or public.is_app_admin(auth.uid()));
create policy "sales_insert" on public.sales for insert to authenticated
  with check (public.is_store_member(store_id, auth.uid()) and cashier_id = auth.uid());

-- ============ SALE ITEMS ============
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index idx_sale_items_sale on public.sale_items(sale_id);
create index idx_sale_items_store on public.sale_items(store_id, created_at desc);
alter table public.sale_items enable row level security;

create policy "sale_items_select" on public.sale_items for select to authenticated
  using (public.is_store_member(store_id, auth.uid()) or public.is_app_admin(auth.uid()));
create policy "sale_items_insert" on public.sale_items for insert to authenticated
  with check (public.is_store_member(store_id, auth.uid()));

-- Trigger: auto-deduct stock on sale_items insert
create or replace function public.tg_deduct_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products
  set stock = stock - new.quantity
  where id = new.product_id and store_id = new.store_id;
  return new;
end $$;

create trigger trg_deduct_stock after insert on public.sale_items
  for each row execute function public.tg_deduct_stock();

-- Trigger: auto receipt_no per store
create or replace function public.tg_set_receipt_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.receipt_no is null or new.receipt_no = 0 then
    select coalesce(max(receipt_no), 0) + 1 into new.receipt_no
      from public.sales where store_id = new.store_id;
  end if;
  return new;
end $$;

create trigger trg_set_receipt_no before insert on public.sales
  for each row execute function public.tg_set_receipt_no();

-- ============ STAFF INVITES ============
create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  role member_role not null default 'cashier',
  status invite_status not null default 'pending',
  invited_by uuid not null,
  created_at timestamptz not null default now()
);
create index idx_invites_store on public.staff_invites(store_id);
alter table public.staff_invites enable row level security;

create policy "invites_select" on public.staff_invites for select to authenticated
  using (public.is_store_owner(store_id, auth.uid()) or public.is_app_admin(auth.uid()));
create policy "invites_insert" on public.staff_invites for insert to authenticated
  with check (public.is_store_owner(store_id, auth.uid()) and invited_by = auth.uid());
create policy "invites_update" on public.staff_invites for update to authenticated
  using (public.is_store_owner(store_id, auth.uid()));
create policy "invites_delete" on public.staff_invites for delete to authenticated
  using (public.is_store_owner(store_id, auth.uid()));

-- ============ DEMO DATA SEEDER ============
-- Seeds sample categories, products, promo, and a few past sales for a new store
create or replace function public.seed_demo_data(_store_id uuid, _owner_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cat_drink uuid; cat_snack uuid; cat_other uuid;
  p_water uuid; p_coffee uuid; p_chip uuid; p_sandwich uuid; p_bread uuid; p_cookie uuid;
  s_id uuid;
  i int;
  rec_total numeric;
begin
  insert into public.categories(store_id, name, color) values (_store_id, 'เครื่องดื่ม', '#3b82f6') returning id into cat_drink;
  insert into public.categories(store_id, name, color) values (_store_id, 'ขนม', '#f59e0b') returning id into cat_snack;
  insert into public.categories(store_id, name, color) values (_store_id, 'อื่นๆ', '#8b5cf6') returning id into cat_other;

  insert into public.products(store_id, category_id, name, sku, price, cost, stock, low_stock_threshold)
    values (_store_id, cat_drink, 'น้ำเปล่า 600ml', 'DR001', 10, 6, 50, 10) returning id into p_water;
  insert into public.products(store_id, category_id, name, sku, price, cost, stock, low_stock_threshold)
    values (_store_id, cat_drink, 'กาแฟกระป๋อง', 'DR002', 25, 15, 30, 8) returning id into p_coffee;
  insert into public.products(store_id, category_id, name, sku, price, cost, stock, low_stock_threshold)
    values (_store_id, cat_snack, 'มันฝรั่งทอด', 'SN001', 20, 12, 25, 8) returning id into p_chip;
  insert into public.products(store_id, category_id, name, sku, price, cost, stock, low_stock_threshold)
    values (_store_id, cat_snack, 'แซนด์วิช', 'SN002', 35, 22, 3, 5) returning id into p_sandwich;
  insert into public.products(store_id, category_id, name, sku, price, cost, stock, low_stock_threshold)
    values (_store_id, cat_snack, 'ขนมปัง', 'SN003', 15, 9, 20, 5) returning id into p_bread;
  insert into public.products(store_id, category_id, name, sku, price, cost, stock, low_stock_threshold)
    values (_store_id, cat_other, 'คุกกี้', 'OT001', 18, 10, 18, 6) returning id into p_cookie;

  insert into public.promotions(store_id, name, code, discount_type, discount_value, min_purchase)
    values (_store_id, 'ลด 10% สำหรับลูกค้าใหม่', 'WELCOME10', 'percent', 10, 100);

  -- Seed 12 demo sales spread over recent days
  for i in 1..12 loop
    rec_total := (50 + (random() * 400))::numeric(12,2);
    insert into public.sales(store_id, cashier_id, subtotal, discount, total, payment_method, created_at)
      values (_store_id, _owner_id, rec_total, 0, rec_total, 'cash',
              now() - ((i || ' days')::interval) + ((random() * 8) || ' hours')::interval)
      returning id into s_id;
    -- one item per sale (skip stock trigger by inserting after with adjusted stock)
    insert into public.sale_items(sale_id, product_id, store_id, product_name, unit_price, quantity, line_total)
      values (s_id, p_coffee, _store_id, 'กาแฟกระป๋อง', 25, 1, 25);
  end loop;
end $$;

-- Auto-seed when a new store is created
create or replace function public.handle_new_store()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  perform public.seed_demo_data(new.id, new.owner_id);
  return new;
end $$;

drop trigger if exists trg_handle_new_store on public.stores;
create trigger trg_handle_new_store after insert on public.stores
  for each row execute function public.handle_new_store();