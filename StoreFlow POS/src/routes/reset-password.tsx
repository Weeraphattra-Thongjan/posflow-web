import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Loader2, Check, X, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "ตั้งรหัสผ่านใหม่ | PosFlow" },
      { name: "description", content: "ตั้งรหัสผ่านใหม่สำหรับบัญชี PosFlow" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่ามี session recovery (Supabase จะตั้ง session ให้อัตโนมัติเมื่อเปิดลิงก์)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
        navigate({ to: "/forgot-password" });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const lenOk = password.length >= 6;
  const matchOk = password.length > 0 && password === confirm;
  const canSubmit = lenOk && matchOk;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("เปลี่ยนรหัสผ่านสำเร็จ!");
    navigate({ to: "/dashboard" });
  };

  const Rule = ({ ok, text }: { ok: boolean; text: string }) => (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {text}
    </li>
  );

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
            <p className="mt-1 text-sm text-muted-foreground">กรอกรหัสผ่านใหม่ของคุณด้านล่าง</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            {!ready ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">รหัสผ่านใหม่</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className="pr-9"
                    />
                    {matchOk && (
                      <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>

                <ul className="space-y-1 rounded-lg bg-muted/50 p-3">
                  <Rule ok={lenOk} text="อย่างน้อย 6 ตัวอักษร" />
                  <Rule ok={matchOk} text="รหัสผ่านทั้งสองช่องตรงกัน" />
                </ul>

                <Button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  เปลี่ยนรหัสผ่าน
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
