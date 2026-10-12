
CREATE OR REPLACE FUNCTION public.admin_add_by_email(_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: only super admin can add admins';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  INSERT INTO public.app_admins (user_id, is_super) VALUES (_uid, false)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN _uid;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_add_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_add_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_by_email(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: only super admin can remove admins';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RETURN; END IF;
  DELETE FROM public.app_admins WHERE user_id = _uid AND is_super = false;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_remove_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list()
RETURNS TABLE(user_id uuid, email text, is_super boolean, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT a.user_id, u.email::text, a.is_super, a.created_at
    FROM public.app_admins a JOIN auth.users u ON u.id = a.user_id
    ORDER BY a.is_super DESC, a.created_at ASC;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list() TO authenticated;
