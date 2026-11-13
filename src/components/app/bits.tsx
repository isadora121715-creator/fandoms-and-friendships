import { Link } from "@tanstack/react-router";
import { Star, Gamepad2, Tv, Film } from "lucide-react";
import { type Title, kindLabel } from "@/lib/mock";
import { cn } from "@/lib/utils";

const icon = { jogo: Gamepad2, serie: Tv, filme: Film };

// Poster art is generated from each title's hue (data-driven, not a theme color).
export function Poster({ t, className, showName = true }: { t: Title; className?: string; showName?: boolean }) {
  const Icon = icon[t.kind];
  return (
    <Link to="/titulo/$id" params={{ id: t.id }} className={cn("group relative block aspect-[2/3] overflow-hidden rounded-lg border border-border transition hover:-translate-y-1 hover:shadow-glow", className)}
      style={{ background: `radial-gradient(circle at 30% 20%, oklch(0.6 0.18 ${t.hue}), oklch(0.25 0.08 ${t.hue + 40}) 70%)` }}>
      <Icon className="absolute right-2 top-2 h-4 w-4 text-foreground/70" />
      {showName && (
        <div className="absolute inset-x-0 bottom-0 bg-fade p-2 pt-8">
          <p className="font-display text-sm font-bold leading-tight">{t.name}</p>
          <p className="text-[11px] text-muted-foreground">{kindLabel[t.kind]} · {t.year}</p>
        </div>
      )}
    </Link>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)} aria-label={`${i} estrelas`}>
          <Star style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-star text-star" : "text-muted-foreground/40"} />
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-full font-display font-bold ring-2 ring-primary/40"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, oklch(0.6 0.2 ${hue}), oklch(0.45 0.15 ${hue + 60}))` }}>
      {name[0]}
    </div>
  );
}
