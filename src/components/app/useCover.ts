import { useQuery, type QueryClient } from "@tanstack/react-query";
import { TITLE_IMAGES } from "@/lib/catalog-images";
import { titleCover } from "@/lib/catalog.functions";

const LS_KEY = "lorebox_covers_v2";
/** A lookup that found nothing is retried after this long (sources get new images over time). */
const MISS_TTL = 24 * 60 * 60 * 1000;

type Entry = { url: string | null; at: number };

function readCache(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, Entry>;
  } catch {
    return {};
  }
}

function writeCache(id: string, url: string | null) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...readCache(), [id]: { url, at: Date.now() } }));
  } catch {
    /* storage unavailable: the lookup just runs again next session */
  }
}

/** Called right after a title is imported, so its cover shows without a second lookup. */
export function rememberCover(qc: QueryClient, id: string, url: string | null) {
  if (!url) return;
  writeCache(id, url);
  qc.setQueryData(["cover", id], url);
}

/**
 * Cover image URL for a title. Catalog titles come from the pre-generated map; titles added
 * later through web search are looked up on the server and remembered in this browser.
 * A failed lookup is not remembered, and a "no image" answer is retried after a day.
 */
export function useCover(id: string): string | null {
  const known = id in TITLE_IMAGES;
  const { data } = useQuery({
    queryKey: ["cover", id],
    enabled: !!id && !known,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const hit = readCache()[id];
      if (hit && (hit.url || Date.now() - hit.at < MISS_TTL)) return hit.url;
      const { url } = await titleCover({ data: { id } }); // throws → not cached, retried later
      writeCache(id, url);
      return url;
    },
  });
  return known ? (TITLE_IMAGES[id] ?? null) : (data ?? null);
}
