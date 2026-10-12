
-- 1. Constraints on sale_items to prevent negative quantities and falsified totals
ALTER TABLE public.sale_items
  ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT chk_unit_price_nonneg CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_line_total CHECK (line_total = unit_price * quantity);

-- 2. Validate sales totals via BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.tg_validate_sale_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.subtotal < 0 OR new.discount < 0 OR new.total < 0 THEN
    RAISE EXCEPTION 'sales amounts must be non-negative';
  END IF;
  IF new.discount > new.subtotal THEN
    RAISE EXCEPTION 'discount cannot exceed subtotal';
  END IF;
  IF round(new.total::numeric, 2) <> round((new.subtotal - new.discount)::numeric, 2) THEN
    RAISE EXCEPTION 'total must equal subtotal - discount';
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS trg_validate_sale_totals ON public.sales;
CREATE TRIGGER trg_validate_sale_totals
BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_sale_totals();

-- 3. Set search_path on the one function missing it
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END $$;

-- 4. Lock down SECURITY DEFINER helpers that should never be called directly by users.
-- Trigger functions and internal helpers: revoke EXECUTE from anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_store() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_receipt_no() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_deduct_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_validate_sale_totals() FROM PUBLIC, anon, authenticated;
-- RLS-helper functions (is_store_member, is_store_owner, is_app_admin) MUST remain
-- executable by authenticated since they are referenced inside RLS policy expressions.

-- 5. Allow invited staff to view their own invitations (so accept flow can work)
CREATE POLICY "invites_select_invitee"
ON public.staff_invites
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 6. Prevent store_members role/store escalation via UPDATE — add WITH CHECK
DROP POLICY IF EXISTS members_update_owner ON public.store_members;
CREATE POLICY members_update_owner
ON public.store_members
FOR UPDATE
TO authenticated
USING (is_store_owner(store_id, auth.uid()))
WITH CHECK (is_store_owner(store_id, auth.uid()));
