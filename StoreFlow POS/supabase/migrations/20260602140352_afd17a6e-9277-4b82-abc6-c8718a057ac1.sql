
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'closed');

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  store_id UUID,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_admin(auth.uid()));

CREATE POLICY "tickets_update_admin" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "tickets_delete_admin" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.is_app_admin(auth.uid()));

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
