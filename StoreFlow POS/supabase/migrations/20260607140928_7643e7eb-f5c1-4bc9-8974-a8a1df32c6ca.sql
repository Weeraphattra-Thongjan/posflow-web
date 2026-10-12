
-- 1) Add link column for custom menu items
ALTER TABLE public.store_custom_menu_items
  ADD COLUMN IF NOT EXISTS link TEXT;

-- 2) Tighten UPDATE policies with WITH CHECK to prevent cross-tenant relocation
DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories
  FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

DROP POLICY IF EXISTS promotions_update ON public.promotions;
CREATE POLICY promotions_update ON public.promotions
  FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

-- 3) staff_invites update: keep owner-scoped on both sides
DROP POLICY IF EXISTS invites_update ON public.staff_invites;
CREATE POLICY invites_update ON public.staff_invites
  FOR UPDATE TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

-- 4) stores update: prevent arbitrary ownership transfer
DROP POLICY IF EXISTS stores_update_owner_or_admin ON public.stores;
CREATE POLICY stores_update_owner_or_admin ON public.stores
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_app_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_app_admin(auth.uid()));
