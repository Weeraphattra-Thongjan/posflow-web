import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, Calendar, Box, AlertTriangle, Monitor, Plus, BarChart3,
  AlertCircle, Clock, Receipt as ReceiptIcon,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb, fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { MenuSettingsDialog } from "@/components/MenuSettingsDialog";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Overview | PosFlow" }] }),
});

interface Stats {
  todaySales: number;
  todayOrders: number;
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  lowStockCount: number;
}

interface LowProduct { id: string; name: string; stock: number; }
interface RecentSale { id: string; receipt_no: number; total: number; payment_method: string; created_at: string; }

type ToneType = "primary" | "success" | "info" | "warning";

function DashboardPage() {
  const { store } = useStore();
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats>({
    todaySales: 0, todayOrders: 0, totalSales: 0, totalOrders: 0, totalProducts: 0, lowStockCount: 0,
  });
  const [lowStock, setLowStock] = useState<LowProduct[]>([]);
  const [recent, setRecent] = useState<RecentSale[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!store?.id) return;
    const todayStart = new Date(); 
    todayStart.setHours(0, 0, 0, 0);

    const [salesRes, prodRes, recentRes] = await Promise.all([
      supabase.from("sales").select("total, created_at").eq("store_id", store.id),
      supabase.from("products").select("id, name, stock, low_stock_threshold").eq("store_id", store.id),
      supabase.from("sales").select("id, receipt_no, total, payment_method, created_at")
        .eq("store_id", store.id).order("created_at", { ascending: false }).limit(5),
    ]);

    const sales = salesRes.data ?? [];
    const products = prodRes.data ?? [];
    const todaySales = sales.filter((s) => new Date(s.created_at) >= todayStart);
    const low = products.filter((p) => p.stock <= p.low_stock_threshold);

    setStats({
      todaySales: todaySales.reduce((a, s) => a + Number(s.total), 0),
      todayOrders: todaySales.length,
      totalSales: sales.reduce((a, s) => a + Number(s.total), 0),
      totalOrders: sales.length,
      totalProducts: products.length,
      lowStockCount: low.length,
    });
    setLowStock(low.slice(0, 5));
    setRecent(recentRes.data ?? []);
  }, [store?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "—";

  const statCards = [
    { label: t("dash.today_sales"), value: thb(stats.todaySales), sub: t("dash.orders_today", { n: stats.todayOrders }), icon: TrendingUp, tone: "primary" as ToneType },
    { label: t("dash.total_sales"), value: thb(stats.totalSales), sub: t("dash.orders_total", { n: stats.totalOrders }), icon: Calendar, tone: "success" as ToneType },
    { label: t("dash.total_products"), value: stats.totalProducts.toString(), sub: t("dash.items_count"), icon: Box, tone: "info" as ToneType },
    { label: t("dash.low_stock"), value: stats.lowStockCount.toString(), sub: t("dash.below_threshold"), icon: AlertTriangle, tone: "warning" as ToneType },
  ];

  const quick = [
    { to: "/pos", icon: Monitor, title: t("dash.quick.pos"), desc: t("dash.quick.pos.d") },
    { to: "/products", icon: Plus, title: t("dash.quick.add"), desc: t("dash.quick.add.d") },
    { to: "/reports", icon: BarChart3, title: t("dash.quick.report"), desc: t("dash.quick.report.d") },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("dash.welcome")}, {userName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {store?.name} — {t("dash.summary")}
          </p>
        </div>
        <MenuSettingsDialog />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 transition-smooth hover:shadow-elegant">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneBg(c.tone)}`}>
                <c.icon className={`h-4 w-4 ${toneFg(c.tone)}`} />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quick.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group rounded-2xl border border-border bg-card p-5 transition-smooth hover:border-primary/40 hover:shadow-elegant"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-smooth group-hover:bg-gradient-primary group-hover:text-primary-foreground">
              <q.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold">{q.title}</p>
            <p className="text-sm text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-destructive">
            <AlertCircle className="h-5 w-5" />
            {t("dash.alert.low")}
          </div>
          <div className="space-y-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-sm">
                <span>{p.name}</span>
                <span className="text-destructive">{t("dash.left")} <strong>{p.stock}</strong> {t("dash.unit")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sales */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold">
          <Clock className="h-5 w-5 text-muted-foreground" />
          {t("dash.recent")}
        </div>
        {recent.length === 0 ? (
          stats.totalProducts === 0 ? (
            <EmptyState
              icon={Box}
              title={t("empty.dash.title")}
              description={t("empty.dash.desc")}
              actionLabel={t("empty.dash.cta")}
              actionTo="/products"
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <EmptyState
              icon={ReceiptIcon}
              title={t("empty.sales.title")}
              description={t("empty.sales.desc")}
              actionLabel={t("empty.sales.cta")}
              actionTo="/pos"
              className="border-0 bg-transparent py-6"
            />
          )
        ) : (
          <div className="space-y-1">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">#{String(s.receipt_no).padStart(4, "0")}</span>
                  <span className="text-muted-foreground">{fmtDate(s.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">{s.payment_method}</Badge>
                  <span className="font-semibold">{thb(Number(s.total))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toneBg(t: ToneType): string {
  const map: Record<ToneType, string> = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    info: "bg-blue-500/10",
    warning: "bg-destructive/10",
  };
  return map[t] || "bg-muted";
}

function toneFg(t: ToneType): string {
  const map: Record<ToneType, string> = {
    primary: "text-primary",
    success: "text-success",
    info: "text-blue-500",
    warning: "text-destructive",
  };
  return map[t] || "text-foreground";
}