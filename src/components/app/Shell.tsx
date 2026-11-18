import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Compass, User, Sparkles, Users, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/db";
import { Avatar } from "./bits";

const nav = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/explorar", label: "Explorar", icon: Compass },
  { to: "/comunidades", label: "Comunidades", icon: Users },
  { to: "/descobrir", label: "Descobrir", icon: Sparkles },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function Logo() {
  return (
    <Link to="/" className="font-display text-xl font-extrabold">
      <span className="text-brand">lore</span>box
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {me && (
              <Link to="/perfil" className="flex items-center gap-2 text-sm">
                <Avatar name={me.display_name} hue={me.avatar_hue} size={28} />
                <span className="hidden sm:inline">@{me.username}</span>
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
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-1 py-2 text-[10px] text-muted-foreground"
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
