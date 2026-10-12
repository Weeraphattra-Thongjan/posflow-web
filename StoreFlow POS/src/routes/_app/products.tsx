import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Products | PosFlow" }] }),
});

interface Product {
  id: string; name: string; sku: string | null; price: number; cost: number;
  stock: number; low_stock_threshold: number; category_id: string | null;
}

const empty = { name: "", sku: "", price: 0, cost: 0, stock: 0, low_stock_threshold: 5 };

function ProductsPage() {
  const { store } = useStore();
  const { t } = useI18n();
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from("products").select("*")
      .eq("store_id", store.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store]);

  const openNew = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku ?? "", price: Number(p.price), cost: Number(p.cost),
      stock: p.stock, low_stock_threshold: p.low_stock_threshold,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!store || !form.name.trim()) return;
    if (editing) {
      const { error } = await supabase.from("products").update({
        name: form.name, sku: form.sku || null, price: form.price, cost: form.cost,
        stock: form.stock, low_stock_threshold: form.low_stock_threshold,
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("products").insert({
        store_id: store.id, name: form.name, sku: form.sku || null,
        price: form.price, cost: form.cost, stock: form.stock,
        low_stock_threshold: form.low_stock_threshold,
      });
      if (error) return toast.error(error.message);
    }
    toast.success(t("prod.saved"));
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("prod.deleted"));
    load();
  };

  const filtered = items.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("prod.title")}</h1>
          <p className="text-sm text-muted-foreground">{items.length} {t("dash.items_count")}</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="mr-1.5 h-4 w-4" /> {t("prod.add")}
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("prod.search")} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("prod.name")}</th>
                <th className="px-4 py-3 text-left">{t("prod.sku")}</th>
                <th className="px-4 py-3 text-right">{t("prod.price")}</th>
                <th className="px-4 py-3 text-right">{t("prod.stock")}</th>
                <th className="px-4 py-3 text-right">{t("prod.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10">
                  <EmptyState
                    icon={Box}
                    title={items.length === 0 ? t("empty.prod.title") : t("common.empty")}
                    description={items.length === 0 ? t("empty.prod.desc") : undefined}
                    actionLabel={items.length === 0 ? t("empty.prod.cta") : undefined}
                    onAction={items.length === 0 ? openNew : undefined}
                    className="border-0 bg-transparent"
                  />
                </td></tr>
              )}
              {filtered.map((p) => {
                const low = p.stock <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{thb(Number(p.price))}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={low ? "destructive" : "secondary"}>{p.stock}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("common.edit") : t("prod.add")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("prod.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("prod.sku")}</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("prod.price")}</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("prod.cost")}</Label>
                <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("prod.stock")}</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("prod.threshold")}</Label>
                <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
              </div>
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
