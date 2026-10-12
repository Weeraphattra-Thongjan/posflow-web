import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Store as StoreIcon, ShieldAlert, ShieldCheck, UserPlus, Trash2, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin | PosFlow" }] }),
});

interface StoreRow { id: string; name: string; slug: string; status: string; created_at: string; owner_id: string; }
interface StoreLow { store_id: string; store_name: string; items: { id: string; name: string; stock: number; threshold: number }[]; }
interface AdminRow { user_id: string; email: string; is_super: boolean; created_at: string; }
interface Ticket { id: string; subject: string; message: string; status: "open" | "in_progress" | "closed"; user_email: string | null; admin_note: string | null; created_at: string; store_id: string | null; }

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [lowStock, setLowStock] = useState<StoreLow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [storesOpen, setStoresOpen] = useState(false);

  const loadAdmins = async () => {
    const { data } = await supabase.rpc("admin_list");
    if (data) setAdmins(data as AdminRow[]);
  };

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, user_email, admin_note, created_at, store_id")
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data: admin } = await supabase.from("app_admins").select("user_id, is_super").eq("user_id", user.id).maybeSingle();
      if (!admin) { setIsAdmin(false); return; }
      setIsAdmin(true);
      setIsSuper(!!admin.is_super);
      if (admin.is_super) loadAdmins();

      // ดึงร้านค้าทั้งหมดในระบบ (RLS อนุญาตให้ admin เห็นทุกร้าน)
      const { data: allStores } = await supabase
        .from("stores")
        .select("id, name, slug, status, created_at, owner_id")
        .order("created_at", { ascending: false });
      setStores((allStores ?? []) as StoreRow[]);

      const storeIds = (allStores ?? []).map((s) => s.id);
      const { data: products } = storeIds.length
        ? await supabase.from("products")
            .select("id, name, stock, low_stock_threshold, store_id")
            .eq("is_active", true).in("store_id", storeIds)
        : { data: [] as any[] };

      const grouped = new Map<string, StoreLow>();
      (allStores ?? []).forEach((s) => grouped.set(s.id, { store_id: s.id, store_name: s.name, items: [] }));
      (products ?? []).forEach((p: any) => {
        if (p.stock <= p.low_stock_threshold) {
          const g = grouped.get(p.store_id);
          if (g) g.items.push({ id: p.id, name: p.name, stock: p.stock, threshold: p.low_stock_threshold });
        }
      });
      setLowStock([...grouped.values()].filter((g) => g.items.length > 0).sort((a, b) => b.items.length - a.items.length));

      loadTickets();
    })();
  }, [user, loading, navigate]);

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    const { error } = await supabase.rpc("admin_add_by_email", { _email: newEmail.trim() });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("admin.add_success"));
    setNewEmail("");
    loadAdmins();
  };

  const handleRemoveAdmin = async (email: string) => {
    const { error } = await supabase.rpc("admin_remove_by_email", { _email: email });
    if (error) { toast.error(error.message); return; }
    toast.success(t("admin.remove_success"));
    loadAdmins();
  };

  const updateTicket = async (id: string, status: Ticket["status"]) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("admin.ticket_updated"));
    loadTickets();
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadTickets();
  };

  if (isAdmin === null) {
    return <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }
  if (isAdmin === false) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-3 font-display text-xl font-semibold">{t("admin.no_access")}</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">← {t("admin.dashboard")}</Link>
      </div>
    );
  }

  void lowStock;

  const locale = lang === "th" ? "th-TH" : "en-US";
  const statusLabel: Record<Ticket["status"], string> = { open: t("admin.status.open"), in_progress: t("admin.status.in_progress"), closed: t("admin.status.closed") };
  const statusTone: Record<Ticket["status"], string> = {
    open: "bg-destructive/10 text-destructive",
    in_progress: "bg-amber-500/10 text-amber-600",
    closed: "bg-emerald-500/10 text-emerald-600",
  };
  const storeStatusLabel = (status: string) => {
    const key = `admin.store_status.${status}`;
    const label = t(key);
    return label === key ? status : label;
  };

  const cards: { label: string; value: number; icon: typeof StoreIcon; tone: string; onClick?: () => void; hint?: string }[] = [
    { label: t("admin.all_stores"), value: stores.length, icon: StoreIcon, tone: "bg-primary/10 text-primary", onClick: () => setStoresOpen(true), hint: t("admin.view_store_list") },
  ];


  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("admin.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.onClick}
            disabled={!c.onClick}
            className={`rounded-2xl border border-border bg-card p-5 text-left transition-smooth ${c.onClick ? "hover:shadow-glow hover:-translate-y-0.5 cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight">{c.value}</p>
            {c.hint && <p className="mt-1 text-xs text-primary">{c.hint} →</p>}
          </button>
        ))}
      </div>


      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("admin.support_tickets")}</h2>
          <Badge variant="secondary" className="ml-2">{t("admin.ticket_count", { n: tickets.length })}</Badge>
        </div>
        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background py-10 text-center text-sm text-muted-foreground">
            {t("admin.no_tickets")}
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((tk) => (
              <div key={tk.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[tk.status]}`}>{statusLabel[tk.status]}</span>
                      <h3 className="truncate font-semibold">{tk.subject}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("admin.from")} {tk.user_email ?? t("admin.not_specified")} · {new Date(tk.created_at).toLocaleString(locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {tk.status !== "in_progress" && tk.status !== "closed" && (
                      <Button size="sm" variant="outline" onClick={() => updateTicket(tk.id, "in_progress")}>{t("admin.mark_in_progress")}</Button>
                    )}
                    {tk.status !== "closed" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => updateTicket(tk.id, "closed")}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("admin.close_ticket")}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteTicket(tk.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{tk.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isSuper && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">{t("admin.manage_admins")}</h2>
            <Badge variant="secondary" className="ml-2">{t("admin.super_admin")}</Badge>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("admin.creator_only", { email: "66160121@go.buu.ac.th" })}
          </p>

          <form onSubmit={handleAddAdmin} className="mb-5 flex gap-2">
            <Input type="email" placeholder={t("admin.email_placeholder")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <Button type="submit" disabled={adding} className="gap-2 bg-gradient-primary text-primary-foreground">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {t("common.add")}
            </Button>
          </form>

          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.email}</span>
                  {a.is_super && <Badge variant="default" className="text-xs">{t("admin.creator")}</Badge>}
                </div>
                {!a.is_super && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmin(a.email)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {admins.length === 0 && (
              <div className="rounded-lg border border-border bg-background px-3 py-4 text-center text-sm text-muted-foreground">{t("admin.no_admins")}</div>
            )}
          </div>
        </div>
      )}

      <Dialog open={storesOpen} onOpenChange={setStoresOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.stores_dialog_title", { n: stores.length })}</DialogTitle>
            <DialogDescription>{t("admin.stores_dialog_desc")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-auto">
            {stores.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{t("admin.no_stores")}</div>
            ) : (
              stores.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StoreIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate font-semibold">{s.name}</span>
                      <Badge variant={s.status === "active" ? "secondary" : "outline"} className="text-xs">{storeStatusLabel(s.status)}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">/{s.slug} · {t("admin.joined_on")} {new Date(s.created_at).toLocaleDateString(locale)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
