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

export type StoreRole = "owner" | "cashier" | "admin";

interface StoreCtx {
  store: Store | null;
  role: StoreRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

export const ACTIVE_STORE_KEY = "pos_active_store_id";

function readActiveStoreId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STORE_KEY);
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [role, setRole] = useState<StoreRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setStore(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // 1. ร้านที่ตัวเองเป็นเจ้าของ
      const { data: owned, error: ownedError } = await supabase
        .from("stores")
        .select("id, name, slug, status, owner_id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ownedError) console.error("Store fetch error:", ownedError);

      if (owned) {
        setStore(owned);
        setRole("owner");
        return;
      }

      // 2. ร้านที่ถูกเชิญเป็นพนักงาน (store_members)
      const { data: memberships, error: memberError } = await supabase
        .from("store_members")
        .select("store_id, role")
        .eq("user_id", user.id);

      if (memberError) console.error("Membership fetch error:", memberError);

      if (memberships && memberships.length > 0) {
        // ถ้าเคยเลือกร้านไว้ (เช่น จากหน้า accept-invite) ใช้ร้านนั้นก่อน
        const activeId = readActiveStoreId();
        const chosen =
          memberships.find((m) => m.store_id === activeId) ?? memberships[0];

        const { data: memberStore, error: storeError } = await supabase
          .from("stores")
          .select("id, name, slug, status, owner_id")
          .eq("id", chosen.store_id)
          .maybeSingle();

        if (storeError) console.error("Member store fetch error:", storeError);

        if (memberStore) {
          setStore(memberStore);
          setRole(chosen.role === "owner" ? "owner" : "cashier");
          return;
        }
      }

      // 3. เช็กสิทธิ์ Admin ถ้าไม่มีร้าน
      const { data: admin } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (admin) {
        setStore({ id: "__admin__", name: "Admin", slug: "admin", status: "active", owner_id: user.id });
        setRole("admin");
      } else {
        setStore(null);
        setRole(null);
      }
    } catch (err) {
      console.error("Error loading store:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [user, authLoading, load]);

  return (
    <Ctx.Provider value={{ store, role, loading: loading || authLoading, refresh: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}