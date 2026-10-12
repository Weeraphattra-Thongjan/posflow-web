
-- ============= ENUMS =============
create type public.store_status as enum ('active', 'suspended', 'pending');
create type public.member_role as enum ('owner', 'cashier');

-- ============= PROFILES =============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============= APP ADMINS =============
create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create or replace function public.is_app_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.app_admins where user_id = _user_id);
$$;

create policy "admins_select_self" on public.app_admins
  for select to authenticated using (user_id = auth.uid() or public.is_app_admin(auth.uid()));

-- ============= STORES =============
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  status public.store_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.stores enable row level security;

-- ============= STORE MEMBERS =============
create table public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'cashier',
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);
alter table public.store_members enable row level security;

-- Helper: is user member of store?
create or replace function public.is_store_member(_store_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.store_members
    where store_id = _store_id and user_id = _user_id
  );
$$;

-- Helper: is user owner of store?
create or replace function public.is_store_owner(_store_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.stores
    where id = _store_id and owner_id = _user_id
  );
$$;

-- STORES policies
create policy "stores_select_member_or_admin" on public.stores
  for select to authenticated using (
    owner_id = auth.uid()
    or public.is_store_member(id, auth.uid())
    or public.is_app_admin(auth.uid())
  );

create policy "stores_insert_owner" on public.stores
  for insert to authenticated with check (owner_id = auth.uid());

create policy "stores_update_owner_or_admin" on public.stores
  for update to authenticated using (
    owner_id = auth.uid() or public.is_app_admin(auth.uid())
  );

create policy "stores_delete_owner" on public.stores
  for delete to authenticated using (owner_id = auth.uid());

-- Auto-add owner as member when store is created
create or replace function public.handle_new_store()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end; $$;

create trigger on_store_created
  after insert on public.stores
  for each row execute function public.handle_new_store();

-- STORE_MEMBERS policies
create policy "members_select_same_store" on public.store_members
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_store_owner(store_id, auth.uid())
    or public.is_app_admin(auth.uid())
  );

create policy "members_insert_owner" on public.store_members
  for insert to authenticated with check (
    public.is_store_owner(store_id, auth.uid())
  );

create policy "members_update_owner" on public.store_members
  for update to authenticated using (
    public.is_store_owner(store_id, auth.uid())
  );

create policy "members_delete_owner" on public.store_members
  for delete to authenticated using (
    public.is_store_owner(store_id, auth.uid())
  );

-- updated_at trigger helper
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger set_updated_at_stores before update on public.stores
  for each row execute function public.tg_set_updated_at();
