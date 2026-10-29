import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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
  role: "owner" | "cashier";
  status: "pending" | "accepted";
  created_at: string;
}

export default function StaffPage() {
  const { user, store } = useAuth();
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
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
      setInvites(data || []);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [store]);

  // ฟังก์ชันเพิ่ม/เชิญพนักงาน
  const handleSave = async () => {
    if (!store || !user || !form.email.trim()) {
      toast.error("กรุณากรอกอีเมลพนักงาน");
      return;
    }

    setLoading(true);
    const email = form.email.trim().toLowerCase();
    const acceptUrl = `${window.location.origin}/accept-invite?store_id=${store.id}&role=${form.role}`;

    try {
      // 1. บันทึกข้อมูลคำเชิญลงในตาราง staff_invites (ใช้ upsert)
      const { error: dbError } = await supabase.from("staff_invites").upsert(
        {
          store_id: store.id,
          email,
          role: form.role as "cashier" | "owner",
          invited_by: user.id,
          status: "pending",
        },
        { onConflict: "store_id,email" }
      );

      if (dbError) throw dbError;

      // 2. พยายามส่ง Magic Link ผ่าน Supabase Auth
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: acceptUrl,
        },
      });

      // 3. คัดลอกลิงก์คำเชิญสำรองเก็บไว้ใน Clipboard ให้ผู้ใช้ทันที
      const copyInviteUrl = `${window.location.origin}/accept-invite?store_id=${store.id}&email=${encodeURIComponent(
        email
      )}`;
      await navigator.clipboard.writeText(copyInviteUrl);

      if (authError) {
        // หากส่งอีเมลไม่สำเร็จ (ติดข้อจำกัด Resend / Rate Limit)
        toast.success(
          "บันทึกข้อมูลเรียบร้อย! คัดลอกลิงก์คำเชิญให้แล้ว นำไปส่งทาง LINE ให้พนักงานได้เลย",
          { duration: 6000 }
        );
      } else {
        toast.success(
          "ส่งอีเมลเชิญเรียบร้อย และคัดลอกลิงก์คำเชิญลง Clipboard แล้ว!"
        );
      }

      setOpen(false);
      setForm({ email: "", role: "cashier" });
      loadInvites();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถเพิ่มพนักงานได้"));
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันกดก๊อปปี้ลิงก์เชิญจากรายการ
  const handleCopyLink = async (inviteEmail: string, inviteId: string) => {
    if (!store) return;
    const inviteUrl = `${window.location.origin}/accept-invite?store_id=${store.id}&email=${encodeURIComponent(
      inviteEmail
    )}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inviteId);
    toast.success("คัดลอกลิงก์คำเชิญเรียบร้อยแล้ว");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ฟังก์ชันลบคำเชิญ
  const handleDeleteInvite = async (id: string) => {
    if (!confirm("คุณต้องการลบคำเชิญนี้ใช่หรือไม่?")) return;

    const { error } = await supabase
      .from("staff_invites")
      .delete()
      .eq("id", id);

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
          <p className="text-sm text-gray-500">
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

      {/* รายการพนักงาน/คำเชิญ */}
      <div className="bg-white rounded-xl border divide-y">
        {invites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            ยังไม่มีรายการพนักงาน กดปุ่ม "เพิ่มพนักงาน" เพื่อส่งคำเชิญ
          </div>
        ) : (
          invites.map((item) => (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{item.email}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize">
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
                      {item.status === "accepted"
                        ? "ตอบรับแล้ว"
                        : "รอยืนยัน"}
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