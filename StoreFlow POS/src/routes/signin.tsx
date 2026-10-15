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
import { Store, Loader2, Check, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ | PosFlow" },
      { name: "description", content: "เข้าสู่ระบบเพื่อจัดการร้านของคุณ" },
    ],
  }),
});

const schema = z.object({
  email: z.string().trim().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

function SignInPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const userId = signInData.user?.id;
    if (userId) {
      const { data: admin } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (admin) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("บัญชีผู้ดูแลระบบ กรุณาเข้าสู่ระบบที่หน้าผู้ดูแล");
        navigate({ to: "/login" });
        return;
      }
    }
    setLoading(false);
    toast.success("เข้าสู่ระบบสำเร็จ!");
    navigate({ to: "/dashboard" });
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
            <h1 className="font-display text-2xl font-bold">{t("auth.signin.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.signin.subtitle")}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    {t("auth.forgot")}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-16"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {passwordValid && <Check className="h-4 w-4 text-emerald-500" />}
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {!passwordValid && (
                  <p className="text-xs text-muted-foreground">{t("auth.password_required")}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading || !emailValid || !passwordValid}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.signin.btn")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.no")}{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                {t("auth.signup.btn")}
              </Link>
            </p>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              {t("auth.is_admin")}{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t("auth.admin_signin")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}