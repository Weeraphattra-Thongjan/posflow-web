import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: admin } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data } = await supabase
      .from("stores")
      .select("id, name, slug, status, owner_id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!data) {
      if (admin) {
        // Admin ไม่ต้องมีร้านค้า — ใส่ placeholder เพื่อให้ผ่าน guard
        setStore({ id: "__admin__", name: "Admin", slug: "admin", status: "active", owner_id: user.id });
        setLoading(false);
        return;
      }
      navigate({ to: "/onboarding" });
      return;
    }
    setStore(data);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/signin" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return <Ctx.Provider value={{ store, loading: loading || authLoading, refresh: load }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
