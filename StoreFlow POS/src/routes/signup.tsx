import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Store, Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  head: () => ({
    meta: [{ title: "สมัครใช้งาน | PosFlow" }, { name: "description", content: "สร้างบัญชีใหม่เพื่อเริ่มใช้งาน PosFlow" }],
  }),
});

const schema = z.object({
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(255),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").max(100),
});

function SignUpPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        toast.error("อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ");
        navigate({ to: "/signin" });
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("สร้างบัญชีสำเร็จ!");
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("auth.signup.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.signup.subtitle")}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t("auth.fullname")}</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.signup.btn")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.have")}{" "}
              <Link to="/signin" className="font-medium text-primary hover:underline">
                {t("auth.signin.btn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
