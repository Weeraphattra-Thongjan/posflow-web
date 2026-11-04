import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/promotions")({
  component: PromosPage,
  head: () => ({ meta: [{ title: "Promotions | PosFlow" }] }),
});

interface Promo {
  id: string; name: string; code: string | null;
  discount_type: "percent" | "amount"; discount_value: number;
  min_purchase: number; is_active: boolean;
  starts_at: string | null; ends_at: string | null;
}

const empty = {
  name: "", code: "",
  discount_type: "percent" as "percent" | "amount", discount_value: 0, min_purchase: 0,
  is_active: true,
  starts_on: "", ends_on: "", // วันที่ในรูปแบบ YYYY-MM-DD (เว้นว่าง = ไม่จำกัด)
};

// ทำให้เทียบชื่อ/โค้ดได้แม่น: ตัดช่องว่างหัวท้าย และไม่สนตัวพิมพ์เล็ก-ใหญ่
const normName = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const normCode = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, "").toUpperCase();

// สถานะตามช่วงวัน: ยังไม่เริ่ม / หมดอายุ / ใช้งานได้
function dateStatus(p: Pick<Promo, "starts_at" | "ends_at">): "upcoming" | "expired" | "ok" {
  const now = Date.now();
  if (p.starts_at && now < new Date(p.starts_at).getTime()) return "upcoming";
  if (p.ends_at && now > new Date(p.ends_at).getTime()) return "expired";
  return "ok";
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

function PromosPage() {
  const { store } = useStore();
  const { t } = useI18n();
  const [items, setItems] = useState<Promo[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from("promotions").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    setItems((data ?? []) as Promo[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store]);

  // ตรวจข้อมูลก่อนบันทึก: คืนข้อความผิดพลาด (ภาษาไทย) หรือ null ถ้าผ่าน
  const validate = (): string | null => {
    const name = form.name.trim();
    const code = normCode(form.code);
    if (!name) return "กรุณากรอกชื่อโปรโมชัน";
    if (code && !/^[A-Z0-9_-]+$/.test(code)) return "โค้ดใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข - และ _";
    if (code && normName(name) === code.toLowerCase()) return "ชื่อโปรโมชันกับโค้ดต้องไม่เหมือนกัน";
    if (items.some((p) => normName(p.name) === normName(name))) return `ชื่อโปรโมชัน "${name}" มีอยู่แล้ว`;
    if (code && items.some((p) => normCode(p.code) === code)) return `โค้ด "${code}" มีอยู่แล้ว`;
    if (!(form.discount_value > 0)) return "มูลค่าส่วนลดต้องมากกว่า 0";
    if (form.discount_type === "percent" && form.discount_value > 100) return "ส่วนลดแบบเปอร์เซ็นต์ต้องไม่เกิน 100%";
    if (form.min_purchase < 0) return "ยอดซื้อขั้นต่ำต้องไม่ติดลบ";
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) return "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น";
    return null;
  };

  const save = async () => {
    if (!store || saving) return;
    const err = validate();
    if (err) return toast.error(err);

    setSaving(true);
    const code = normCode(form.code);
    const { error } = await supabase.from("promotions").insert({
      store_id: store.id,
      name: form.name.trim(),
      code: code || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_purchase: form.min_purchase,
      is_active: form.is_active,
      // เริ่มต้นตอน 00:00 ของวันเริ่ม / สิ้นสุดตอน 23:59:59 ของวันสุดท้าย (ตามเวลาเครื่อง)
      starts_at: form.starts_on ? new Date(`${form.starts_on}T00:00:00`).toISOString() : null,
      ends_at: form.ends_on ? new Date(`${form.ends_on}T23:59:59`).toISOString() : null,
    });
    setSaving(false);

    if (error) {
      // กันกรณีมีคนสร้างชื่อ/โค้ดเดียวกันพร้อมกัน: ฐานข้อมูลปฏิเสธด้วยรหัส 23505 (ข้อมูลซ้ำ)
      if (error.code === "23505") {
        return toast.error(error.message.includes("code") ? `โค้ด "${code}" มีอยู่แล้ว` : "ชื่อโปรโมชันนี้มีอยู่แล้ว");
      }
      return toast.error(error.message);
    }
    toast.success("บันทึกโปรโมชันแล้ว");
    setOpen(false); setForm({ ...empty }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("ต้องการลบโปรโมชันนี้ใช่หรือไม่?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ลบโปรโมชันแล้ว");
    load();
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("promotions").update({ is_active: !currentStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!currentStatus ? "เปิดใช้งานโปรโมชันแล้ว" : "ปิดใช้งานโปรโมชันแล้ว");
    load();
  };

  // แจ้งเตือนทันทีขณะพิมพ์ ถ้าชื่อ/โค้ดซ้ำหรือชื่อกับโค้ดเหมือนกัน
  const nameDup = !!form.name.trim() && items.some((p) => normName(p.name) === normName(form.name));
  const codeNorm = normCode(form.code);
  const codeDup = !!codeNorm && items.some((p) => normCode(p.code) === codeNorm);
  const sameAsName = !!codeNorm && normName(form.name) === codeNorm.toLowerCase();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("promo.title")}</h1>
        <Button onClick={() => setOpen(true)} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-1.5 h-4 w-4" /> {t("promo.add")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Tag}
              title={t("empty.promo.title")}
              description={t("empty.promo.desc")}
              actionLabel={t("empty.promo.cta")}
              onAction={() => setOpen(true)}
            />
          </div>
        )}
        {items.map((p) => {
          const ds = dateStatus(p);
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 transition-smooth hover:shadow-elegant">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.code && <Badge variant="secondary" className="font-mono">{p.code}</Badge>}
                    {ds === "expired" && <Badge variant="destructive">หมดอายุ</Badge>}
                    {ds === "upcoming" && <Badge variant="outline">ยังไม่เริ่ม</Badge>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-primary">
                {p.discount_type === "percent" ? `${p.discount_value}%` : thb(Number(p.discount_value))}
              </p>
              {Number(p.min_purchase) > 0 && (
                <p className="text-xs text-muted-foreground">ซื้อขั้นต่ำ {thb(Number(p.min_purchase))}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {p.starts_at || p.ends_at
                  ? `ใช้ได้ ${p.starts_at ? fmtDate(p.starts_at) : "ตั้งแต่วันนี้"} – ${p.ends_at ? fmtDate(p.ends_at) : "ไม่มีกำหนด"}`
                  : "ไม่จำกัดวันใช้งาน"}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {p.is_active ? t("promo.active") : "ปิดใช้งาน"}
                </span>
                <Switch checked={p.is_active} onCheckedChange={() => toggleStatus(p.id, p.is_active)} />
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({ ...empty }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("promo.add")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("promo.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ลดต้อนรับลูกค้าใหม่" />
              {nameDup && <p className="mt-1 text-xs text-destructive">ชื่อนี้มีอยู่แล้ว</p>}
            </div>
            <div>
              <Label>{t("promo.code")}</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: normCode(e.target.value) })}
                placeholder="WELCOME10"
                className="font-mono"
              />
              {codeDup && <p className="mt-1 text-xs text-destructive">โค้ดนี้มีอยู่แล้ว</p>}
              {!codeDup && sameAsName && <p className="mt-1 text-xs text-destructive">โค้ดต้องไม่เหมือนชื่อโปรโมชัน</p>}
              {!codeDup && !sameAsName && (
                <p className="mt-1 text-xs text-muted-foreground">เว้นว่างได้ (หน้าขายกด "เลือกโค้ด" ได้โดยไม่ต้องพิมพ์)</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("promo.type")}</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as "percent" | "amount" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">{t("promo.percent")}</SelectItem>
                    <SelectItem value="amount">{t("promo.amount")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("promo.value")}</Label>
                <Input type="number" min={0} max={form.discount_type === "percent" ? 100 : undefined}
                  value={form.discount_value === 0 ? "" : form.discount_value} placeholder="0"
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value === "" ? 0 : Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>{t("promo.min")}</Label>
              <Input type="number" min={0} value={form.min_purchase === 0 ? "" : form.min_purchase} placeholder="0"
                onChange={(e) => setForm({ ...form, min_purchase: e.target.value === "" ? 0 : Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>วันเริ่มต้น</Label>
                <Input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
              </div>
              <div>
                <Label>วันสิ้นสุด</Label>
                <Input type="date" value={form.ends_on} min={form.starts_on || undefined}
                  onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
              </div>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">เว้นว่างวันที่ได้ หมายถึงไม่จำกัดวันใช้งาน</p>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>{t("promo.active")}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving || nameDup || codeDup || sameAsName}
              className="bg-gradient-primary text-primary-foreground">
              {saving ? "กำลังบันทึก..." : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}