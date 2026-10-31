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

// ร้านที่ผู้ใช้เข้าได้ พร้อมตำแหน่งในร้านนั้น
export interface StoreOption {
  store: Store;
  role: StoreRole;
}

interface StoreCtx {
  store: Store | null;
  role: StoreRole | null;
  stores: StoreOption[]; // ร้านทั้งหมดที่เข้าได้ (ใช้ทำปุ่มสลับร้าน)
  loading: boolean;
  refresh: () => Promise<void>;
  switchStore: (storeId: string) => void;
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

function writeActiveStoreId(id: string) {
  try {
    localStorage.setItem(ACTIVE_STORE_KEY, id);
  } catch {
    /* ไม่เป็นไร */
  }
}

const STORE_COLUMNS = "id, name, slug, status, owner_id";

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [role, setRole] = useState<StoreRole | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);

  const applyChoice = useCallback((options: StoreOption[]) => {
    // เลือกร้านที่เคยใช้ล่าสุด ถ้าไม่มีให้ใช้ร้านที่เป็นเจ้าของก่อน แล้วค่อยร้านที่เป็นพนักงาน
    const activeId = readActiveStoreId();
    const chosen =
      options.find((o) => o.store.id === activeId) ??
      options.find((o) => o.role === "owner") ??
      options[0];

    setStore(chosen?.store ?? null);
    setRole(chosen?.role ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setStore(null);
      setRole(null);
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      // 1. ร้านที่เป็นเจ้าของ
      const { data: owned, error: ownedError } = await supabase
        .from("stores")
        .select(STORE_COLUMNS)
        .eq("owner_id", user.id);
      if (ownedError) console.error("Store fetch error:", ownedError);

      // 2. ร้านที่เป็นพนักงาน (store_members)
      const { data: memberships, error: memberError } = await supabase
        .from("store_members")
        .select("store_id, role")
        .eq("user_id", user.id);
      if (memberError) console.error("Membership fetch error:", memberError);

      const ownedIds = new Set((owned ?? []).map((s) => s.id));
      const memberRows = (memberships ?? []).filter((m) => !ownedIds.has(m.store_id));

      let memberStores: Store[] = [];
      if (memberRows.length > 0) {
        const { data, error } = await supabase
          .from("stores")
          .select(STORE_COLUMNS)
          .in(
            "id",
            memberRows.map((m) => m.store_id)
          );
        if (error) console.error("Member stores fetch error:", error);
        memberStores = (data ?? []) as Store[];
      }

      const options: StoreOption[] = [
        ...((owned ?? []) as Store[]).map((s) => ({ store: s, role: "owner" as const })),
        ...memberStores.map((s) => {
          const m = memberRows.find((r) => r.store_id === s.id);
          return { store: s, role: (m?.role === "owner" ? "owner" : "cashier") as StoreRole };
        }),
      ];

      if (options.length > 0) {
        setStores(options);
        applyChoice(options);
        return;
      }

      // 3. ไม่มีร้าน → เช็กสิทธิ์ Admin
      const { data: admin } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setStores([]);
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
  }, [user, applyChoice]);

  const switchStore = useCallback(
    (storeId: string) => {
      const next = stores.find((o) => o.store.id === storeId);
      if (!next) return;
      writeActiveStoreId(storeId);
      setStore(next.store);
      setRole(next.role);
    },
    [stores]
  );

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [user, authLoading, load]);

  return (
    <Ctx.Provider
      value={{ store, role, stores, loading: loading || authLoading, refresh: load, switchStore }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}