import { Link } from "@tanstack/react-router";
import { Star, Gamepad2, Tv, Film } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Title, type Kind, kindLabel } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useCover } from "./useCover";

const icon: Record<Kind, typeof Film> = { jogo: Gamepad2, serie: Tv, filme: Film };

/**
 * Deterministic cover art, generated per title from its id/kind/hue — never a real
 * poster or box-art image. Real cover art for these titles is copyrighted, so instead
 * each title gets a unique, original abstract illustration: layered shapes whose style
 * (rings, stripes, grid, triangles) is picked from a hash of the id, tinted with the
 * title's hue, with the kind's icon as a large watermark. Same id always renders the
 * same way, so a title's "cover" stays stable across the app.
 */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function CoverArt({ id, kind, hue }: { id: string; kind: Kind; hue: number }) {
  const seed = hashSeed(id);
  const variant = seed % 4;
  const Icon = icon[kind];
  const c1 = `oklch(0.62 0.19 ${hue})`;
  const c2 = `oklch(0.3 0.1 ${(hue + 50) % 360})`;
  const c3 = `oklch(0.78 0.14 ${(hue + 190) % 360})`;
  return (
    <svg
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id={`bg-${id}`} cx="35%" cy="25%" r="85%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>
      <rect width="200" height="300" fill={`url(#bg-${id})`} />
      {variant === 0 && (
        <g opacity={0.35} stroke={c3} strokeWidth={2} fill="none">
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={40 + ((seed + i * 37) % 120)}
              cy={60 + ((seed + i * 53) % 180)}
              r={18 + i * 14}
            />
          ))}
        </g>
      )}
      {variant === 1 && (
        <g opacity={0.3} stroke={c3} strokeWidth={6}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={-20}
              y1={i * 55 + (seed % 40)}
              x2={220}
              y2={i * 55 - 60 + (seed % 40)}
            />
          ))}
        </g>
      )}
      {variant === 2 && (
        <g opacity={0.3} fill={c3}>
          {Array.from({ length: 24 }, (_, i) => i).map((i) => {
            const col = i % 6,
              row = Math.floor(i / 6);
            const on = (seed >> i) & 1;
            return on ? (
              <rect key={i} x={10 + col * 32} y={20 + row * 32} width={18} height={18} rx={3} />
            ) : null;
          })}
        </g>
      )}
      {variant === 3 && (
        <g opacity={0.3} fill={c3}>
          {[0, 1, 2].map((i) => {
            const x = 30 + ((seed + i * 61) % 140);
            const y = 40 + ((seed + i * 83) % 220);
            const s = 24 + i * 10;
            return <polygon key={i} points={`${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}`} />;
          })}
        </g>
      )}
      <Icon
        x={200 / 2 - 44}
        y={300 / 2 - 44}
        width={88}
        height={88}
        color="white"
        opacity={0.16}
        strokeWidth={1.5}
      />
    </svg>
  );
}

/** Real cover image (from Wikipedia) over the generated art, which stays as the fallback. */
export function CoverImage({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  const url = useCover(id);
  // Remount per URL so the failed/wide state never carries over to another image.
  return url ? <CoverImg key={url} url={url} alt={alt} className={className} /> : null;
}

function CoverImg({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  // Some series only have a logo / title card (not a vertical poster): show it whole, uncropped.
  const [wide, setWide] = useState(false);
  const measure = (img: HTMLImageElement) =>
    img.naturalWidth > 0 && setWide(img.naturalWidth > img.naturalHeight * 0.95);
  // A cached image can finish loading before hydration, when onLoad has no listener yet.
  useEffect(() => {
    if (ref.current?.complete) measure(ref.current);
  }, []);
  if (failed) return null;
  return (
    <img
      ref={ref}
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={(e) => measure(e.currentTarget)}
      className={cn(
        "absolute inset-0 h-full w-full",
        wide ? "object-contain p-3 drop-shadow-lg" : "object-cover",
        className,
      )}
    />
  );
}

export function Poster({
  t,
  className,
  showName = true,
}: {
  t: Pick<Title, "id" | "kind" | "name" | "year" | "hue">;
  className?: string;
  showName?: boolean;
}) {
  const Icon = icon[t.kind as Kind];
  return (
    <Link
      to="/titulo/$id"
      params={{ id: t.id }}
      className={cn(
        "group relative block aspect-[2/3] overflow-hidden rounded-lg border border-border transition hover:-translate-y-1 hover:shadow-glow",
        className,
      )}
    >
      <CoverArt id={t.id} kind={t.kind as Kind} hue={t.hue} />
      <CoverImage id={t.id} alt={`Capa de ${t.name}`} />
      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/70 backdrop-blur">
        <Icon className="h-3.5 w-3.5 text-foreground/80" />
      </span>
      {showName && (
        <div className="absolute inset-x-0 bottom-0 bg-fade p-2 pt-8">
          <p className="font-display text-sm font-bold leading-tight">{t.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {kindLabel[t.kind as Kind]}
            {t.year > 0 ? ` · ${t.year}` : ""}
          </p>
        </div>
      )}
    </Link>
  );
}

export function Stars({
  value,
  size = 14,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          aria-label={`${i} estrelas`}
        >
          <Star
            style={{ width: size, height: size }}
            className={i <= Math.round(value) ? "fill-star text-star" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-display font-bold ring-2 ring-primary/40"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, oklch(0.6 0.2 ${hue}), oklch(0.45 0.15 ${hue + 60}))`,
      }}
    >
      {name[0]}
    </div>
  );
}
