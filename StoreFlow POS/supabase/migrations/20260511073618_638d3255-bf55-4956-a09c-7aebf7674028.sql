-- Make seed_demo_data a no-op so new stores start empty
CREATE OR REPLACE FUNCTION public.seed_demo_data(_store_id uuid, _owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- intentionally empty: stores start with no demo data
  return;
end $function$;

-- Clear existing demo data from all stores
DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.promotions;
DELETE FROM public.products;
DELETE FROM public.categories;