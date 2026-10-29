import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite")({
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("กำลังยืนยันคำเชิญเข้าใช้งานร้านค้า...");

  useEffect(() => {
    const processInvite = async () => {
      // 1. ตรวจสอบว่าพนักงานเข้าระบบแล้วหรือยัง
      const { data: { session } } = await supabase.auth.getSession();
      
      const searchParams = new URLSearchParams(window.location.search);
      const storeId = searchParams.get("store_id");
      const role = searchParams.get("role") || "cashier";

      if (!session) {
        setStatus("กรุณาล็อกอินด้วยอีเมลของคุณเพื่อเข้าสู่ร้านค้า...");
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 1500);
        return;
      }

      if (storeId && session.user) {
        // 2. บันทึกสิทธิ์พนักงานลงในตาราง store_members
        const { error: memberError } = await supabase.from("store_members").upsert({
          store_id: storeId,
          user_id: session.user.id,
          role: role as "cashier" | "owner",
        }, { onConflict: "store_id,user_id" });

        if (memberError) {
          toast.error(`เกิดข้อผิดพลาด: ${memberError.message}`);
          return;
        }

        // 3. อัปเดตสถานะคำเชิญใน staff_invites
        await supabase
          .from("staff_invites")
          .update({ status: "accepted" })
          .eq("email", session.user.email?.toLowerCase() || "")
          .eq("store_id", storeId);

        // 4. ตั้งค่า active store ID ใน LocalStorage เพื่อให้สลับไปร้านค้านั้นทันที
        localStorage.setItem("pos_active_store_id", storeId);

        toast.success("เข้าสู่ร้านค้าสำเร็จ!");
        // 5. วาร์ปไปที่หน้าร้าน POS
        navigate({ to: "/pos" });
      } else {
        toast.error("ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุ");
        navigate({ to: "/" });
      }
    };

    processInvite();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-medium text-foreground">{status}</p>
      </div>
    </div>
  );
}