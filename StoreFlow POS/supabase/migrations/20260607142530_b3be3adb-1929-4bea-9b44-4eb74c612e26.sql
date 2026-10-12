
CREATE TABLE public.store_custom_menu_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.store_custom_menu_items(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_entries_menu ON public.store_custom_menu_entries(menu_item_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_custom_menu_entries TO authenticated;
GRANT ALL ON public.store_custom_menu_entries TO service_role;

ALTER TABLE public.store_custom_menu_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_entries_select ON public.store_custom_menu_entries
  FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));

CREATE POLICY custom_entries_insert ON public.store_custom_menu_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY custom_entries_update ON public.store_custom_menu_entries
  FOR UPDATE TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY custom_entries_delete ON public.store_custom_menu_entries
  FOR DELETE TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()));

CREATE TRIGGER update_custom_entries_updated_at
  BEFORE UPDATE ON public.store_custom_menu_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
