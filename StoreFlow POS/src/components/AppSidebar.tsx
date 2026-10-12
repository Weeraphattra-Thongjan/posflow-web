import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutGrid, Monitor, Package, Tag, Receipt, BarChart3, Users, LogOut, ShieldAlert,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth";
import { useMenuPrefs, type MenuKey } from "@/lib/menu-prefs";
import { getCustomIcon } from "@/lib/custom-icons";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { t } = useI18n();
  const { store } = useStore();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
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
  ];
  const onAdminPage = path.startsWith("/admin");
  const adminItem = { key: "admin" as const, to: "/admin", icon: ShieldAlert, label: t("side.admin") };
  const items = onAdminPage && isAdmin
    ? [adminItem]
    : [
        ...allItems.filter((i) => !hidden.has(i.key)),
        ...(isAdmin ? [adminItem] : []),
      ];

  const initial = store?.name?.[0]?.toUpperCase() ?? "S";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary font-display text-base font-bold text-primary-foreground shadow-glow">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold">{store?.name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{t("side.owner")}</p>
            </div>
          )}
        </div>
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
  );
}
