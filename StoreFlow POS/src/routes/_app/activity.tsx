import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/activity")({
  component: ActivityPage,
  head: () => ({ meta: [{ title: "Activity log | PosFlow" }] }),
});

interface AuditLog {
  id: number;
  user_id: string | null;
  user_email: string | null;
  table_name: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  record_label: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

const TABLE_LABEL: Record<string, string> = {
  products: "สินค้า",
  categories: "หมวดหมู่",
  promotions: "โปรโมชั่น",
  staff_invites: "คำเชิญพนักงาน",
  store_members: "สมาชิกร้าน",
  store_custom_menu_items: "เมนูของร้าน",
  store_menu_settings: "การตั้งค่าเมนู",
  sales: "บิลการขาย",
  stores: "ข้อมูลร้าน",
};

const FIELD_LABEL: Record<string, string> = {
  name: "ชื่อ",
  price: "ราคา",
  cost: "ต้นทุน",
  stock: "สต็อก",
  low_stock_threshold: "แจ้งเตือนสต็อกต่ำ",
  sku: "SKU",
  barcode: "บาร์โค้ด",
  image_url: "รูปภาพ",
  is_active: "เปิดใช้งาน",
  category_id: "หมวดหมู่",
  color: "สี",
  code: "โค้ด",
  discount_type: "ประเภทส่วนลด",
  discount_value: "มูลค่าส่วนลด",
  min_purchase: "ยอดขั้นต่ำ",
  starts_at: "วันเริ่ม",
  ends_at: "วันสิ้นสุด",
  email: "อีเมล",
  role: "ตำแหน่ง",
  status: "สถานะ",
  total: "ยอดสุทธิ",
  subtotal: "ยอดก่อนส่วนลด",
  discount: "ส่วนลด",
  payment_method: "วิธีชำระ",
  note: "หมายเหตุ",
  description: "คำอธิบาย",
  slug: "slug",
  label: "ชื่อเมนู",
  icon: "ไอคอน",
  link: "ลิงก์",
  content: "เนื้อหา",
  sort_order: "ลำดับ",
  hidden_keys: "เมนูที่ซ่อน",
};

const ACTION = {
  INSERT: { label: "เพิ่ม", icon: Plus, cls: "bg-green-100 text-green-700" },
  UPDATE: { label: "แก้ไข", icon: Pencil, cls: "bg-blue-100 text-blue-700" },
  DELETE: { label: "ลบ", icon: Trash2, cls: "bg-red-100 text-red-700" },
} as const;

// ฟิลด์ที่ไม่ต้องแสดง (ระบบใช้ภายใน)
const HIDDEN_FIELDS = new Set(["id", "store_id", "created_at", "updated_at", "invited_by", "user_id", "owner_id"]);

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "ใช่" : "ไม่";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ActivityPage() {
  const { store } = useStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [tableFilter, setTableFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  useEffect(() => {
    if (!store) return;
    setLoading(true);
    (supabase.from as any)("audit_logs")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data, error }: { data: AuditLog[] | null; error: { message: string } | null }) => {
        setError(error?.message ?? null);
        setLogs(data ?? []);
        setLoading(false);
      });
  }, [store]);

  const users = useMemo(
    () => Array.from(new Set(logs.map((l) => l.user_email ?? "ระบบ"))),
    [logs]
  );
  const tables = useMemo(() => Array.from(new Set(logs.map((l) => l.table_name))), [logs]);

  const filtered = logs.filter(
    (l) =>
      (tableFilter === "all" || l.table_name === tableFilter) &&
      (userFilter === "all" || (l.user_email ?? "ระบบ") === userFilter)
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">ประวัติการแก้ไข</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          บันทึกอัตโนมัติทุกครั้งที่มีการเพิ่ม แก้ไข หรือลบข้อมูลในร้าน (แก้ไขหรือลบประวัติไม่ได้)
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          aria-label="กรองตามประเภทข้อมูล"
        >
          <option value="all">ทุกประเภท</option>
          {tables.map((t) => (
            <option key={t} value={t}>
              {TABLE_LABEL[t] ?? t}
            </option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          aria-label="กรองตามผู้แก้ไข"
        >
          <option value="all">ทุกคน</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading && <p className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</p>}

        {!loading && error && (
          <p className="p-8 text-center text-sm text-red-600">ไม่สามารถโหลดประวัติได้: {error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <History className="h-8 w-8" />
            <p className="text-sm">ยังไม่มีประวัติการแก้ไข</p>
          </div>
        )}

        <ul className="divide-y divide-border">
          {filtered.map((l) => {
            const a = ACTION[l.action];
            const Icon = a.icon;
            const open = openId === l.id;
            const fields =
              l.action === "UPDATE"
                ? Object.entries(l.changes ?? {}).filter(([k]) => !HIDDEN_FIELDS.has(k))
                : Object.entries(l.data ?? {}).filter(([k]) => !HIDDEN_FIELDS.has(k));
            const preview =
              l.action === "UPDATE"
                ? fields.map(([k]) => FIELD_LABEL[k] ?? k).join(", ")
                : "";

            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : l.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/30"
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{l.user_email ?? "ระบบ"}</span>{" "}
                      {a.label}
                      {TABLE_LABEL[l.table_name] ?? l.table_name}{" "}
                      {l.record_label && <span className="font-medium">"{l.record_label}"</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtDateTime(l.created_at)}
                      {preview && ` · เปลี่ยน: ${preview}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                    {TABLE_LABEL[l.table_name] ?? l.table_name}
                  </Badge>
                  {fields.length > 0 &&
                    (open ? (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    ))}
                </button>

                {open && fields.length > 0 && (
                  <div className="px-4 pb-4 pl-[60px]">
                    <table className="w-full overflow-hidden rounded-lg border border-border text-sm">
                      <thead className="bg-muted/30 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">ข้อมูล</th>
                          {l.action === "UPDATE" ? (
                            <>
                              <th className="px-3 py-2 text-left">ก่อนแก้</th>
                              <th className="px-3 py-2 text-left">หลังแก้</th>
                            </>
                          ) : (
                            <th className="px-3 py-2 text-left">ค่า</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map(([k, v]) => (
                          <tr key={k} className="border-t border-border/60">
                            <td className="px-3 py-2 text-muted-foreground">{FIELD_LABEL[k] ?? k}</td>
                            {l.action === "UPDATE" ? (
                              <>
                                <td className="px-3 py-2 text-red-600 line-through decoration-red-300">
                                  {show((v as { old: unknown }).old)}
                                </td>
                                <td className="px-3 py-2 font-medium text-green-700">
                                  {show((v as { new: unknown }).new)}
                                </td>
                              </>
                            ) : (
                              <td className="px-3 py-2">{show(v)}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}