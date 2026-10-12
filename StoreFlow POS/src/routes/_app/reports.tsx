import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports | PosFlow" }] }),
});

interface Sale { total: number; payment_method: string; created_at: string; }
interface Item { product_name: string; quantity: number; line_total: number; }

const COLORS = ["hsl(252, 80%, 60%)", "hsl(280, 70%, 65%)", "hsl(200, 80%, 55%)", "hsl(150, 60%, 50%)"];

function ReportsPage() {
  const { store } = useStore();
  const { t } = useI18n();
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!store) return;
    const since = new Date(); since.setDate(since.getDate() - 30);
    Promise.all([
      supabase.from("sales").select("total, payment_method, created_at")
        .eq("store_id", store.id).gte("created_at", since.toISOString()),
      supabase.from("sale_items").select("product_name, quantity, line_total")
        .eq("store_id", store.id).gte("created_at", since.toISOString()),
    ]).then(([s, i]) => {
      setSales((s.data ?? []) as Sale[]);
      setItems((i.data ?? []) as Item[]);
    });
  }, [store]);

  const last7 = useMemo(() => {
    const days: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const total = sales
        .filter((s) => { const t = new Date(s.created_at); return t >= d && t < next; })
        .reduce((a, s) => a + Number(s.total), 0);
      days.push({ date: `${d.getDate()}/${d.getMonth() + 1}`, total });
    }
    return days;
  }, [sales]);

  const top = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    items.forEach((it) => {
      const ex = map.get(it.product_name) ?? { name: it.product_name, qty: 0, revenue: 0 };
      ex.qty += it.quantity; ex.revenue += Number(it.line_total);
      map.set(it.product_name, ex);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [items]);

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => map.set(s.payment_method, (map.get(s.payment_method) ?? 0) + Number(s.total)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [sales]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("rep.title")}</h1>

      {sales.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t("empty.rep.title")}
          description={t("empty.rep.desc")}
          actionLabel={t("empty.sales.cta")}
          actionTo="/pos"
        />
      ) : (
      <>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-4 font-semibold">{t("rep.7day")}</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => thb(v)}
              />
              <Bar dataKey="total" fill="oklch(0.52 0.22 275)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 font-semibold">{t("rep.top")}</p>
          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} ขาย</p>
                  </div>
                  <span className="font-semibold">{thb(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 font-semibold">{t("rep.method")}</p>
          {byMethod.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => thb(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
