import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun, Palette, ImageOff, Search, Check, X, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { titlesQuery, kindPlural, type Kind } from "@/lib/db";
import {
  resizeImage,
  setTheme,
  setWallpaper,
  setWallpaperPhoto,
  setWallpaperStrength,
  useTheme,
  useWallpaper,
  useWallpaperPhoto,
  useWallpaperStrength,
} from "@/lib/prefs";
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

/** Resolves the wallpaper setting to an image URL: catalog cover, web link or uploaded photo. */
function useWallpaperSource(): { src: string | null; fallback: string | null } {
  const value = useWallpaper();
  const photo = useWallpaperPhoto();
  const isTitle = !!value && value !== "photo" && !value.startsWith("url:");
  const cover = useCover(isTitle ? value : "");
  if (!value) return { src: null, fallback: null };
  if (value === "photo") return { src: photo, fallback: null };
  if (value.startsWith("url:")) return { src: value.slice(4), fallback: null };
  return { src: cover ? largeCover(cover) : null, fallback: cover };
}

/** Full-page background. Its visibility follows the "intensidade" slider. */
export function WallpaperLayer() {
  const { src: wanted, fallback } = useWallpaperSource();
  const strength = useWallpaperStrength();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => setSrc(wanted), [wanted]);
  useEffect(() => {
    document.documentElement.classList.toggle("has-wallpaper", !!src);
    return () => document.documentElement.classList.remove("has-wallpaper");
  }, [src]);
  if (!src) return null;
  const s = strength / 100;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setSrc(fallback && src !== fallback ? fallback : null)}
        className="h-full w-full scale-105 object-cover"
        style={{ opacity: 0.2 + 0.8 * s, filter: `blur(${(1 - s) * 4}px)` }}
      />
      {/* keeps text readable in both themes; thinner as the intensity goes up */}
      <div className="absolute inset-0 bg-background" style={{ opacity: 0.88 - 0.66 * s }} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70" />
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

const label = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const pill = (on: boolean) =>
  cn(
    "rounded-full px-3 py-1 text-xs",
    on ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground",
  );

/** Header button: light/dark switch, wallpaper (catalog cover, own photo or link) and its intensity. */
export function AppearanceMenu() {
  const theme = useTheme();
  const wallpaper = useWallpaper();
  const strength = useWallpaperStrength();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"catalogo" | "foto">("catalogo");
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>("serie");
  const panel = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: titles } = useQuery({ ...titlesQuery, enabled: open && source === "catalogo" });

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

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem.");
      return;
    }
    setBusy(true);
    try {
      setWallpaperPhoto(await resizeImage(file));
      toast.success("Foto aplicada como papel de parede");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onLink() {
    const u = link.trim();
    if (!/^https:\/\/\S+$/i.test(u)) {
      toast.error("Cole um link de imagem começando com https://");
      return;
    }
    setWallpaper(`url:${u}`);
    setLink("");
    toast.success("Imagem aplicada como papel de parede");
  }

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
        <div className="fixed inset-x-3 top-16 z-50 max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-9 sm:w-[22rem]">
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

          <p className={cn(label, "mt-3")}>Tema</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["dark", "Escuro", Moon],
                ["light", "Claro", Sun],
              ] as const
            ).map(([k, text, Icon]) => (
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
                {text}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className={label}>Papel de parede</p>
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

          {wallpaper && (
            <label className="mt-3 block">
              <span className="flex justify-between text-xs text-muted-foreground">
                <span>Intensidade</span>
                <span className="font-semibold text-foreground">{strength}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={strength}
                onChange={(e) => setWallpaperStrength(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--color-primary)]"
                aria-label="Intensidade do papel de parede"
              />
              <span className="flex justify-between text-[10px] text-muted-foreground">
                <span>Mais suave</span>
                <span>Mais forte</span>
              </span>
            </label>
          )}

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["catalogo", "Do catálogo"],
                ["foto", "Minha foto"],
              ] as const
            ).map(([k, text]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSource(k)}
                className={cn(
                  "rounded-md py-1.5 text-xs",
                  source === k ? "bg-popover font-semibold shadow" : "text-muted-foreground",
                )}
              >
                {text}
              </button>
            ))}
          </div>

          {source === "catalogo" ? (
            <>
              <div className="mt-3 flex gap-1">
                {(["serie", "filme", "jogo"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={pill(kind === k)}
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
              <div className="mt-3 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
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
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm hover:border-primary disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {busy ? "Aplicando…" : "Enviar foto do seu aparelho"}
              </button>
              <div>
                <p className="text-xs text-muted-foreground">Ou cole o link de uma imagem</p>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onLink()}
                      placeholder="https://…"
                      className="w-full rounded-md border border-input bg-muted py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onLink}
                    className="rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    Usar
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A foto fica salva só neste navegador e não é enviada para ninguém.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
