import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { Link } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PosFlow — POS ออนไลน์สำหรับร้านค้า | Modern Web POS" },
      { name: "description", content: "ระบบ POS บนเว็บที่ร้านค้าสมัครและใช้งานได้เอง จัดการสินค้า ตัดสต๊อก รายงานยอดขาย ครบจบในระบบเดียว" },
      { property: "og:title", content: "PosFlow — POS ออนไลน์สำหรับร้านค้า | Modern Web POS" },
      { property: "og:description", content: "ระบบ POS บนเว็บที่ร้านค้าสมัครและใช้งานได้เอง จัดการสินค้า ตัดสต๊อก รายงานยอดขาย ครบจบในระบบเดียว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PosFlow — POS ออนไลน์สำหรับร้านค้า | Modern Web POS" },
      { name: "twitter:description", content: "ระบบ POS บนเว็บที่ร้านค้าสมัครและใช้งานได้เอง จัดการสินค้า ตัดสต๊อก รายงานยอดขาย ครบจบในระบบเดียว" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0551a01-40ef-4626-9239-d8602de199a4/id-preview-f7e70feb--2490dc29-3c45-4c38-9988-27459ecbddc6.lovable.app-1777437353907.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0551a01-40ef-4626-9239-d8602de199a4/id-preview-f7e70feb--2490dc29-3c45-4c38-9988-27459ecbddc6.lovable.app-1777437353907.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}