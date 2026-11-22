import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Loader2, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCast, useEpisodes, useShowId, type Episode } from "@/lib/tvmaze";

type Progress = { season: number | null; episode: number | null };

const watched = (e: Episode, p: Progress) =>
  !!p.season &&
  !!p.episode &&
  (e.season < p.season || (e.season === p.season && (e.number ?? 0) <= p.episode));

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * "Episódios" tab: pick a season, see every episode and tick off how far you got.
 * Progress is the season/episode already stored in the library entry.
 */
export function SeriesEpisodes({
  titleId,
  progress,
  onProgress,
  saving,
}: {
  titleId: string;
  progress: Progress;
  onProgress: (season: number, episode: number | null) => void;
  saving: boolean;
}) {
  const show = useShowId(titleId);
  const { data: episodes, isLoading, isError } = useEpisodes(show.data);
  const seasons = useMemo(
    () => [...new Set((episodes ?? []).map((e) => e.season))].sort((a, b) => a - b),
    [episodes],
  );
  const [season, setSeason] = useState<number | null>(null);
  useEffect(() => {
    if (season === null && seasons.length) setSeason(progress.season ?? seasons[0]!);
  }, [seasons, season, progress.season]);

  if (show.isLoading || (show.data && isLoading))
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando episódios…
      </p>
    );
  if (!show.data || isError || !episodes?.length)
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Não encontramos a lista de episódios desta série. Você ainda pode marcar temporada e
        episódio na sua biblioteca, no topo da página.
      </p>
    );

  const total = episodes.length;
  const done = episodes.filter((e) => watched(e, progress)).length;
  const list = episodes.filter((e) => e.season === season);
  const seasonDone = list.length > 0 && list.every((e) => watched(e, progress));

  function toggle(e: Episode) {
    if (watched(e, progress) && progress.season === e.season && progress.episode === e.number) {
      // unticking the last watched episode steps back one
      const i = episodes!.findIndex((x) => x.id === e.id);
      const prev = episodes![i - 1];
      onProgress(prev?.season ?? e.season, prev ? prev.number : null);
    } else onProgress(e.season, e.number);
  }

  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {progress.season && progress.episode
              ? `Você está em T${progress.season} · E${progress.episode}`
              : "Você ainda não começou"}
          </span>
          <span className="text-muted-foreground">
            {done} de {total} episódios
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {seasons.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeason(s)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm",
              season === s
                ? "bg-primary font-semibold text-primary-foreground"
                : "border border-border text-muted-foreground",
            )}
          >
            Temporada {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} episódios</p>
        {!seasonDone && list.length > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onProgress(season!, list[list.length - 1]!.number)}
            className="flex items-center gap-1 text-xs font-semibold text-primary disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar temporada inteira
          </button>
        )}
      </div>

      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {list.map((e) => {
          const on = watched(e, progress);
          return (
            <li key={e.id} className="flex items-center gap-3 p-3">
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {e.image ? (
                  <img
                    src={e.image.medium}
                    alt=""
                    loading="lazy"
                    className={cn("h-full w-full object-cover", on && "opacity-60")}
                  />
                ) : (
                  <Tv className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-semibold", on && "text-muted-foreground")}>
                  <span className="text-primary">E{e.number}</span> · {e.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.airdate)}
                  {e.runtime ? ` · ${e.runtime} min` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => toggle(e)}
                aria-label={
                  on
                    ? `Desmarcar episódio ${e.number}`
                    : `Marcar episódio ${e.number} como assistido`
                }
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary",
                )}
              >
                <Check className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">Episódios: TVMaze.</p>
    </div>
  );
}

/** Main characters of a series, with their pictures (TVMaze). */
export function SeriesCharacters({ titleId }: { titleId: string }) {
  const show = useShowId(titleId);
  const { data: cast } = useCast(show.data);
  const people = (cast ?? []).filter((c) => c.character.image || c.person.image).slice(0, 12);
  if (!people.length) return null;
  return (
    <section className="mt-8">
      <h3 className="font-bold">Personagens</h3>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {people.map((c) => (
          <div key={`${c.character.id}-${c.person.id}`} className="text-center">
            <div className="mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border bg-muted">
              <img
                src={(c.character.image ?? c.person.image)!.medium}
                alt={c.character.name}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <p className="mt-1.5 truncate text-xs font-semibold" title={c.character.name}>
              {c.character.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground" title={c.person.name}>
              {c.person.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
