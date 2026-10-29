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

interface StaffInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function StaffPage() {
  const { store } = useStore();
  const { user } = useAuth();
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    role: "cashier",
  });

  // โหลดรายการพนักงาน
  const loadInvites = async () => {
    if (!store?.id) return;
    const { data, error } = await supabase
      .from("staff_invites")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvites(data);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [store?.id]);

  // ฟังก์ชันเพิ่มพนักงาน
  const handleSave = async () => {
    if (!store?.id || !user?.id || !form.email.trim()) {
      toast.error("กรุณากรอกอีเมลพนักงาน");
      return;
    }

    setLoading(true);
    const email = form.email.trim().toLowerCase();

    try {
      // 1. เช็กก่อนว่ามีคำเชิญอีเมลนี้ในร้านหรือยัง
      const { data: existing } = await supabase
        .from("staff_invites")
        .select("id")
        .eq("store_id", store.id)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        // ถ้ามีแล้วให้อัปเดต
        const { error: updateError } = await supabase
          .from("staff_invites")
          .update({ role: form.role, invited_by: user.id, status: "pending" })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        // ถ้ายังไม่มีให้ Insert ใหม่ (เลี่ยงปัญหา ON CONFLICT Error)
        const { error: insertError } = await supabase
          .from("staff_invites")
          .insert({
            store_id: store.id,
            email,
            role: form.role,
            invited_by: user.id,
            status: "pending",
          });

        if (insertError) throw insertError;
      }

      // 2. สร้างลิงก์คำเชิญและคัดลอกลง Clipboard ทันที
      const copyInviteUrl = `${window.location.origin}/accept-invite?store_id=${store.id}&email=${encodeURIComponent(
        email
      )}`;
      await navigator.clipboard.writeText(copyInviteUrl);

      // 3. พยายามส่ง Magic Link เผื่อไว้
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: copyInviteUrl },
      });

      toast.success(
        "บันทึกข้อมูลเรียบร้อย! คัดลอกลิงก์คำเชิญลง Clipboard ให้แล้ว ส่งทาง LINE ได้เลย"
      );

      setOpen(false);
      setForm({ email: "", role: "cashier" });
      loadInvites();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถเพิ่มพนักงานได้"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (inviteEmail: string, inviteId: string) => {
    if (!store?.id) return;
    const inviteUrl = `${window.location.origin}/accept-invite?store_id=${store.id}&email=${encodeURIComponent(
      inviteEmail
    )}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inviteId);
    toast.success("คัดลอกลิงก์คำเชิญเรียบร้อยแล้ว");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm("คุณต้องการลบคำเชิญนี้ใช่หรือไม่?")) return;
    const { error } = await supabase.from("staff_invites").delete().eq("id", id);
    if (error) {
      toast.error("ไม่สามารถลบคำเชิญได้");
    } else {
      toast.success("ลบคำเชิญเรียบร้อยแล้ว");
      loadInvites();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">จัดการพนักงาน</h1>
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
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">บทบาท</label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm({ ...form, role: val })}
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

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  ยกเลิก
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-background rounded-xl border divide-y">
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
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{item.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {item.role === "owner" ? "เจ้าของร้าน" : "พนักงานขาย"}
                    </span>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => handleCopyLink(item.email, item.id)}
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

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
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