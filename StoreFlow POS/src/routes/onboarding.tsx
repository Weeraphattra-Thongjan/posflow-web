import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [{ title: "ตั้งค่าร้าน | PosFlow" }],
  }),
});

const schema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อร้าน").max(100),
  slug: z
    .string()
    .trim()
    .min(3, "URL ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "ใช้ได้เฉพาะ a-z, 0-9, และเครื่องหมาย -"),
  description: z.string().max(500).optional(),
});

function slugify(s: string) {
  const cleaned = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  if (cleaned.length >= 3) return cleaned;
  return "store-" + Math.random().toString(36).slice(2, 8);
}

function sanitizeSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
}

function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [autoSlug, setAutoSlug] = useState(true);

  // 1. เช็กสถานะการล็อกอิน
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/signin", replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleNameChange = (val: string) => {
    setForm((f) => ({ ...f, name: val, slug: autoSlug ? slugify(val) : f.slug }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("stores").insert({
      owner_id: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
    });
    
    if (error) {
      setLoading(false);
      if (error.code === "23505") toast.error("URL ร้านนี้ถูกใช้แล้ว กรุณาเลือกใหม่");
      else toast.error(error.message);
      return;
    }

    toast.success("สร้างร้านสำเร็จ!");
    setLoading(false);
    
    // เปลี่ยนมาใช้ TanStack Router Navigate แทน window.location.href
    navigate({ to: "/dashboard", replace: true });
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("onb.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("onb.subtitle")}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("onb.name")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ร้านของฉัน"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">{t("onb.slug")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">posflow.app/</span>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      setForm({ ...form, slug: sanitizeSlug(e.target.value) });
                    }}
                    placeholder="my-store"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">ใช้ได้เฉพาะ a-z, 0-9 และ - เท่านั้น (พิมพ์ภาษาไทยไม่ได้)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">{t("onb.desc")}</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("onb.create")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}