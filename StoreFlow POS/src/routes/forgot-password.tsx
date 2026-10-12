import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Loader2, Check, ArrowLeft, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "ลืมรหัสผ่าน | PosFlow" },
      { name: "description", content: "รีเซ็ตรหัสผ่านบัญชี PosFlow ของคุณ" },
    ],
  }),
});

const schema = z.object({ email: z.string().trim().email("อีเมลไม่ถูกต้อง") });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">ลืมรหัสผ่าน</h1>
            <p className="mt-1 text-sm text-muted-foreground">กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <MailCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium">ตรวจสอบอีเมลของคุณ</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่ <span className="font-medium text-foreground">{email}</span> แล้ว
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                  ส่งอีกครั้ง
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">อีเมล</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pr-9"
                    />
                    {emailValid && (
                      <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !emailValid}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ส่งลิงก์รีเซ็ตรหัสผ่าน
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/signin" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
