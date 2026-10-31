import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Store as StoreIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: AcceptInvitePage,
});

type InviteInfo = {
  store_id: string;
  store_name: string;
  email: string;
  role: string;
  status: string;
  has_account?: boolean;
};

type View = "loading" | "invalid" | "used" | "other-account" | "join" | "login" | "form";

const MIN_PASSWORD = 6;
const ACTIVE_STORE_KEY = "pos_active_store_id";

// เรียก Edge Function "accept-invite" แล้วอ่าน error message จาก body ให้ถูก
async function callInvite(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("accept-invite", { body });
  if (!error) return { data, error: null as null | { message: string; code?: string } };

  let message = error.message;
  let code: string | undefined;
  try {
    const res = (error as any).context as Response | undefined;
    const parsed = res ? await res.json() : null;
    if (parsed?.error) message = parsed.error;
    code = parsed?.code;
  } catch {
    /* ใช้ข้อความเดิม */
  }
  return { data: null, error: { message, code } };
}

// rpc ยังไม่มีใน type ที่ generate ไว้
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: any; error: { message: string } | null }>;

function goToStore(storeId: string) {
  try {
    localStorage.setItem(ACTIVE_STORE_KEY, storeId);
    // เพิ่งเลือกร้านจากลิงก์คำเชิญแล้ว ไม่ต้องขึ้นหน้าเลือกร้านซ้ำ
    sessionStorage.setItem("pos_store_chosen", "1");
  } catch {
    /* ไม่เป็นไร */
  }
  // โหลดใหม่ทั้งหน้า ให้ StoreProvider ดึงร้านที่เพิ่งเข้าร่วม
  window.location.assign("/pos");
}

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const { session, loading: authLoading, signOut } = useAuth();

  const [view, setView] = useState<View>("loading");
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. ดึงข้อมูลคำเชิญจาก token
  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setMessage("ลิงก์คำเชิญไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากเจ้าของร้าน");
      setView("invalid");
      return;
    }

    (async () => {
      const { data, error } = await callInvite({ action: "info", token });
      if (error || !data) {
        setMessage(error?.message ?? "ไม่พบคำเชิญ");
        setView("invalid");
        return;
      }

      const info = data as InviteInfo;
      setInvite(info);

      const currentEmail = session?.user.email?.toLowerCase();

      if (currentEmail && currentEmail !== info.email) {
        setView("other-account"); // ล็อกอินเป็นคนอื่นอยู่
      } else if (currentEmail === info.email) {
        setView("join"); // ล็อกอินด้วยอีเมลนี้อยู่แล้ว กดเข้าร้านได้เลย
      } else if (info.status === "accepted") {
        setView("used");
      } else if (info.has_account) {
        setView("login"); // มีบัญชีอยู่แล้ว → ใส่รหัสเดิมเพื่อเข้าร้าน
      } else {
        setView("form");
      }
    })();
  }, [authLoading, session?.user.email, token]);

  // 2. ตั้งรหัสผ่าน → สร้างบัญชี → ล็อกอิน → เข้าร้าน
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    if (password.length < MIN_PASSWORD) {
      toast.error(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
      return;
    }
    if (password !== confirm) {
      toast.error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await callInvite({ action: "accept", token, password });
      if (error) {
        if (error.code === "user_exists") {
          // มีบัญชีอยู่แล้ว → สลับไปให้ใส่รหัสเดิม
          setPassword("");
          setConfirm("");
          setView("login");
          toast.info("อีเมลนี้มีบัญชีอยู่แล้ว กรุณาใส่รหัสผ่านเดิม");
          return;
        }
        if (error.code === "used") {
          setMessage(error.message);
          setView("used");
          return;
        }
        throw new Error(error.message);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInError) throw signInError;

      toast.success(`เข้าสู่ร้าน ${invite.store_name} สำเร็จ!`);
      goToStore(invite.store_id);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message ?? "ไม่สามารถตอบรับคำเชิญได้"));
    } finally {
      setSubmitting(false);
    }
  };

  // มีบัญชีอยู่แล้ว (เช่น พนักงานเก่าถูกเชิญกลับ) → ล็อกอินด้วยรหัสเดิม แล้วตอบรับ
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (!password) {
      toast.error("กรุณากรอกรหัสผ่าน");
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInError) {
        throw new Error(
          /invalid/i.test(signInError.message)
            ? "รหัสผ่านไม่ถูกต้อง ถ้าจำไม่ได้ กด \"ลืมรหัสผ่าน?\""
            : signInError.message
        );
      }

      const { error } = await rpc("accept_staff_invite", { p_store_id: invite.store_id });
      if (error) throw new Error(error.message);

      toast.success(`เข้าสู่ร้าน ${invite.store_name} สำเร็จ!`);
      goToStore(invite.store_id);
    } catch (err: any) {
      toast.error(err?.message ?? "ไม่สามารถเข้าร้านได้");
    } finally {
      setSubmitting(false);
    }
  };

  // ล็อกอินด้วยอีเมลที่ถูกเชิญอยู่แล้ว → แค่ตอบรับ
  const handleJoin = async () => {
    if (!invite) return;
    setSubmitting(true);
    try {
      const { error } = await rpc("accept_staff_invite", { p_store_id: invite.store_id });
      if (error) throw new Error(error.message);
      toast.success(`เข้าสู่ร้าน ${invite.store_name} สำเร็จ!`);
      goToStore(invite.store_id);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message ?? "ไม่สามารถเข้าร้านได้"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      localStorage.removeItem(ACTIVE_STORE_KEY);
    } catch {
      /* ไม่เป็นไร */
    }
    await signOut();
    window.location.reload();
  };

  const roleLabel = invite?.role === "owner" ? "เจ้าของร้าน" : "พนักงานขาย";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        {view === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium text-foreground">กำลังตรวจสอบคำเชิญ...</p>
          </div>
        )}

        {view === "invalid" && (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-bold">ไม่สามารถใช้คำเชิญนี้ได้</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/" })}>
              กลับหน้าแรก
            </Button>
          </div>
        )}

        {view === "used" && (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-bold">คำเชิญนี้ใช้งานแล้ว</h1>
            <p className="text-sm text-muted-foreground">
              {message ||
                `เข้าสู่ระบบด้วย ${invite?.email ?? "อีเมลของคุณ"} และรหัสผ่านที่ตั้งไว้ได้เลย`}
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/signin" })}>
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </div>
        )}

        {view === "other-account" && invite && (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-bold">ล็อกอินด้วยบัญชีอื่นอยู่</h1>
            <p className="text-sm text-muted-foreground">
              ตอนนี้คุณใช้ {session?.user.email} แต่คำเชิญนี้เป็นของ {invite.email}
              ออกจากระบบก่อนแล้วลองเปิดลิงก์อีกครั้ง
            </p>
            <Button className="w-full" onClick={handleSwitchAccount}>
              ออกจากระบบและใช้คำเชิญนี้
            </Button>
          </div>
        )}

        {view === "join" && invite && (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <StoreIcon className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-xl font-bold">คุณได้รับเชิญเข้าร้าน {invite.store_name}</h1>
            <p className="text-sm text-muted-foreground">ตำแหน่ง: {roleLabel}</p>
            <Button className="w-full" onClick={handleJoin} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              เข้าร้าน
            </Button>
          </div>
        )}

        {view === "login" && invite && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <StoreIcon className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold">คุณได้รับเชิญเข้าร้าน {invite.store_name}</h1>
              <p className="text-sm text-muted-foreground">
                ตำแหน่ง: {roleLabel} · อีเมลนี้มีบัญชีอยู่แล้ว ใส่รหัสผ่านเดิมเพื่อเข้าร้าน
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">อีเมล</label>
              <Input value={invite.email} disabled />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">รหัสผ่าน</label>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/forgot-password" })}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบและเข้าร้าน"
              )}
            </Button>
          </form>
        )}

        {view === "form" && invite && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <StoreIcon className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold">คุณได้รับเชิญเข้าร้าน {invite.store_name}</h1>
              <p className="text-sm text-muted-foreground">
                ตำแหน่ง: {roleLabel} · ตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบ
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">อีเมล</label>
              <Input value={invite.email} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ตั้งรหัสผ่าน</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder={`อย่างน้อย ${MIN_PASSWORD} ตัวอักษร`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ยืนยันรหัสผ่าน</label>
              <Input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                "ตั้งรหัสผ่านและเข้าร้าน"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}