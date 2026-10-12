import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt as ReceiptIcon } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb, fmtDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
  head: () => ({ meta: [{ title: "Sales history | PosFlow" }] }),
});

interface Sale {
  id: string; receipt_no: number; total: number; subtotal: number; discount: number;
  payment_method: string; created_at: string;
  sale_items: { quantity: number; product_name: string; line_total: number }[];
}

function SalesPage() {
  const { store } = useStore();
  const { t } = useI18n();
  const [items, setItems] = useState<Sale[]>([]);

  useEffect(() => {
    if (!store) return;
    supabase.from("sales").select("*, sale_items(quantity, product_name, line_total)")
      .eq("store_id", store.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setItems((data ?? []) as unknown as Sale[]));
  }, [store]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 font-display text-2xl font-bold sm:text-3xl">{t("sales.title")}</h1>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("sales.receipt")}</th>
                <th className="px-4 py-3 text-left">{t("sales.date")}</th>
                <th className="px-4 py-3 text-right">{t("sales.items")}</th>
                <th className="px-4 py-3 text-center">{t("sales.method")}</th>
                <th className="px-4 py-3 text-right">{t("sales.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10">
                  <EmptyState
                    icon={ReceiptIcon}
                    title={t("empty.sales.title")}
                    description={t("empty.sales.desc")}
                    actionLabel={t("empty.sales.cta")}
                    actionTo="/pos"
                    className="border-0 bg-transparent"
                  />
                </td></tr>
              )}
              {items.map((s) => {
                const qty = s.sale_items?.reduce((a, x) => a + x.quantity, 0) ?? 0;
                return (
                  <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-semibold">#{String(s.receipt_no).padStart(4, "0")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(s.created_at)}</td>
                    <td className="px-4 py-3 text-right">{qty}</td>
                    <td className="px-4 py-3 text-center"><Badge variant="secondary">{s.payment_method}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold">{thb(Number(s.total))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
