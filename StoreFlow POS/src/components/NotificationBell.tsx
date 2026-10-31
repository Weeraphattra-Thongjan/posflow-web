import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: number;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

// ตารางใหม่ยังไม่มีใน type ที่ generate ไว้
const notifTable = () => (supabase.from as any)("notifications");

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
}

// กระดิ่งแจ้งเตือนในแถบด้านบน: แสดงจำนวนที่ยังไม่อ่าน และเด้ง toast ทันทีเมื่อมีแจ้งเตือนใหม่ (Realtime)
export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await notifTable()
      .select("id, title, body, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }, [user]);

  // โหลดครั้งแรก + ฟังแจ้งเตือนใหม่แบบ realtime
  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: { new: Notification }) => {
          const n = payload.new;
          setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 30));
          toast(n.title, { description: n.body ?? undefined, duration: 8000 });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  // ปิดเมื่อคลิกนอกกล่อง / กด Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await notifTable().update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const remove = async (id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await notifTable().delete().eq("id", id);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) markAllRead(); // ปิดกล่องแล้วถือว่าอ่านแล้ว
  };

  if (!user) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
        aria-label={unread ? `การแจ้งเตือน ${unread} รายการที่ยังไม่อ่าน` : "การแจ้งเตือน"}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold">การแจ้งเตือน</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id} className={`group flex gap-3 px-4 py-3 ${n.is_read ? "" : "bg-primary/5"}`}>
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-primary"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && (
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 px-2 py-1.5 text-sm text-foreground/90">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className="h-7 w-7 shrink-0 rounded-md text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                      aria-label="ลบการแจ้งเตือน"
                    >
                      <Trash2 className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}