
-- 1. Super admin support
ALTER TABLE public.app_admins ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false;

-- Helper: check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.app_admins WHERE user_id = _user_id AND is_super = true);
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon;

-- Auto-grant super admin to the creator email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  if lower(new.email) = '66160121@go.buu.ac.th' then
    insert into public.app_admins (user_id, is_super) values (new.id, true)
    on conflict (user_id) do update set is_super = true;
  end if;
  return new;
end; $$;

-- If the super admin already exists in auth.users, ensure the row is present
INSERT INTO public.app_admins (user_id, is_super)
SELECT id, true FROM auth.users WHERE lower(email) = '66160121@go.buu.ac.th'
ON CONFLICT (user_id) DO UPDATE SET is_super = true;

-- Allow super admin to insert/delete app_admins; everyone else cannot
DROP POLICY IF EXISTS admins_insert_super ON public.app_admins;
CREATE POLICY admins_insert_super ON public.app_admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS admins_delete_super ON public.app_admins;
CREATE POLICY admins_delete_super ON public.app_admins
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) AND is_super = false);

DROP POLICY IF EXISTS admins_select_self ON public.app_admins;
CREATE POLICY admins_select_super_or_self ON public.app_admins
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 2. Per-store sidebar menu preferences
CREATE TABLE IF NOT EXISTS public.store_menu_settings (
  store_id uuid PRIMARY KEY,
  hidden_keys text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_menu_settings TO authenticated;
GRANT ALL ON public.store_menu_settings TO service_role;

ALTER TABLE public.store_menu_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_settings_select ON public.store_menu_settings
  FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()) OR public.is_app_admin(auth.uid()));

CREATE POLICY menu_settings_insert ON public.store_menu_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY menu_settings_update ON public.store_menu_settings
  FOR UPDATE TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY menu_settings_delete ON public.store_menu_settings
  FOR DELETE TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()));

CREATE TRIGGER trg_menu_settings_updated
  BEFORE UPDATE ON public.store_menu_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
