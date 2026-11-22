import { useQuery } from "@tanstack/react-query";
import { titleShow } from "./catalog.functions";

/** Seasons, episodes and characters of a series come from TVMaze (public API, CORS-enabled). */
export type Episode = {
  id: number;
  season: number;
  number: number | null;
  name: string;
  airdate: string;
  runtime: number | null;
  image: { medium: string } | null;
};
export type CastMember = {
  person: { id: number; name: string; image: { medium: string } | null };
  character: { id: number; name: string; image: { medium: string } | null };
};

const LS_KEY = "lorebox_tvmaze_show";

function cached(id: string): number | null | undefined {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, number | null>;
    return all[id];
  } catch {
    return undefined;
  }
}
function remember(id: string, showId: number) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, number | null>;
    localStorage.setItem(LS_KEY, JSON.stringify({ ...all, [id]: showId }));
  } catch {
    /* storage unavailable: looked up again next time */
  }
}

/** TVMaze id for one of our series (null when it can't be matched). */
export function useShowId(titleId: string, enabled = true) {
  return useQuery({
    queryKey: ["tvmaze-show", titleId],
    enabled,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const hit = cached(titleId);
      if (typeof hit === "number") return hit;
      const { showId } = await titleShow({ data: { id: titleId } });
      if (showId) remember(titleId, showId);
      return showId;
    },
  });
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.tvmaze.com${path}`);
  if (!res.ok) throw new Error("Não foi possível carregar os episódios agora.");
  return (await res.json()) as T;
}

export function useEpisodes(showId: number | null | undefined) {
  return useQuery({
    queryKey: ["tvmaze-episodes", showId],
    enabled: !!showId,
    staleTime: 60 * 60_000,
    queryFn: async () =>
      (await get<Episode[]>(`/shows/${showId}/episodes`)).filter((e) => e.number != null),
  });
}

export function useCast(showId: number | null | undefined) {
  return useQuery({
    queryKey: ["tvmaze-cast", showId],
    enabled: !!showId,
    staleTime: 60 * 60_000,
    queryFn: () => get<CastMember[]>(`/shows/${showId}/cast`),
  });
}
