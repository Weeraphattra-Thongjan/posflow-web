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

export const Route = createFileRoute("/admin-signin")({
  component: AdminSignInPage,
  head: () => ({
    meta: [{ title: "เข้าสู่ระบบผู้ดูแลระบบ | PosFlow" }],
  }),
});

const schema = z.object({
  email: z.string().trim().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

function AdminSignInPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

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
      toast.error("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ");
      return;
    }
    setLoading(false);
    toast.success("เข้าสู่ระบบผู้ดูแลระบบสำเร็จ");
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
            <h1 className="font-display text-2xl font-bold">เข้าสู่ระบบผู้ดูแลระบบ</h1>
            <p className="mt-1 text-sm text-muted-foreground">เฉพาะบัญชีที่ได้รับสิทธิ์ผู้ดูแลระบบเท่านั้น</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                เข้าสู่ระบบผู้ดูแล
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              เป็นเจ้าของร้าน?{" "}
              <Link to="/signin" className="font-medium text-primary hover:underline">
                เข้าสู่ระบบร้านค้า
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
