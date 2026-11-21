import { useQuery } from "@tanstack/react-query";
import { TITLE_IMAGES } from "@/lib/catalog-images";
import { titleCover } from "@/lib/catalog.functions";

const LS_KEY = "lorebox_covers";

function readCache(): Record<string, string | null> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, string | null>;
  } catch {
    return {};
  }
}

function writeCache(id: string, url: string | null) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...readCache(), [id]: url }));
  } catch {
    /* storage unavailable: the lookup just runs again next session */
  }
}

/**
 * Cover image URL for a title. Catalog titles come from the pre-generated map; titles added
 * later through web search are looked up once on Wikipedia and remembered in this browser.
 */
export function useCover(id: string): string | null {
  const known = id in TITLE_IMAGES;
  const { data } = useQuery({
    queryKey: ["cover", id],
    enabled: !known,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async () => {
      const cached = readCache();
      if (id in cached) return cached[id] ?? null;
      const { url } = await titleCover({ data: { id } });
      writeCache(id, url);
      return url;
    },
  });
  return known ? (TITLE_IMAGES[id] ?? null) : (data ?? null);
}
