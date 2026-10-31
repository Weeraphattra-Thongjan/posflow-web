import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, CheckCircle2, Trash2, ShieldAlert, Send, Loader2, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// URL: /admin/tickets (ขีดล่างท้าย admin_ = ไม่ซ้อนอยู่ใต้หน้า /admin)
export const Route = createFileRoute("/_app/admin_/tickets")({
  component: AdminTicketsPage,
  head: () => ({ meta: [{ title: "Support tickets | PosFlow Admin" }] }),
});

type Status = "open" | "in_progress" | "closed";
interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: Status;
  user_email: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS: Record<Status, { label: string; tone: string }> = {
  open: { label: "เปิดเรื่อง", tone: "bg-destructive/10 text-destructive" },
  in_progress: { label: "กำลังแก้", tone: "bg-amber-500/10 text-amber-600" },
  closed: { label: "ปิดเรื่อง", tone: "bg-emerald-500/10 text-emerald-600" },
};

const FILTERS: { key: "active" | Status | "all"; label: string }[] = [
  { key: "active", label: "ยังไม่ปิด" },
  { key: "open", label: "เปิดเรื่อง" },
  { key: "in_progress", label: "กำลังแก้" },
  { key: "closed", label: "ปิดแล้ว" },
  { key: "all", label: "ทั้งหมด" },
];

function AdminTicketsPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("active");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, user_email, admin_note, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data ?? []) as Ticket[];
    setTickets(rows);
    setNotes(Object.fromEntries(rows.map((r) => [r.id, r.admin_note ?? ""])));
  };

  useEffect(() => {
    if (loading || !user) return;
    supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        if (data) loadTickets();
      });
  }, [user, loading]);

  // อัปเดตสถานะ และ/หรือ ข้อความตอบกลับ → trigger ในฐานข้อมูลแจ้งเตือนผู้แจ้งให้อัตโนมัติ
  const save = async (tk: Ticket, status?: Status) => {
    const note = (notes[tk.id] ?? "").trim();
    const patch: Partial<Ticket> = {};
    if (status && status !== tk.status) patch.status = status;
    if (note !== (tk.admin_note ?? "")) patch.admin_note = note || null;
    if (Object.keys(patch).length === 0) {
      toast.info("ยังไม่มีอะไรเปลี่ยน");
      return;
    }

    setBusyId(tk.id);
    const { error } = await supabase.from("support_tickets").update(patch as any).eq("id", tk.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("บันทึกแล้ว ผู้แจ้งจะได้รับการแจ้งเตือน");
    loadTickets();
  };

  const remove = async (tk: Ticket) => {
    if (!confirm(`ลบเรื่อง "${tk.subject}"? ลบแล้วกู้คืนไม่ได้`)) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", tk.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบเรื่องแล้ว");
    loadTickets();
  };

  if (isAdmin === null) {
    return <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">กำลังโหลด...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-3 font-display text-xl font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">← กลับหน้าภาพรวม</Link>
      </div>
    );
  }

  const locale = lang === "th" ? "th-TH" : "en-US";
  const count = (k: (typeof FILTERS)[number]["key"]) =>
    k === "all" ? tickets.length : k === "active" ? tickets.filter((t) => t.status !== "closed").length : tickets.filter((t) => t.status === k).length;
  const shown = tickets.filter((t) =>
    filter === "all" ? true : filter === "active" ? t.status !== "closed" : t.status === filter
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">เรื่องแจ้งปัญหา</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          เปลี่ยนสถานะหรือพิมพ์ข้อความตอบกลับ ผู้แจ้งจะได้รับการแจ้งเตือนในเว็บ (ไอคอนกระดิ่ง) ทันที
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="กรองตามสถานะ">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 text-xs ${filter === f.key ? "bg-primary-foreground/20" : "bg-muted"}`}>
              {count(f.key)}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-8 w-8" />
          ไม่มีเรื่องในหมวดนี้
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((tk) => {
            const s = STATUS[tk.status];
            const busy = busyId === tk.id;
            const noteChanged = (notes[tk.id] ?? "").trim() !== (tk.admin_note ?? "");
            return (
              <div key={tk.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.tone}`}>{s.label}</span>
                      <h3 className="truncate font-semibold">{tk.subject}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      จาก {tk.user_email ?? "ไม่ระบุ"} · {new Date(tk.created_at).toLocaleString(locale)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(tk)}
                    aria-label="ลบเรื่อง"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm">{tk.message}</p>

                <div className="mt-4">
                  <label htmlFor={`note-${tk.id}`} className="text-xs font-medium text-muted-foreground">
                    ข้อความตอบกลับผู้แจ้ง
                  </label>
                  <textarea
                    id={`note-${tk.id}`}
                    rows={2}
                    value={notes[tk.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [tk.id]: e.target.value }))}
                    placeholder="เช่น แก้ไขแล้ว ลองรีเฟรชหน้าเว็บอีกครั้ง"
                    className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {noteChanged && (
                    <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => save(tk)}>
                      <Send className="h-3.5 w-3.5" /> ส่งข้อความ
                    </Button>
                  )}
                  {tk.status === "open" && (
                    <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => save(tk, "in_progress")}>
                      <Clock className="h-3.5 w-3.5" /> กำลังแก้
                    </Button>
                  )}
                  {tk.status !== "closed" ? (
                    <Button size="sm" className="gap-1" disabled={busy} onClick={() => save(tk, "closed")}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      แก้ไขแล้ว / ปิดเรื่อง
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => save(tk, "open")}>
                      <RotateCcw className="h-3.5 w-3.5" /> เปิดเรื่องอีกครั้ง
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        <Badge variant="secondary" className="mr-1">เคล็ดลับ</Badge>
        พิมพ์ข้อความก่อนกด "แก้ไขแล้ว / ปิดเรื่อง" ผู้แจ้งจะเห็นทั้งสถานะและข้อความในการแจ้งเตือนเดียวกัน
      </p>
    </div>
  );
}