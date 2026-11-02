import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutGrid, Monitor, Package, Tag, Receipt, BarChart3, Users, LogOut, ShieldAlert,
  History, MessageSquare,
} from "lucide-react";
import { StorePicker } from "@/components/StorePicker";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { useStore, clearStoreChoice } from "@/lib/store-context";
import { useAuth } from "@/lib/auth";
import { useMenuPrefs, type MenuKey } from "@/lib/menu-prefs";
import { getCustomIcon } from "@/lib/custom-icons";
import { supabase } from "@/integrations/supabase/client";

// พนักงานขาย (Cashier) เห็นทุกเมนูเหมือนเจ้าของร้าน
// ทุกการแก้ไขถูกบันทึกในหน้า "ประวัติการแก้ไข" (audit_logs) โดย trigger ในฐานข้อมูล

export function AppSidebar() {
  const { t } = useI18n();
  const { store, role, stores, switchStore, needsSelection } = useStore();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
  const [openTickets, setOpenTickets] = useState(0);
  const { hidden, customItems } = useMenuPrefs();

  useEffect(() => {
    if (!user) return;
    supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const allItems: { key: MenuKey; to: string; icon: typeof LayoutGrid; label: string }[] = [
    { key: "dashboard", to: "/dashboard", icon: LayoutGrid, label: t("side.overview") },
    { key: "pos", to: "/pos", icon: Monitor, label: t("side.pos") },
    { key: "products", to: "/products", icon: Package, label: t("side.products") },
    { key: "promotions", to: "/promotions", icon: Tag, label: t("side.promos") },
    { key: "sales", to: "/sales", icon: Receipt, label: t("side.sales") },
    { key: "reports", to: "/reports", icon: BarChart3, label: t("side.reports") },
    { key: "staff", to: "/staff", icon: Users, label: t("side.staff") },
    { key: "activity" as MenuKey, to: "/activity", icon: History, label: "ประวัติการแก้ไข" },
  ];

  // ทุกบทบาทเห็นเมนูเท่ากัน
  const roleItems = allItems;

  const onAdminPage = path.startsWith("/admin");
  const adminItem = { key: "admin" as const, to: "/admin", icon: ShieldAlert, label: t("side.admin") };
  // เมนูฝั่งแอดมิน: ภาพรวมร้านค้า + เรื่องแจ้งปัญหา (แยกหน้า)
  const adminItems = [
    { ...adminItem, label: "ภาพรวมร้านค้า" },
    { key: "admin_tickets" as const, to: "/admin/tickets", icon: MessageSquare, label: "เรื่องแจ้งปัญหา", badge: openTickets },
  ];

  // นับเรื่องแจ้งปัญหาที่ยังไม่ปิด (แสดงเป็นตัวเลขบนเมนู)
  useEffect(() => {
    if (!isAdmin || !onAdminPage) return;
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed")
      .then(({ count }) => setOpenTickets(count ?? 0));
  }, [isAdmin, onAdminPage, path]);

  const items: { key: string; to: string; icon: typeof LayoutGrid; label: string; badge?: number }[] = onAdminPage && isAdmin
    ? adminItems
    : [
        ...roleItems.filter((i) => !hidden.has(i.key)),
        ...(isAdmin ? [adminItem] : []),
      ];

  const initial = store?.name?.[0]?.toUpperCase() ?? "S";
  const roleText = (r: string | null) => (r === "cashier" ? "พนักงานขาย" : t("side.owner"));
  const roleLabel = roleText(role);

  // เลือกร้านได้เฉพาะหลังเข้าสู่ระบบเท่านั้น (ต้องการเปลี่ยนร้าน → ออกจากระบบแล้วเข้าใหม่)
  // ยืนยันเลือกร้าน: บันทึกร้านที่เลือก แล้วโหลดหน้าใหม่ให้ทุกหน้าดึงข้อมูลของร้านนี้
  const handleChoose = (id: string) => {
    switchStore(id);
    window.location.assign("/pos");
  };

  const storeHeader = (
    <div className="flex w-full items-center gap-3 px-2 py-2 text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary font-display text-base font-bold text-primary-foreground shadow-glow">
        {initial}
      </div>
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold">{store?.name ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </>
      )}
    </div>
  );

  const handleSignOut = async () => {
    clearStoreChoice(); // ครั้งหน้าต้องเลือกร้านใหม่
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <>
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        {storeHeader}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("common.menu")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                // /dashboard และ /admin ต้องตรงทุกตัว (กัน /admin ติด active ตอนอยู่ /admin/tickets)
                const exact = item.to === "/dashboard" || (item.to === "/admin" && onAdminPage);
                const active = exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {!collapsed && !!item.badge && (
                          <span className="rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!onAdminPage && customItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t("side.store_menu")}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {customItems.map((c) => {
                  const Icon = getCustomIcon(c.icon);
                  const to = `/custom/${c.id}`;
                  const active = path === to;
                  return (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton asChild isActive={active} tooltip={c.label}>
                        <Link to="/custom/$id" params={{ id: c.id }} className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          {!collapsed && <span className="truncate">{c.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip={t("side.signout")}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>{t("side.signout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

      {/* หน้าเลือกร้านแสดงเฉพาะหลังเข้าสู่ระบบ (บัญชีที่มีหลายร้าน) และปิดไม่ได้จนกว่าจะเลือก
          วางไว้นอก <Sidebar> เพื่อให้แสดงได้ทั้งบนคอมและมือถือ */}
      <StorePicker
        open={needsSelection}
        closable={false}
        stores={stores}
        currentStoreId={store?.id}
        onChoose={handleChoose}
        onClose={() => {}}
        onSignOut={handleSignOut}
      />
    </>
  );
}