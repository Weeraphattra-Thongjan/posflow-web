import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt as ReceiptIcon, User, CreditCard, Tag, StickyNote } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb, fmtDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
  head: () => ({ meta: [{ title: "Sales history | PosFlow" }] }),
});

interface SaleItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface Sale {
  id: string;
  receipt_no: number;
  total: number;
  subtotal: number;
  discount: number;
  payment_method: string;
  promotion_id: string | null;
  cashier_id: string | null;
  note: string | null;
  created_at: string;
  sale_items: SaleItem[];
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "เงินสด",
  qr: "QR พร้อมเพย์",
  card: "บัตร",
  transfer: "โอนเงิน",
};

const receiptLabel = (n: number) => `#${String(n ?? 0).padStart(4, "0")}`;
const paymentLabel = (m: string) => PAYMENT_LABEL[m] ?? m;

// rpc ใหม่ยังไม่มีใน type ที่ generate ไว้
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: any; error: { message: string } | null }>;

function SalesPage() {
  const { store } = useStore();
  const { t } = useI18n();
  const [items, setItems] = useState<Sale[]>([]);
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Sale | null>(null);

  useEffect(() => {
    if (!store) return;

    supabase
      .from("sales")
      .select("*, sale_items(id, product_name, unit_price, quantity, line_total)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setItems((data ?? []) as unknown as Sale[]));

    // อีเมลของคนขาย (ถ้ายังไม่ได้รัน SQL จะข้ามไปเฉย ๆ)
    rpc("get_store_staff", { p_store_id: store.id }).then(({ data }) => {
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { user_id: string; email: string }) => {
        map[r.user_id] = r.email;
      });
      setStaff(map);
    });
  }, [store]);

  const cashierLabel = (id: string | null) => {
    if (!id) return "—";
    return staff[id] ?? "พนักงานที่ถูกลบแล้ว";
  };

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
                <th className="hidden px-4 py-3 text-left md:table-cell">พนักงาน</th>
                <th className="px-4 py-3 text-right">{t("sales.items")}</th>
                <th className="px-4 py-3 text-center">{t("sales.method")}</th>
                <th className="px-4 py-3 text-right">{t("sales.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState
                      icon={ReceiptIcon}
                      title={t("empty.sales.title")}
                      description={t("empty.sales.desc")}
                      actionLabel={t("empty.sales.cta")}
                      actionTo="/pos"
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
              )}
              {items.map((s) => {
                const qty = s.sale_items?.reduce((a, x) => a + Number(x.quantity), 0) ?? 0;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(s);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`ดูรายละเอียดบิล ${receiptLabel(s.receipt_no)}`}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/30 focus:bg-muted/40 focus:outline-none"
                  >
                    <td className="px-4 py-3 font-mono font-semibold">{receiptLabel(s.receipt_no)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(s.created_at)}</td>
                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-muted-foreground md:table-cell">
                      {cashierLabel(s.cashier_id)}
                    </td>
                    <td className="px-4 py-3 text-right">{qty}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary">{paymentLabel(s.payment_method)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{thb(Number(s.total))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {items.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">กดที่บิลเพื่อดูรายการสินค้า</p>
      )}

      {/* รายละเอียดบิล */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">บิล {receiptLabel(selected.receipt_no)}</DialogTitle>
                <DialogDescription>{fmtDateTime(selected.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">พนักงาน</p>
                    <p className="truncate font-medium">{cashierLabel(selected.cashier_id)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">ชำระโดย</p>
                    <p className="font-medium">{paymentLabel(selected.payment_method)}</p>
                  </div>
                </div>
              </div>

              {/* รายการสินค้า */}
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">สินค้า</th>
                      <th className="px-3 py-2 text-right">ราคา</th>
                      <th className="px-3 py-2 text-right">จำนวน</th>
                      <th className="px-3 py-2 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.sale_items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          ไม่พบรายการสินค้าในบิลนี้
                        </td>
                      </tr>
                    )}
                    {selected.sale_items.map((it) => (
                      <tr key={it.id} className="border-t border-border/60">
                        <td className="px-3 py-2">{it.product_name}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {thb(Number(it.unit_price))}
                        </td>
                        <td className="px-3 py-2 text-right">×{it.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium">{thb(Number(it.line_total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* สรุปยอด */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>ยอดก่อนส่วนลด</span>
                  <span>{thb(Number(selected.subtotal))}</span>
                </div>
                {Number(selected.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      ส่วนลด{selected.promotion_id ? " (โปรโมชั่น)" : ""}
                    </span>
                    <span>−{thb(Number(selected.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                  <span>ยอดสุทธิ</span>
                  <span>{thb(Number(selected.total))}</span>
                </div>
              </div>

              {selected.note && (
                <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="whitespace-pre-wrap">{selected.note}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}