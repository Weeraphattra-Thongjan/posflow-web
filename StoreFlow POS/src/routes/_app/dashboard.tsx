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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-