import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Store {
  id: string;
  name: string;
  slug: string;
  status: string;
  owner_id: string;
}

interface StoreCtx {
  store: Store | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setStore(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: admin }, { data }] = await Promise.all([
        supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("stores").select("id, name, slug, status, owner_id").eq("owner_id", user.id).limit(1).maybeSingle(),
      ]);

      if (!data && admin) {
        setStore({ id: "__admin__", name: "Admin", slug: "admin", status: "active", owner_id: user.id });
      } else {
        setStore(data ?? null);
      }
    } catch (err) {
      console.error("Error loading store:", err);
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [user, authLoading, load]);

  return <Ctx.Provider value={{ store, loading: loading || authLoading, refresh: load }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}