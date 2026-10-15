import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. ดึง subscription ออกมาจาก data โดยตรง
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    // 2. ดึง Session ครั้งแรกอย่างปลอดภัย
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
      }
      setLoading(false);
    });

    // 3. Unsubscribe เสมอเมื่อ unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ ล็อค Reference ของ signOut ไม่ให้สร้างใหม่ทุกรอบ
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const user = session?.user ?? null;

  // ✅ ล็อค Value Object ด้วย useMemo เพื่อหยุด Re-render Loop ทั่วทั้งแอป
  const value = useMemo(
    () => ({ session, user, loading, signOut }),
    [session, user, loading, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}