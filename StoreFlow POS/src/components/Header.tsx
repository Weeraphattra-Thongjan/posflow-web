import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Store, Languages, LogOut } from "lucide-react";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">PosFlow</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
            aria-label="Toggle language"
          >
            <Languages className="h-4 w-4" />
            <span className="uppercase">{lang}</span>
          </button>

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || t("dash.welcome")}
                </Link>
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" />
                {t("side.signout")}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/signin">{t("nav.signin")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to="/signup">{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
