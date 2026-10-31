import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Languages } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SupportTicketDialog } from "@/components/SupportTicketDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { StoreProvider, useStore } from "@/lib/store-context";
import { MenuPrefsProvider } from "@/lib/menu-prefs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    if (loading || user) {
      setCheckingSession(false);
      return;
    }

    let active = true;
    setCheckingSession(true);
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setCheckingSession(false);
      if (error || !data.user) {
        navigate({ to: location.pathname.startsWith("/admin") ? "/login" : "/signin", replace: true });
      }
    });

    return () => {
      active = false;
    };
  }, [loading, user, navigate, location.pathname]);

  if (loading || checkingSession || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <StoreProvider>
      <MenuPrefsProvider>
        <Shell />
      </MenuPrefsProvider>
    </StoreProvider>
  );
}

function Shell() {
  const { store, loading } = useStore();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !store) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, store, navigate]);

  if (loading || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              {/* กระดิ่งแจ้งเตือน: ผู้ใช้ได้รับเมื่อแอดมินอัปเดตเรื่องแจ้งปัญหา */}
              <NotificationBell />
              <SupportTicketDialog />
              <button
                onClick={() => setLang(lang === "th" ? "en" : "th")}
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
              >
                <Languages className="h-4 w-4" />
                <span className="uppercase">{lang}</span>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}