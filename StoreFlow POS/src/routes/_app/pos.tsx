import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Trash2, Search, Receipt as ReceiptIcon, Printer, Flame, Clock, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { thb, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/pos")({
  component: PosPage,
  head: () => ({ meta: [{ title: "POS | PosFlow" }] }),
});

interface Product { id: string; name: string; price: number; stock: number; sku: string | null; barcode: string | null; }
interface CartItem extends Product { qty: number; }
type PayMethod = "cash" | "qr" | "card" | "transfer";
type Tab = "all" | "top" | "recent";

interface LastReceipt {
  receipt_no: number;
  created_at: string;
  cashier: string;
  store_name: string;
  items: { name: string; qty: number; price: number; line: number }[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PayMethod;
}

function PosPage() {
  const { store } = useStore();
  const { user } = useAuth();
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [topIds, setTopIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<PayMethod>("cash");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<LastReceipt | null>(null);
  const [barcode, setBarcode] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const scanBarcode = (code: string) => {
    const c = code.trim();
    if (!c) return;
    const found = products.find(
      (p) => p.barcode === c || p.sku === c || p.barcode?.toLowerCase() === c.toLowerCase()
    );
    if (!found) { toast.error(t("pos.scan_not_found")); setBarcode(""); return; }
    add(found);
    setBarcode("");
  };

  const load = async () => {
    if (!store) return;
    const [prodRes, topRes, recentRes] = await Promise.all([
      supabase.from("products").select("id, name, price, stock, sku, barcode")
        .eq("store_id", store.id).eq("is_active", true).order("name"),
      supabase.from("sale_items").select("product_id, quantity")
        .eq("store_id", store.id).limit(500),
      supabase.from("sale_items").select("product_id, created_at")
        .eq("store_id", store.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts((prodRes.data ?? []).map((p) => ({ ...p, price: Number(p.price) })));

    // Compute top sellers
    const counts = new Map<string, number>();
    (topRes.data ?? []).forEach((r) => {
      counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + r.quantity);
    });
    setTopIds([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id));

    // Recent unique
    const seen = new Set<string>();
    const recent: string[] = [];
    (recentRes.data ?? []).forEach((r) => {
      if (!seen.has(r.product_id)) { seen.add(r.product_id); recent.push(r.product_id); }
    });
    setRecentIds(recent.slice(0, 12));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store]);

  const add = (p: Product) => {
    if (p.stock <= 0) return toast.error(t("pos.out_of_stock"));
    setCart((c) => {
      const ex = c.find((x) => x.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) { toast.error(t("pos.out_of_stock")); return c; }
        return c.map((x) => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...c, { ...p, qty: 1 }];
    });
  };
  const dec = (id: string) =>
    setCart((c) => c.map((x) => x.id === id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0));
  const remove = (id: string) => setCart((c) => c.filter((x) => x.id !== id));

  const subtotal = useMemo(() => cart.reduce((a, x) => a + x.price * x.qty, 0), [cart]);
  const total = Math.max(0, subtotal - discount);

  const applyPromo = async () => {
    if (!store || !promoCode.trim()) return;
    const { data } = await supabase.from("promotions").select("*")
      .eq("store_id", store.id).eq("code", promoCode.trim().toUpperCase()).eq("is_active", true).maybeSingle();
    if (!data) { setDiscount(0); setAppliedPromoId(null); return toast.error(t("pos.invalid_promo")); }
    if (subtotal < Number(data.min_purchase)) { return toast.error(`Min ${thb(Number(data.min_purchase))}`); }
    const d = data.discount_type === "percent"
      ? subtotal * Number(data.discount_value) / 100
      : Number(data.discount_value);
    setDiscount(d); setAppliedPromoId(data.id);
    toast.success(`-${thb(d)}`);
  };

  const checkout = async () => {
    if (!store || !user || cart.length === 0 || busy) return;
    setBusy(true);
    const snapshot = cart.map((x) => ({ name: x.name, qty: x.qty, price: x.price, line: x.price * x.qty }));
    const { data: sale, error } = await supabase.from("sales").insert({
      store_id: store.id, cashier_id: user.id, subtotal, discount, total,
      payment_method: pay, promotion_id: appliedPromoId, receipt_no: 0,
    }).select("id, receipt_no, created_at").single();
    if (error || !sale) { setBusy(false); return toast.error(error?.message ?? "Error"); }

    const items = cart.map((x) => ({
      sale_id: sale.id, product_id: x.id, store_id: store.id,
      product_name: x.name, unit_price: x.price, quantity: x.qty, line_total: x.price * x.qty,
    }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    if (e2) { setBusy(false); return toast.error(e2.message); }

    const cashierName = user.user_metadata?.full_name || user.email || "—";
    setLastReceipt({
      receipt_no: sale.receipt_no, created_at: sale.created_at, cashier: cashierName,
      store_name: store.name, items: snapshot, subtotal, discount, total, payment_method: pay,
    });
    toast.success(t("pos.success", { n: String(sale.receipt_no).padStart(4, "0") }));
    setCart([]); setDiscount(0); setPromoCode(""); setAppliedPromoId(null);
    load(); setBusy(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !inField) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "F3") { e.preventDefault(); barcodeRef.current?.focus(); }
      else if (e.key === "Escape") {
        if (inField) (e.target as HTMLElement).blur();
        else { setCart([]); setDiscount(0); setPromoCode(""); setAppliedPromoId(null); }
      } else if (e.key === "F2") { e.preventDefault(); checkout(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [cart, busy, store, user, subtotal, discount, total, pay, appliedPromoId]);

  const baseList = useMemo(() => {
    if (tab === "top") {
      const map = new Map(products.map((p) => [p.id, p]));
      return topIds.map((id) => map.get(id)).filter(Boolean) as Product[];
    }
    if (tab === "recent") {
      const map = new Map(products.map((p) => [p.id, p]));
      return recentIds.map((id) => map.get(id)).filter(Boolean) as Product[];
    }
    return products;
  }, [tab, products, topIds, recentIds]);

  const filtered = baseList.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const methods: { v: PayMethod; label: string }[] = [
    { v: "cash", label: t("pos.cash") },
    { v: "qr", label: t("pos.qr") },
    { v: "card", label: t("pos.card") },
    { v: "transfer", label: t("pos.transfer") },
  ];

  const tabs: { v: Tab; label: string; icon: typeof Flame }[] = [
    { v: "all", label: t("pos.tab.all"), icon: Search },
    { v: "top", label: t("pos.tab.top"), icon: Flame },
    { v: "recent", label: t("pos.tab.recent"), icon: Clock },
  ];

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[1fr_400px]">
      {/* Products */}
      <div className="flex flex-col overflow-hidden border-r border-border">
        <div className="space-y-3 border-b border-border p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("prod.search")} className="pl-9" />
            </div>
            <div className="relative">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <Input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scanBarcode(barcode); } }}
                placeholder={t("pos.scan_placeholder")}
                className="pl-9 font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {tabs.map((tb) => (
                <button
                  key={tb.v}
                  onClick={() => setTab(tb.v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-smooth ${
                    tab === tb.v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                  }`}
                >
                  <tb.icon className="h-3.5 w-3.5" />
                  {tb.label}
                </button>
              ))}
            </div>
            <p className="hidden text-xs text-muted-foreground md:block">{t("pos.shortcuts")}</p>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={p.stock <= 0}
                className="group relative flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-smooth hover:border-primary/50 hover:shadow-elegant disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary text-lg font-bold text-primary-foreground">
                  {p.name[0]}
                </div>
                <div className="w-full">
                  <p className="line-clamp-1 font-medium">{p.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-display font-bold text-primary">{thb(p.price)}</span>
                    <Badge variant="secondary" className="text-xs">{p.stock}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            products.length === 0 ? (
              <EmptyState
                icon={ScanLine}
                title={t("empty.pos.title")}
                description={t("empty.pos.desc")}
                actionLabel={t("empty.pos.cta")}
                actionTo="/products"
                className="mt-2"
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
            )
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex flex-col overflow-hidden bg-muted/20">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 font-semibold">
            <ReceiptIcon className="h-5 w-5" /> {t("pos.cart")}
            <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("pos.empty_cart")}</p>
          ) : (
            <div className="space-y-2">
              {cart.map((x) => (
                <div key={x.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-medium">{x.name}</p>
                      <p className="text-xs text-muted-foreground">{thb(x.price)} × {x.qty}</p>
                    </div>
                    <button onClick={() => remove(x.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-lg border border-border">
                      <button onClick={() => dec(x.id)} className="p-1.5 hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="min-w-8 text-center text-sm font-medium">{x.qty}</span>
                      <button onClick={() => add(x)} className="p-1.5 hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="font-display font-semibold">{thb(x.price * x.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card p-4">
          <div className="mb-3 flex gap-2">
            <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder={t("pos.promo_code")} />
            <Button variant="outline" onClick={applyPromo}>{t("pos.apply")}</Button>
          </div>

          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {methods.map((m) => (
              <button
                key={m.v}
                onClick={() => setPay(m.v)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-smooth ${
                  pay === m.v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("pos.subtotal")}</span><span>{thb(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-success"><span>{t("pos.discount")}</span><span>-{thb(discount)}</span></div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <span>{t("pos.total")}</span><span className="font-display text-xl text-primary">{thb(total)}</span>
            </div>
          </div>

          <Button
            onClick={checkout}
            disabled={cart.length === 0 || busy}
            className="mt-4 h-12 w-full bg-gradient-primary text-base text-primary-foreground shadow-glow hover:opacity-90"
          >
            {t("pos.checkout")} <kbd className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">F2</kbd>
          </Button>
        </div>
      </div>

      <ReceiptDialog receipt={lastReceipt} onClose={() => setLastReceipt(null)} />
    </div>
  );
}

function ReceiptDialog({ receipt, onClose }: { receipt: LastReceipt | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!receipt) return null;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return;
    const rows = receipt.items.map((i) =>
      `<tr><td>${escapeHtml(i.name)}<br/><span style="color:#666;font-size:11px">${i.qty} × ${thb(i.price)}</span></td><td style="text-align:right;vertical-align:top">${thb(i.line)}</td></tr>`
    ).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t("pos.receipt_title")} #${String(receipt.receipt_no).padStart(4, "0")}</title>
      <style>
        body{font-family:ui-monospace,Menlo,monospace;padding:16px;color:#000;max-width:320px;margin:0 auto}
        h1{font-size:16px;text-align:center;margin:0 0 4px}
        .muted{color:#555;font-size:12px;text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
        td{padding:4px 0;vertical-align:top}
        .sep{border-top:1px dashed #999;margin:8px 0}
        .row{display:flex;justify-content:space-between;font-size:13px;padding:2px 0}
        .total{font-size:16px;font-weight:700;border-top:2px solid #000;padding-top:6px;margin-top:6px}
        .center{text-align:center;font-size:12px;color:#555;margin-top:16px}
      </style></head><body>
      <h1>${escapeHtml(receipt.store_name)}</h1>
      <div class="muted">${t("pos.receipt_title")} #${String(receipt.receipt_no).padStart(4, "0")}</div>
      <div class="muted">${escapeHtml(fmtDateTime(receipt.created_at))}</div>
      <div class="muted">${t("pos.cashier")}: ${escapeHtml(receipt.cashier)}</div>
      <div class="sep"></div>
      <table>${rows}</table>
      <div class="sep"></div>
      <div class="row"><span>${t("pos.subtotal")}</span><span>${thb(receipt.subtotal)}</span></div>
      ${receipt.discount > 0 ? `<div class="row"><span>${t("pos.discount")}</span><span>-${thb(receipt.discount)}</span></div>` : ""}
      <div class="row total"><span>${t("pos.total")}</span><span>${thb(receipt.total)}</span></div>
      <div class="row"><span>${t("pos.payment")}</span><span>${receipt.payment_method.toUpperCase()}</span></div>
      <div class="center">${t("pos.thanks")}</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={!!receipt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("pos.receipt_title")} #{String(receipt.receipt_no).padStart(4, "0")}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm">
          <p className="text-center font-semibold">{receipt.store_name}</p>
          <p className="text-center text-xs text-muted-foreground">{fmtDateTime(receipt.created_at)}</p>
          <p className="text-center text-xs text-muted-foreground">{t("pos.cashier")}: {receipt.cashier}</p>
          <div className="my-2 border-t border-dashed border-border" />
          <div className="space-y-1">
            {receipt.items.map((i, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate">{i.name} <span className="text-muted-foreground">×{i.qty}</span></span>
                <span>{thb(i.line)}</span>
              </div>
            ))}
          </div>
          <div className="my-2 border-t border-dashed border-border" />
          <div className="flex justify-between"><span>{t("pos.subtotal")}</span><span>{thb(receipt.subtotal)}</span></div>
          {receipt.discount > 0 && <div className="flex justify-between text-success"><span>{t("pos.discount")}</span><span>-{thb(receipt.discount)}</span></div>}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>{t("pos.total")}</span><span>{thb(receipt.total)}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>{t("pos.payment")}</span><span>{receipt.payment_method.toUpperCase()}</span></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("pos.close")}</Button>
          <Button onClick={handlePrint} className="bg-gradient-primary text-primary-foreground">
            <Printer className="h-4 w-4" /> {t("pos.print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
