import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Copy, Check, Mail, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/staff")({
  component: StaffPage,
});

type StaffRole = "owner" | "cashier";

interface StaffInvite {
  id: string;
  email: string;
  role: StaffRole;
  status: "pending" | "accepted";
  token: string;
  created_at: string;
}

// ลิงก์เชิญใช้ token สุ่ม (เดาไม่ได้) ไม่ต้องพึ่งอีเมลจาก Supabase
const buildInviteUrl = (token: string) =>
  `${window.location.origin}/accept-invite?token=${token}`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function StaffPage() {
  const { user } = useAuth();
  const { store } = useStore();
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; role: StaffRole }>({
    email: "",
    role: "cashier",
  });

  // โหลดรายการพนักงาน/คำเชิญทั้งหมดในร้าน
  const loadInvites = async () => {
    if (!store) return;
    const { data, error } = await supabase
      .from("staff_invites")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("ไม่สามารถโหลดข้อมูลพนักงานได้: " + error.message);
    } else {
      setInvites((data as unknown as StaffInvite[]) || []);
    }
  };

  useEffect(() => {
    loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  // เพิ่ม/เชิญพนักงาน → บันทึกคำเชิญ แล้วคัดลอกลิงก์ให้ส่งทาง LINE
  const handleSave = async () => {
    if (!store || !user || !form.email.trim()) {
      toast.error("กรุณากรอกอีเมลพนักงาน");
      return;
    }

    setLoading(true);
    const email = form.email.trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from("staff_invites")
        .upsert(
          {
            store_id: store.id,
            email,
            role: form.role,
            invited_by: user.id,
            status: "pending",
          } as any,
          { onConflict: "store_id,email" }
        )
        .select("token")
        .single();

      if (error) throw error;

      const token = (data as any)?.token as string | undefined;
      if (!token) throw new Error("ไม่พบ token ของคำเชิญ (รัน SQL เพิ่มคอลัมน์ token แล้วหรือยัง?)");

      const copied = await copyText(buildInviteUrl(token));
      toast.success(
        copied
          ? "บันทึกแล้ว! คัดลอกลิงก์คำเชิญให้แล้ว ส่งให้พนักงานทาง LINE ได้เลย"
          : "บันทึกแล้ว! กดปุ่ม \"ก๊อปปี้ลิงก์\" ในรายการเพื่อส่งให้พนักงาน",
        { duration: 6000 }
      );

      setOpen(false);
      setForm({ email: "", role: "cashier" });
      loadInvites();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message || "ไม่สามารถเพิ่มพนักงานได้"));
    } finally {
      setLoading(false);
    }
  };

  // ก๊อปปี้ลิงก์เชิญจากรายการ
  const handleCopyLink = async (invite: StaffInvite) => {
    if (!invite.token) {
      toast.error("คำเชิญนี้ยังไม่มี token กรุณาลบแล้วเชิญใหม่");
      return;
    }
    if (await copyText(buildInviteUrl(invite.token))) {
      setCopiedId(invite.id);
      toast.success("คัดลอกลิงก์คำเชิญเรียบร้อยแล้ว");
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error("คัดลอกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  // ลบคำเชิญ
  const handleDeleteInvite = async (id: string) => {
    if (!confirm("คุณต้องการลบคำเชิญนี้ใช่หรือไม่?")) return;

    const { error } = await supabase.from("staff_invites").delete().eq("id", id);

    if (error) {
      toast.error("ไม่สามารถลบคำเชิญได้: " + error.message);
    } else {
      toast.success("ลบคำเชิญเรียบร้อยแล้ว");
      loadInvites();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">พนักงาน</h1>
          <p className="text-sm text-muted-foreground">
            จัดการพนักงานและคำเชิญเข้าใช้งานร้านค้า
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              เพิ่มพนักงาน
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มพนักงาน</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">อีเมลพนักงาน</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">บทบาท</label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm({ ...form, role: val as StaffRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">พนักงานขาย (Cashier)</SelectItem>
                    <SelectItem value="owner">เจ้าของร้าน (Owner)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                ระบบจะคัดลอกลิงก์คำเชิญให้ ส่งให้พนักงานทาง LINE เพื่อให้ตั้งรหัสผ่านเอง
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "กำลังบันทึก..." : "บันทึกและคัดลอกลิงก์"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* รายการพนักงาน/คำเชิญ */}
      <div className="bg-card rounded-xl border divide-y">
        {invites.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            ยังไม่มีรายการพนักงาน กดปุ่ม "เพิ่มพนักงาน" เพื่อสร้างคำเชิญ
          </div>
        ) : (
          invites.map((item) => (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{item.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.role === "owner" ? "เจ้าของร้าน" : "พนักงานขาย"}</span>
                    <span>•</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        item.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status === "accepted" ? "ตอบรับแล้ว" : "รอยืนยัน"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.status !== "accepted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => handleCopyLink(item)}
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        ก๊อปปี้ลิงก์
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteInvite(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}