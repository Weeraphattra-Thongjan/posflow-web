import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";

export const MENU_KEYS = ["dashboard", "pos", "products", "promotions", "sales", "reports", "staff"] as const;
export type MenuKey = (typeof MENU_KEYS)[number];

export interface CustomMenuItem {
  id: string;
  store_id: string;
  label: string;
  icon: string;
  content: string | null;
  link: string | null;
  sort_order: number;
}

interface MenuPrefsCtx {
  hidden: Set<MenuKey>;
  loading: boolean;
  save: (hidden: MenuKey[]) => Promise<void>;
  customItems: CustomMenuItem[];
  reloadCustom: () => Promise<void>;
  addCustom: (data: { label: string; icon: string; content?: string; link?: string }) => Promise<void>;
  updateCustom: (id: string, data: { label?: string; icon?: string; content?: string | null; link?: string | null }) => Promise<void>;
  removeCustom: (id: string) => Promise<void>;
}

const Ctx = createContext<MenuPrefsCtx | null>(null);

export function MenuPrefsProvider({ children }: { children: ReactNode }) {
  const { store } = useStore();
  const [hidden, setHidden] = useState<Set<MenuKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [customItems, setCustomItems] = useState<CustomMenuItem[]>([]);

  const isRealStore = !!store && store.id !== "__admin__";

  const load = useCallback(async () => {
    if (!store) return;
    const { data } = await supabase
      .from("store_menu_settings")
      .select("hidden_keys")
      .eq("store_id", store.id)
      .maybeSingle();
    setHidden(new Set(((data?.hidden_keys ?? []) as string[]).filter((k): k is MenuKey => (MENU_KEYS as readonly string[]).includes(k))));
    setLoading(false);
  }, [store]);

  const reloadCustom = useCallback(async () => {
    if (!isRealStore) { setCustomItems([]); return; }
    const { data } = await supabase
      .from("store_custom_menu_items")
      .select("id, store_id, label, icon, content, link, sort_order")
      .eq("store_id", store!.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setCustomItems((data ?? []) as CustomMenuItem[]);
  }, [store, isRealStore]);

  useEffect(() => { load(); reloadCustom(); }, [load, reloadCustom]);

  const save = useCallback(async (next: MenuKey[]) => {
    if (!store) return;
    await supabase
      .from("store_menu_settings")
      .upsert({ store_id: store.id, hidden_keys: next }, { onConflict: "store_id" });
    setHidden(new Set(next));
  }, [store]);

  const addCustom = useCallback(async (data: { label: string; icon: string; content?: string; link?: string }) => {
    if (!isRealStore) return;
    const sort_order = customItems.length;
    const { error } = await supabase.from("store_custom_menu_items").insert({
      store_id: store!.id,
      label: data.label,
      icon: data.icon,
      content: data.content ?? null,
      link: data.link?.trim() ? data.link.trim() : null,
      sort_order,
    });
    if (error) throw error;
    await reloadCustom();
  }, [store, isRealStore, customItems.length, reloadCustom]);

  const updateCustom = useCallback(async (id: string, data: { label?: string; icon?: string; content?: string | null; link?: string | null }) => {
    const patch: {
      label?: string; icon?: string; content?: string | null; link?: string | null;
    } = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.icon !== undefined) patch.icon = data.icon;
    if (data.content !== undefined) patch.content = data.content ?? null;
    if (data.link !== undefined) patch.link = data.link?.trim() ? data.link.trim() : null;
    const { error } = await supabase.from("store_custom_menu_items").update(patch).eq("id", id);
    if (error) throw error;
    await reloadCustom();
  }, [reloadCustom]);

  const removeCustom = useCallback(async (id: string) => {
    const { error } = await supabase.from("store_custom_menu_items").delete().eq("id", id);
    if (error) throw error;
    await reloadCustom();
  }, [reloadCustom]);

  return (
    <Ctx.Provider value={{ hidden, loading, save, customItems, reloadCustom, addCustom, updateCustom, removeCustom }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMenuPrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMenuPrefs must be inside MenuPrefsProvider");
  return ctx;
}
