import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Gamepad2, Tv, Film, User, Sparkles, Users, Search, LogOut } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, SEED_MIN_TITLES, titlesQuery } from "@/lib/db";
import { seedCatalog } from "@/lib/catalog.functions";
import { Avatar } from "./bits";
import { Footer } from "./Footer";
import { AppearanceMenu, WallpaperLayer } from "./Appearance";

const main = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/jogos", label: "Jogos", icon: Gamepad2 },
  { to: "/series", label: "Séries", icon: Tv },
  { to: "/filmes", label: "Filmes", icon: Film },
] as const;
const community = [
  { to: "/comunidades", label: "Comunidades", icon: Users },
  { to: "/descobrir", label: "Descobrir", icon: Sparkles },
] as const;

export function Logo() {
  return (
    <Link to="/" className="font-display text-xl font-extrabold">
      <span className="text-brand">lore</span>box
    </Link>
  );
}

/** Imports the spreadsheet catalog into the database the first time a signed-in user opens the app. */
function useEnsureCatalog() {
  const qc = useQueryClient();
  const { data: titles } = useQuery(titlesQuery);
  const missing = !!titles && titles.length < SEED_MIN_TITLES;
  useEffect(() => {
    if (!missing) return;
    try {
      if (sessionStorage.getItem("lorebox_seeded")) return;
      sessionStorage.setItem("lorebox_seeded", "1");
    } catch {
      /* storage unavailable: try anyway, the import is idempotent */
    }
    seedCatalog()
      .then(() => qc.invalidateQueries({ queryKey: ["titles"] }))
      .catch((e) => console.warn("Catalog import failed", e));
  }, [missing, qc]);
}

export function Shell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  useEnsureCatalog();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }
  const linkCls =
    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground";
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <WallpaperLayer />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {main.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={linkCls}
                activeProps={{ className: "bg-primary font-semibold !text-primary-foreground" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            {community.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={linkCls}
                activeProps={{ className: "bg-primary font-semibold !text-primary-foreground" }}
              >
                <n.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {community.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-label={n.label}
                className="text-muted-foreground md:hidden"
                activeProps={{ className: "text-primary" }}
              >
                <n.icon className="h-5 w-5" />
              </Link>
            ))}
            <Link
              to="/explorar"
              aria-label="Buscar"
              className="text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Search className="h-5 w-5 md:h-4 md:w-4" />
            </Link>
            <AppearanceMenu />
            {me && (
              <Link to="/perfil" className="hidden items-center gap-2 text-sm md:flex">
                <Avatar name={me.display_name} hue={me.avatar_hue} size={28} />
                <span className="hidden lg:inline">@{me.username}</span>
              </Link>
            )}
            <button
              onClick={signOut}
              aria-label="Sair"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <Footer />
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {[...main, { to: "/perfil", label: "Perfil", icon: User } as const].map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
