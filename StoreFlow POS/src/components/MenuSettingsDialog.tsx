import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2, Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MENU_KEYS, useMenuPrefs, type MenuKey, type CustomMenuItem } from "@/lib/menu-prefs";
import { useI18n } from "@/lib/i18n";
import { CUSTOM_ICON_NAMES, getCustomIcon } from "@/lib/custom-icons";
import { cn } from "@/lib/utils";

const LABEL_KEY: Record<MenuKey, string> = {
  dashboard: "side.overview",
  pos: "side.pos",
  products: "side.products",
  promotions: "side.promos",
  sales: "side.sales",
  reports: "side.reports",
  staff: "side.staff",
};

export function MenuSettingsDialog() {
  const { t } = useI18n();
  const { hidden, save, customItems, addCustom, updateCustom, removeCustom } = useMenuPrefs();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Set<MenuKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CustomMenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", icon: "Star", content: "", link: "" });

  useEffect(() => { if (open) setLocal(new Set(hidden)); }, [open, hidden]);

  const toggle = (k: MenuKey) => {
    const next = new Set(local);
    if (next.has(k)) next.delete(k); else next.add(k);
    setLocal(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save([...local]);
      toast.success("บันทึกการตั้งค่าเมนูแล้ว");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ label: "", icon: "Star", content: "", link: "" });
    setShowForm(true);
  };

  const openEdit = (c: CustomMenuItem) => {
    setEditing(c);
    setForm({ label: c.label, icon: c.icon, content: c.content ?? "", link: c.link ?? "" });
    setShowForm(true);
  };

  const submitCustom = async () => {
    if (!form.label.trim()) { toast.error("กรุณาใส่ชื่อเมนู"); return; }
    if (form.link.trim() && !/^https?:\/\//i.test(form.link.trim())) {
      toast.error("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"); return;
    }
    try {
      if (editing) {
        await updateCustom(editing.id, { label: form.label.trim(), icon: form.icon, content: form.content, link: form.link });
        toast.success("แก้ไขเมนูแล้ว");
      } else {
        await addCustom({ label: form.label.trim(), icon: form.icon, content: form.content, link: form.link });
        toast.success("เพิ่มเมนูแล้ว");
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบเมนูนี้?")) return;
    try {
      await removeCustom(id);
      toast.success("ลบเมนูแล้ว");
    } catch (e: any) {
      toast.error(e.message ?? "ลบไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          ปรับแถบเมนู
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ปรับแถบเมนูของร้าน</DialogTitle>
          <DialogDescription>เลือกเปิด/ปิดเมนูที่ต้องการ และเพิ่มเมนูเฉพาะของร้านได้</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">เมนูพื้นฐาน</p>
          {MENU_KEYS.map((k) => {
            const enabled = !local.has(k);
            return (
              <div key={k} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                <span className="text-sm font-medium">{t(LABEL_KEY[k])}</span>
                <Switch checked={enabled} onCheckedChange={() => toggle(k)} />
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">เมนูเฉพาะของร้าน</p>
            <Button size="sm" variant="outline" onClick={openCreate} className="gap-1">
              <Plus className="h-4 w-4" /> เพิ่ม
            </Button>
          </div>
          {customItems.length === 0 && !showForm && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              ยังไม่มีเมนูเฉพาะของร้าน — เพิ่มเมนูเพื่อจดบันทึก/ลิงก์เฉพาะร้านของคุณ
            </p>
          )}
          {customItems.map((c) => {
            const Icon = getCustomIcon(c.icon);
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
                <Icon className="h-4 w-4 text-primary" />
                <span className="flex-1 truncate text-sm font-medium">{c.label}</span>
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}

          {showForm && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ชื่อเมนู</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="เช่น สูตรอาหาร, ลิงก์ไลน์, บันทึกประจำวัน"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ไอคอน</Label>
                <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-2">
                  {CUSTOM_ICON_NAMES.map((name) => {
                    const Icon = getCustomIcon(name);
                    const active = form.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm({ ...form, icon: name })}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                          active ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">เนื้อหา / บันทึก (ไม่บังคับ)</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="ใส่บันทึก คำอธิบาย หรือรายละเอียดที่ต้องการเปิดดูในเมนูนี้"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ลิงก์ภายนอก (ไม่บังคับ)</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://example.com"
                  type="url"
                />
                <p className="text-[11px] text-muted-foreground">เมื่อใส่ลิงก์ จะมีปุ่มเปิดในแท็บใหม่ในหน้าเมนู</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
                <Button size="sm" onClick={submitCustom} className="bg-gradient-primary text-primary-foreground">
                  {editing ? "บันทึก" : "เพิ่ม"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ปิด</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            บันทึกการตั้งค่า
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
