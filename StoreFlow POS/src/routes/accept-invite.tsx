import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Store as StoreIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    store_id: typeof search.store_id === "string" ? search.store_id : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: AcceptInvitePage,
});

type InviteInfo = { store_name: string; role: string; status: string };
type View = "loading" | "no-session" | "invalid" | "form";

const MIN_PASSWORD = 6;

// rpc ใหม่ยังไม่มีใน type ที่ generate ไว้ ใช้ any ไปก่อน (regenerate types แล้วลบได้)
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: any; error: { message: string } | null }>;

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { store_id } = Route.useSearch();
  const { session, loading: authLoading } = useAuth();
  const { refresh } = useStore();

  const [view, setView] = useState<View>("loading");
  const [invalidMsg, setInvalidMsg] = useState("ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุ");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. ตรวจ session (Magic Link) และดึงข้อมูลคำเชิญ
  useEffect(() => {
    if (authLoading) return;

    if (!store_id) {
      setInvalidMsg("ลิงก์คำเชิญไม่ถูกต้อง");
      setView("invalid");
      return;
    }

    if (!session) {
      setView("no-session");
      return;
    }

    (async () => {
      const { data, error } = await rpc("get_my_invite", { p_store_id: store_id });
      const row: InviteInfo | undefined = Array.isArray(data) ? data[0] : data;

      if (error || !row) {
        setInvalidMsg(
          `ไม่พบคำเชิญสำหรับ ${session.user.email ?? "อีเมลนี้"} กรุณาติดต่อเจ้าของร้านให้เชิญใหม่`
        );
        setView("invalid");
        return;
      }

      setInvite(row);
      setView("form");
    })();
  }, [authLoading, session, store_id]);

  // ตอบรับคำเชิญแล้วเข้าร้าน
  const joinStore = async () => {
    const { error } = await rpc("accept_staff_invite", { p_store_id: store_id });
    if (error) throw new Error(error.message);

    try {
      localStorage.setItem("pos_active_store_id", store_id!);
    } catch {
      /* ไม่เป็นไร */
    }

    await refresh();
    toast.success(`เข้าสู่ร้าน ${invite?.store_name ?? ""} สำเร็จ!`);
    navigate({ to: "/pos" });
  };

  // 2. ตั้งรหัสผ่าน + ตอบรับคำเชิญ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { error } = await supabase.auth.updateUser({ password });
      // ถ้าเคยตั้งรหัสนี้ไว้แล้ว Supabase จะแจ้งว่าต้องต่างจากเดิม ให้ข้ามไปได้
      if (error && !/different/i.test(error.message)) throw error;

      await joinStore();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message ?? "ไม่สามารถตอบรับคำเชิญได้"));
    } finally {
      setSubmitting(false);
    }
  };

  // กรณีตั้งรหัสไว้แล้ว (กดลิงก์ซ้ำ)
  const handleSkip = async () => {
    setSubmitting(true);
    try {
      await joinStore();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message ?? "ไม่สามารถเข้าร้านได้"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        {view === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium text-foreground">กำลังตรวจสอบคำเชิญ...</p>
          </div>
        )}

        {view === "no-session" && (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-bold">ลิงก์หมดอายุหรือถูกใช้ไปแล้ว</h1>
            <p className="text-sm text-muted-foreground">
              ถ้าตั้งรหัสผ่านไว้แล้ว เข้าสู่ระบบด้วยอีเมลและรหัสผ่านได้เลย
              ถ้ายังไม่ได้ตั้ง ให้เจ้าของร้านส่งลิงก์เชิญใหม่
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/signin" })}>
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </div>
        )}

        {view === "invalid" && (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-bold">ไม่สามารถใช้คำเชิญนี้ได้</h1>
            <p className="text-sm text-muted-foreground">{invalidMsg}</p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/" })}>
              กลับหน้าแรก
            </Button>
          </div>
        )}

        {view === "form" && invite && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <StoreIcon className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold">คุณได้รับเชิญเข้าร้าน {invite.store_name}</h1>
              <p className="text-sm text-muted-foreground">
                ตำแหน่ง: {invite.role === "owner" ? "เจ้าของร้าน" : "พนักงานขาย"} ·
                ตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบครั้งต่อไป
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">อีเมล</label>
              <Input value={session?.user.email ?? ""} disabled />
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

            {invite.status === "accepted" && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                ตั้งรหัสผ่านไว้แล้ว เข้าร้านเลย
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}