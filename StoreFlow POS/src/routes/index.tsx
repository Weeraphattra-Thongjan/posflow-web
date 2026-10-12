import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Tag,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "PosFlow — POS ออนไลน์สำหรับร้านค้า" },
      { name: "description", content: "เปิดร้านบนระบบ POS ออนไลน์ใน 1 นาที จัดการสินค้า ตัดสต๊อก รายงานยอดขาย ฟรี" },
    ],
  }),
});

function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: ShoppingCart, key: "pos" },
    { icon: Package, key: "stock" },
    { icon: BarChart3, key: "report" },
    { icon: Users, key: "team" },
    { icon: Tag, key: "promo" },
    { icon: Shield, key: "secure" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />

        {/* Animated decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl animate-blob" />
          <div className="absolute top-20 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl animate-blob animation-delay-4000" />
        </div>

        {/* Subtle grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,oklch(0.55_0.21_262/0.18)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.21_262/0.18)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent_75%)]"
        />

        {/* Floating sparkles */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Sparkles className="absolute left-[12%] top-[28%] h-5 w-5 text-primary-glow/60 animate-float" />
          <Sparkles className="absolute right-[16%] top-[22%] h-4 w-4 text-primary/50 animate-float animation-delay-2000" />
          <Sparkles className="absolute right-[28%] bottom-[20%] h-6 w-6 text-primary-glow/50 animate-float animation-delay-4000" />
          <Sparkles className="absolute left-[22%] bottom-[26%] h-4 w-4 text-primary/40 animate-float" />
        </div>

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("hero.badge")}
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight md:text-6xl">
              <span className="text-gradient">{t("hero.title")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow transition-smooth hover:opacity-90">
                <Link to="/signup">
                  {t("hero.cta.primary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">{t("hero.cta.secondary")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("features.subtitle")}</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-3xl bg-card p-7 shadow-elegant transition-smooth hover:-translate-y-1.5 hover:shadow-glow"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl icon-tint ring-1 ring-primary/10">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{t(`feat.${key}.t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`feat.${key}.d`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-12 text-center shadow-elegant md:p-16">
          <div className="absolute inset-0 bg-gradient-mesh opacity-30" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mt-3 text-primary-foreground/80">{t("cta.subtitle")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/signup">
                {t("hero.cta.primary")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 PosFlow · สำหรับ POS การชำระเงิน
        </div>
      </footer>
    </div>
  );
}
