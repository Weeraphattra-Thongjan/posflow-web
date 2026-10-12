import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMenuPrefs } from "@/lib/menu-prefs";
import { getCustomIcon } from "@/lib/custom-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/custom/$id")({
  component: CustomMenuPage,
});

interface Entry {
  id: string;
  text: string;
  link: string | null;
  sort_order: number;
}

function CustomMenuPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { store } = useStore();
  const { customItems } = useMenuPrefs();
  const item = useMemo(() => customItems.find((c) => c.id === id), [customItems, id]);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState({ text: "", link: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("store_custom_menu_entries")
      .select("id, text, link, sort_order")
      .eq("menu_item_id", item.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setEntries((data ?? []) as Entry[]);
    setLoading(false);
  }, [item]);

  useEffect(() => { load(); }, [load]);

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> กลับ
        </Button>
        <p className="text-muted-foreground">ไม่พบเมนูนี้</p>
      </div>
    );
  }

  const Icon = getCustomIcon(item.icon);

  const openCreate = () => {
    setEditing(null);
    setForm({ text: "", link: "" });
    setDialogOpen(true);
  };
  const openEdit = (e: Entry) => {
    setEditing(e);
    setForm({ text: e.text, link: e.link ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error("กรุณาใส่ข้อความ"); return; }
    if (form.link.trim() && !/^https?:\/\//i.test(form.link.trim())) {
      toast.error("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"); return;
    }
    if (!store) return;
    setSaving(true);
    try {
      const link = form.link.trim() || null;
      if (editing) {
        const { error } = await supabase
          .from("store_custom_menu_entries")
          .update({ text: form.text.trim(), link })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("แก้ไขแล้ว");
      } else {
        const { error } = await supabase
          .from("store_custom_menu_entries")
          .insert({
            menu_item_id: item.id,
            store_id: store.id,
            text: form.text.trim(),
            link,
            sort_order: entries.length,
          });
        if (error) throw error;
        toast.success("เพิ่มแล้ว");
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("ลบรายการนี้?")) return;
    const { error } = await supabase.from("store_custom_menu_entries").delete().eq("id", entryId);
    if (error) { toast.error(error.message); return; }
    toast.success("ลบแล้ว");
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">{item.label}</h1>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> เพิ่ม
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="ยังไม่มีรายการ"
          description='กดปุ่ม "เพิ่ม" เพื่อสร้างรายการใหม่พร้อมข้อความและลิงก์'
          actionLabel="เพิ่มรายการ"
          onAction={openCreate}
        />
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{e.text}</p>
                  {e.link && (
                    <a
                      href={e.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[420px]">{e.link}</span>
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขรายการ" : `เพิ่มรายการใน "${item.label}"`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ข้อความ</Label>
              <Textarea
                value={form.text}
                onChange={(ev) => setForm({ ...form, text: ev.target.value })}
                placeholder="เช่น เลขพัสดุ คุณ K, รหัสคูปอง, รายการที่ต้องสั่งซื้อ"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ลิงก์ (ไม่บังคับ)</Label>
              <Input
                value={form.link}
                onChange={(ev) => setForm({ ...form, link: ev.target.value })}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
