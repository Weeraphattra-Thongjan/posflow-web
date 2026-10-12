
CREATE TABLE public.store_custom_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Star',
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_custom_menu_items TO authenticated;
GRANT ALL ON public.store_custom_menu_items TO service_role;

ALTER TABLE public.store_custom_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage custom menu items"
ON public.store_custom_menu_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Members can view custom menu items"
ON public.store_custom_menu_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = store_custom_menu_items.store_id AND m.user_id = auth.uid()));

CREATE INDEX idx_store_custom_menu_items_store ON public.store_custom_menu_items(store_id, sort_order);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_store_custom_menu_items_updated_at
BEFORE UPDATE ON public.store_custom_menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
