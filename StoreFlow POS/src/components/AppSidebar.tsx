import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutGrid, Monitor, Package, Tag, Receipt, BarChart3, Users, LogOut, ShieldAlert,
  ChevronsUpDown, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { useStore, ACTIVE_STORE_KEY } from "@/lib/store-context";
import { useAuth } from "@/lib/auth";
import { useMenuPrefs, type MenuKey } from "@/lib/menu-prefs";
import { getCustomIcon } from "@/lib/custom-icons";
import { supabase } from "@/integrations/supabase/client";

// เมนูที่พนักงานขาย (Cashier) เห็นได้ — แก้ตรงนี้ที่เดียว
const CASHIER_MENUS: MenuKey[] = ["dashboard", "pos", "promotions", "sales"];

export function AppSidebar() {
  const { t } = useI18n();
  const { store, role, stores, switchStore, loading: storeLoading } = useStore();
  const canSwitch = stores.length > 1;
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
  const { hidden, customItems } = useMenuPrefs();
  const isCashier = role === "cashier";

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
  ];

  // กรองเมนูตามบทบาท
  const roleItems = isCashier
    ? allItems.filter((i) => CASHIER_MENUS.includes(i.key))
    : allItems;

  // กันพนักงานพิมพ์ URL เข้าหน้าที่ไม่มีสิทธิ์ → ส่งกลับไปหน้าขาย
  // (เป็นแค่ฝั่ง UI ข้อมูลจริงต้องกันด้วย RLS ใน Supabase)
  useEffect(() => {
    if (storeLoading || !isCashier) return;
    const allowed = roleItems.some((i) => path === i.to || path.startsWith(i.to + "/"));
    if (!allowed) navigate({ to: "/pos", replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, isCashier, storeLoading]);

  const onAdminPage = path.startsWith("/admin");
  const adminItem = { key: "admin" as const, to: "/admin", icon: ShieldAlert, label: t("side.admin") };
  const items = onAdminPage && isAdmin
    ? [adminItem]
    : [
        ...roleItems.filter((i) => !hidden.has(i.key)),
        ...(isAdmin ? [adminItem] : []),
      ];

  const initial = store?.name?.[0]?.toUpperCase() ?? "S";
  const roleText = (r: string | null) => (r === "cashier" ? "พนักงานขาย" : t("side.owner"));
  const roleLabel = roleText(role);

  const handleSwitch = (id: string) => {
    if (id === store?.id) return;
    switchStore(id);
    // กลับหน้าขาย (ทุกตำแหน่งเข้าได้) กันค้างอยู่หน้าที่ร้านใหม่ไม่มีสิทธิ์
    navigate({ to: "/pos" });
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
          {canSwitch && <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </>
      )}
    </div>
  );

  const handleSignOut = async () => {
    try {
      localStorage.removeItem(ACTIVE_STORE_KEY);
    } catch {
      /* ไม่เป็นไร */
    }
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        {canSwitch ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-lg transition hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                aria-label="สลับร้าน"
                title="สลับร้าน"
              >
                {storeHeader}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">สลับร้าน</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {stores.map((o) => (
                <DropdownMenuItem
                  key={o.store.id}
                  onSelect={() => handleSwitch(o.store.id)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {o.store.name?.[0]?.toUpperCase() ?? "S"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.store.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{roleText(o.role)}</p>
                  </div>
                  {o.store.id === store?.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          storeHeader
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("common.menu")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!onAdminPage && !isCashier && customItems.length > 0 && (
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
  );
}