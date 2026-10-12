import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  component: AdminLoginPage,
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบผู้ดูแลระบบ | PosFlow" },
      { name: "description", content: "เข้าสู่ระบบผู้ดูแลระบบของแพลตฟอร์ม" },
    ],
  }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const schema = z.object({
    email: z.string().trim().email(t("auth.email_invalid")),
    password: z.string().min(1, t("auth.password_required")),
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
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
    const { data: admin } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId!)
      .maybeSingle();
    if (!admin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error(t("auth.admin.no_rights"));
      return;
    }
    setLoading(false);
    toast.success(t("auth.admin.success"));
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("auth.admin.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.admin.subtitle")}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.admin.btn")}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
              <p>
                {t("auth.admin.is_owner")}{" "}
                <Link to="/signin" className="font-medium text-primary hover:underline">
                  {t("auth.admin.store_signin")}
                </Link>
              </p>
              <p className="text-xs">
                {t("auth.admin.request")} <span className="font-medium">66160121@go.buu.ac.th</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
