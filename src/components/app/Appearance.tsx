import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun, Palette, ImageOff, Search, Check, X } from "lucide-react";
import { titlesQuery, kindPlural, type Kind } from "@/lib/db";
import { setTheme, setWallpaper, useTheme, useWallpaper } from "@/lib/prefs";
import { TITLE_IMAGES } from "@/lib/catalog-images";
import { cn } from "@/lib/utils";
import { useCover } from "./useCover";

/** Bigger version of a cover URL for full-screen use (falls back to the card size on error). */
function largeCover(url: string) {
  if (url.includes("static.tvmaze.com"))
    return url.replace("/medium_portrait/", "/original_untouched/");
  if (url.includes("steamstatic.com") && url.endsWith("library_600x900.jpg"))
    return url.replace("library_600x900.jpg", "library_600x900_2x.jpg");
  if (url.includes("/thumb/") && /\/500px-/.test(url)) return url.replace("/500px-", "/1280px-");
  return url;
}

/** Full-page background made from the chosen title's cover. */
export function WallpaperLayer() {
  const id = useWallpaper();
  const url = useCover(id ?? "");
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => setSrc(id && url ? largeCover(url) : null), [id, url]);
  useEffect(() => {
    document.documentElement.classList.toggle("has-wallpaper", !!src);
    return () => document.documentElement.classList.remove("has-wallpaper");
  }, [src]);
  if (!src || !url) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setSrc(src === url ? null : url)}
        className="h-full w-full scale-105 object-cover opacity-60 blur-[3px]"
      />
      {/* keeps text readable in both themes */}
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/80" />
    </div>
  );
}

function Thumb({
  id,
  name,
  active,
  onPick,
}: {
  id: string;
  name: string;
  active: boolean;
  onPick: () => void;
}) {
  const url = useCover(id);
  return (
    <button
      type="button"
      onClick={onPick}
      title={name}
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-md border-2 bg-muted",
        active ? "border-primary" : "border-transparent hover:border-border",
      )}
    >
      {url && (
        <img
          src={url}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      )}
      {active && (
        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

/** Header button: light/dark switch and wallpaper picker. */
export function AppearanceMenu() {
  const theme = useTheme();
  const wallpaper = useWallpaper();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("serie");
  const panel = useRef<HTMLDivElement>(null);
  const { data: titles } = useQuery({ ...titlesQuery, enabled: open });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (titles ?? [])
      .filter((t) => t.kind === kind && TITLE_IMAGES[t.id] !== null)
      .filter((t) => !ql || t.name.toLowerCase().includes(ql))
      .slice(0, 48);
  }, [titles, kind, q]);

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Aparência"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground"
      >
        <Palette className="h-5 w-5 md:h-4 md:w-4" />
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-9 sm:w-[22rem]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Aparência</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tema
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["dark", "Escuro", Moon],
                ["light", "Claro", Sun],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTheme(k)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2 text-sm",
                  theme === k
                    ? "border-primary bg-accent font-semibold"
                    : "border-border text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Papel de parede
            </p>
            {wallpaper && (
              <button
                type="button"
                onClick={() => setWallpaper(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <ImageOff className="h-3 w-3" />
                Remover
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-1">
            {(["serie", "filme", "jogo"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  kind === k
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {kindPlural[k]}
              </button>
            ))}
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar título"
              className="w-full rounded-md border border-input bg-muted py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="mt-3 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {list.map((t) => (
              <Thumb
                key={t.id}
                id={t.id}
                name={t.name}
                active={wallpaper === t.id}
                onPick={() => setWallpaper(t.id)}
              />
            ))}
          </div>
          {titles && list.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Nenhum título encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
