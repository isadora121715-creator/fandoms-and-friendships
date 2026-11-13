import { Link } from "@tanstack/react-router";
import { Home, Compass, User, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/explorar", label: "Explorar", icon: Compass },
  { to: "/descobrir", label: "Descobrir", icon: Sparkles },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function Logo() {
  return <Link to="/" className="font-display text-xl font-extrabold"><span className="text-brand">lore</span>box</Link>;
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Users className="h-3.5 w-3.5" />Protótipo</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
