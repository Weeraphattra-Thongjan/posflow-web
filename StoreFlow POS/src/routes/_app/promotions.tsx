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
}

const empty = { name: "", code: "", discount_type: "percent" as "percent" | "amount", discount_value: 0, min_purchase: 0, is_active: true };

function PromosPage() {
  const { store } = useStore();
  const { t } = useI18n();
  const [items, setItems] = useState<Promo[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from("promotions").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store]);

  const save = async () => {
    if (!store || !form.name.trim()) return;
    const { error } = await supabase.from("promotions").insert({
      store_id: store.id, name: form.name, code: form.code ? form.code.toUpperCase() : null,
      discount_type: form.discount_type, discount_value: form.discount_value,
      min_purchase: form.min_purchase, is_active: form.is_active,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setForm({ ...empty }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("promotions")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) return toast.error(error.message);
    toast.success("Updated status");
    load();
  };

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
        {items.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5 transition-smooth hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                {p.code && <Badge variant="secondary" className="mt-1 font-mono">{p.code}</Badge>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-primary">
              {p.discount_type === "percent" ? `${p.discount_value}%` : thb(Number(p.discount_value))}
            </p>
            {Number(p.min_purchase) > 0 && (
              <p className="text-xs text-muted-foreground">Min {thb(Number(p.min_purchase))}</p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs font-medium text-muted-foreground">
                {p.is_active ? t("promo.active") : "Inactive"}
              </span>
              <Switch
                checked={p.is_active}
                onCheckedChange={() => toggleStatus(p.id, p.is_active)}
              />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("promo.add")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("promo.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t("promo.code")}</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME10" /></div>
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
              <div><Label>{t("promo.value")}</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
            </div>
            <div><Label>{t("promo.min")}</Label><Input type="number" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>{t("promo.active")}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}