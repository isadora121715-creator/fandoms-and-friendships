import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Catalog server functions. Writes go through the service-role client because the
 * `titles` table is read-only for users; every function still requires a signed-in user.
 * Title data is looked up on Wikipedia (pt) — no API key needed.
 */

type Kind = "jogo" | "serie" | "filme";
const kindSchema = z.enum(["jogo", "serie", "filme"]);

const WIKI = "https://pt.wikipedia.org";
const UA = { "User-Agent": "LoreboxCatalog/1.0", "Api-User-Agent": "LoreboxCatalog/1.0" };

const KIND_RE: Record<Kind, RegExp> = {
  jogo: /jogo|\bgame\b|videogame/i,
  serie: /série|seriado|minissérie|programa de televisão|telenovela|websérie|anime/i,
  filme: /\bfilme|longa-metragem|curta-metragem/i,
};
const HINT: Record<Kind, string> = { jogo: "jogo eletrônico", serie: "série", filme: "filme" };

const GENRE_WORDS: [RegExp, string][] = [
  [/terror|horror/i, "Terror"],
  [/comédia|humor/i, "Comédia"],
  [/ficção científica/i, "Ficção científica"],
  [/anima[çc]/i, "Animação"],
  [/\banime\b/i, "Anime"],
  [/fantasia/i, "Fantasia"],
  [/super-?heró/i, "Super-heróis"],
  [/suspense|thriller/i, "Suspense"],
  [/mistério/i, "Mistério"],
  [/romance|romântic/i, "Romance"],
  [/policial|criminal|crime/i, "Crime"],
  [/\bRPG\b|role-playing|interpretação de papéis/i, "RPG"],
  [/tiro em primeira|tiro em terceira|\bshooter\b/i, "Tiro"],
  [/corrida/i, "Corrida"],
  [/esporte|futebol/i, "Esportes"],
  [/estratégia/i, "Estratégia"],
  [/simula/i, "Simulação"],
  [/plataforma/i, "Plataforma"],
  [/sobrevivência/i, "Sobrevivência"],
  [/ação/i, "Ação"],
  [/aventura/i, "Aventura"],
  [/drama|dramátic/i, "Drama"],
  [/documentário/i, "Documentário"],
  [/musical/i, "Musical"],
];

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const cleanName = (wikiTitle: string) => wikiTitle.replace(/\s*\([^)]*\)\s*$/, "").trim();

function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function yearFrom(...texts: (string | undefined)[]) {
  for (const t of texts) {
    const m = t?.match(/\b(19[2-9]\d|20[0-3]\d)\b/);
    if (m) return Number(m[1]);
  }
  return 0;
}

function genresFrom(text: string) {
  return GENRE_WORDS.filter(([re]) => re.test(text))
    .map(([, g]) => g)
    .slice(0, 3);
}

function kindOf(description: string): Kind | null {
  if (KIND_RE.jogo.test(description)) return "jogo";
  if (KIND_RE.serie.test(description)) return "serie";
  if (KIND_RE.filme.test(description)) return "filme";
  return null;
}

export type WebResult = { pageTitle: string; name: string; description: string; kind: Kind };

async function wikiSearch(query: string, limit = 10) {
  const url = new URL(`${WIKI}/w/api.php`);
  Object.entries({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrlimit: String(limit),
    prop: "description|pageprops",
    ppprop: "disambiguation",
    redirects: "1",
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        { title: string; index: number; description?: string; pageprops?: object }
      >;
    };
  };
  return Object.values(json.query?.pages ?? {})
    .filter((p) => !p.pageprops)
    .sort((a, b) => a.index - b.index)
    .map((p) => ({ title: p.title, description: p.description ?? "" }));
}

async function wikiSummary(pageTitle: string) {
  const res = await fetch(
    `${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
    { headers: UA },
  );
  if (!res.ok) return null;
  const s = (await res.json()) as {
    title: string;
    description?: string;
    extract?: string;
    type?: string;
  };
  if (s.type === "disambiguation") return null;
  return { title: s.title, description: s.description ?? "", extract: s.extract ?? "" };
}

const EN_KIND_RE: Record<Kind, RegExp> = {
  jogo: /video game|game\b/i,
  serie:
    /television series|tv series|web series|anime|sitcom|miniseries|drama series|animated series/i,
  filme: /\bfilm\b|movie/i,
};
const EN_HINT: Record<Kind, string> = { jogo: "video game", serie: "TV series", filme: "film" };

async function wikiApi(host: "pt" | "en", params: Record<string, string>) {
  const url = new URL(`https://${host}.wikipedia.org/w/api.php`);
  Object.entries({ format: "json", formatversion: "2", ...params }).forEach(([k, v]) =>
    url.searchParams.set(k, v),
  );
  const res = await fetch(url, { headers: UA });
  const text = await res.text();
  if (!res.ok || !text.startsWith("{")) return null;
  return JSON.parse(text) as {
    query?: {
      pages?: {
        title: string;
        index?: number;
        description?: string;
        pageprops?: object;
        thumbnail?: { source: string };
        langlinks?: { title: string }[];
      }[];
    };
  };
}

async function searchPages(host: "pt" | "en", q: string) {
  const r = await wikiApi(host, {
    action: "query",
    generator: "search",
    gsrsearch: q,
    gsrlimit: "8",
    prop: "description|pageprops",
    ppprop: "disambiguation",
    redirects: "1",
  });
  return (r?.query?.pages ?? [])
    .filter((p) => !p.pageprops)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => ({ title: p.title, description: p.description ?? "" }));
}

async function pageImage(host: "pt" | "en", title: string) {
  const r = await wikiApi(host, {
    action: "query",
    titles: title,
    redirects: "1",
    prop: "pageimages|langlinks",
    pilicense: "any",
    piprop: "thumbnail",
    pithumbsize: "500",
    lllang: "en",
  });
  const p = r?.query?.pages?.[0];
  return {
    thumb: p?.thumbnail?.source.split("?")[0] ?? null,
    en: p?.langlinks?.[0]?.title ?? null,
  };
}

function pickPage(
  pages: { title: string; description: string }[],
  t: { name: string; year: number },
  re: RegExp,
) {
  const norm = slugify(t.name);
  const short = slugify(t.name.split(":")[0]!);
  const m = pages.filter((p) => re.test(p.description));
  const same = (p: { title: string }, n: string) => slugify(cleanName(p.title)) === n;
  const yOk = (p: { description: string }) =>
    !t.year || !yearFrom(p.description) || yearFrom(p.description) === t.year;
  return (
    m.find((p) => same(p, norm) && yOk(p)) ??
    m.find((p) => same(p, norm)) ??
    m.find((p) => same(p, short) && yOk(p)) ??
    m.find((p) => slugify(cleanName(p.title)).startsWith(norm) && yOk(p)) ??
    null
  );
}

/** Poster / box art for a title: the English Wikipedia infobox image, else the Portuguese one. */
const same = (a: string, b: string) => slugify(a) === slugify(b);

/** Vertical poster from TVMaze (series). Only an exact name match counts, preferring the same year. */
async function tvmazePoster(name: string, year: number) {
  const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(name)}`, {
    headers: UA,
  });
  if (!res.ok) return null;
  const list = (await res.json()) as {
    show: { name: string; premiered: string | null; image: { medium: string } | null };
  }[];
  const shows = list.map((r) => r.show).filter((s) => s.image && same(s.name, name));
  const pick =
    (year ? shows.find((s) => Number(s.premiered?.slice(0, 4)) === year) : undefined) ?? shows[0];
  return pick?.image?.medium ?? null;
}

/** Vertical library art from Steam (PC games). Only an exact name match counts. */
async function steamPoster(name: string) {
  const res = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=US&l=english`,
    { headers: UA },
  );
  if (!res.ok) return null;
  const r = (await res.json()) as { items?: { id: number; name: string }[] };
  const item = r.items?.find((i) => same(i.name.replace(/[™®]/g, ""), name));
  if (!item) return null;
  const url = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`;
  const head = await fetch(url, { method: "HEAD", headers: UA });
  return head.ok ? url : null;
}

/** Wikipedia infobox image: English page (via the Portuguese one) first, then the Portuguese one. */
async function wikipediaCover(t: { name: string; kind: Kind; year: number }) {
  const pt = pickPage(await searchPages("pt", `${t.name} ${HINT[t.kind]}`), t, KIND_RE[t.kind]);
  let enTitle: string | null = null;
  if (pt) {
    const pi = await pageImage("pt", pt.title);
    enTitle = pi.en;
    if (pi.en) {
      const ei = await pageImage("en", pi.en);
      if (ei.thumb) return { url: ei.thumb, enTitle };
    }
    if (pi.thumb) return { url: pi.thumb, enTitle };
  }
  const en = pickPage(
    await searchPages("en", `${t.name} ${EN_HINT[t.kind]}`),
    t,
    EN_KIND_RE[t.kind],
  );
  return {
    url: en ? (await pageImage("en", en.title)).thumb : null,
    enTitle: enTitle ?? en?.title ?? null,
  };
}

const attempt = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch {
    return null; // one source failing (rate limit, timeout) must not block the others
  }
};

/**
 * Cover for a title, preferring vertical posters: TVMaze for series, Steam for games,
 * Wikipedia for everything (and as the fallback). Series with a Portuguese name are retried
 * on TVMaze with their English title from Wikipedia.
 */
async function findCover(t: { name: string; kind: Kind; year: number }) {
  if (t.kind === "serie") {
    const p = await attempt(() => tvmazePoster(t.name, t.year));
    if (p) return p;
  }
  if (t.kind === "jogo") {
    const p = await attempt(() => steamPoster(t.name));
    if (p) return p;
  }
  const wiki = await attempt(() => wikipediaCover(t));
  if (t.kind === "serie" && wiki?.enTitle && !same(cleanName(wiki.enTitle), t.name)) {
    const p = await attempt(() => tvmazePoster(cleanName(wiki.enTitle!), t.year));
    if (p) return p;
  }
  return wiki?.url ?? null;
}

/** Looks up the cover image of a title that isn't in the pre-generated image map. */
export const titleCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const t = (
      await context.supabase
        .from("titles")
        .select("name, kind, year")
        .eq("id", data.id)
        .maybeSingle()
    ).data;
    if (!t) return { url: null };
    return { url: await findCover({ name: t.name, kind: t.kind as Kind, year: t.year }) };
  });

const trimSynopsis = (s: string) => (s.length > 700 ? s.slice(0, 697).trimEnd() + "…" : s);

/** Upserts the spreadsheet catalog. Idempotent: existing titles are left untouched. */
export const seedCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SEED_TITLES } = await import("./catalog-data");
    const rows = SEED_TITLES.map((t) => ({ ...t, synopsis: "", hue: hueFor(t.id) }));
    const { error, count } = await supabaseAdmin
      .from("titles")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? 0 };
  });

/** Searches Wikipedia for games, series or films by name. */
export const searchWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ q: z.string().trim().min(2).max(100), kind: kindSchema.optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<WebResult[]> => {
    const query = data.kind ? `${data.q} ${HINT[data.kind]}` : data.q;
    const pages = await wikiSearch(query, 12);
    const qSlug = slugify(data.q);
    const out: WebResult[] = [];
    for (const p of pages) {
      // Pages without a description are kept only when the title is exactly what was searched.
      const exact = !p.description && slugify(cleanName(p.title)) === qSlug;
      const kind = data.kind
        ? KIND_RE[data.kind].test(p.description) || exact
          ? data.kind
          : null
        : kindOf(p.description);
      if (kind)
        out.push({
          pageTitle: p.title,
          name: cleanName(p.title),
          description: p.description,
          kind,
        });
    }
    return out.slice(0, 8);
  });

/** Adds a Wikipedia page to the catalog (or returns the existing title) and returns its id. */
export const importTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ pageTitle: z.string().trim().min(1).max(200), kind: kindSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await wikiSummary(data.pageTitle);
    if (!s) throw new Error("Não encontramos esse título na Wikipédia.");
    const name = cleanName(s.title);

    const existing = await supabaseAdmin
      .from("titles")
      .select("id")
      .eq("kind", data.kind)
      .ilike("name", name)
      .limit(1)
      .maybeSingle();
    if (existing.data) return { id: existing.data.id, cover: null as string | null };

    const year = yearFrom(s.description, s.extract.split(". ")[0]);
    // Look the cover up right away so the new title shows its image as soon as it opens.
    const coverPromise = attempt(() => findCover({ name, kind: data.kind, year }));
    const base = slugify(name) || "titulo";
    const candidates = [
      base,
      `${base}-${data.kind}`,
      `${base}-${year || "x"}`,
      `${base}-${Date.now().toString(36)}`,
    ];
    const taken = await supabaseAdmin.from("titles").select("id").in("id", candidates);
    const id = candidates.find((c) => !(taken.data ?? []).some((t) => t.id === c))!;

    const { error } = await supabaseAdmin.from("titles").insert({
      id,
      kind: data.kind,
      name,
      year,
      genres: genresFrom(`${s.description}. ${s.extract.split(". ")[0]}`),
      synopsis: trimSynopsis(s.extract),
      info: s.description ? s.description[0]!.toUpperCase() + s.description.slice(1) : "",
      hue: hueFor(id),
    });
    if (error) throw new Error(error.message);
    return { id, cover: await coverPromise };
  });

const MISSING = "Sinopse ainda não disponível.";

/** Fills in synopsis (and year/genres when missing) for a catalog title from Wikipedia. */
export const enrichTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = (await supabaseAdmin.from("titles").select("*").eq("id", data.id).maybeSingle()).data;
    if (!t || t.synopsis) return { updated: false };
    const kind = t.kind as Kind;
    const norm = slugify(t.name);
    const pages = await wikiSearch(`${t.name} ${HINT[kind]}`, 10);
    const short = slugify(t.name.split(":")[0]!); // "Whiplash: Em Busca da Perfeição" → "whiplash"
    const same = (p: { title: string }, n: string) => slugify(cleanName(p.title)) === n;
    const yearOk = (p: { description: string }) => !t.year || yearFrom(p.description) === t.year;
    const matches = pages.filter((p) => KIND_RE[kind].test(p.description));
    // Prefer a page with the same name (ignoring "(filme)" etc.) and, for films, the same year.
    const best =
      matches.find((p) => same(p, norm) && yearOk(p)) ??
      matches.find((p) => same(p, norm)) ??
      matches.find((p) => same(p, short) && yearOk(p)) ??
      (t.year
        ? matches.find(
            (p) =>
              yearFrom(p.description) === t.year &&
              slugify(cleanName(p.title)).split("-")[0] === norm.split("-")[0],
          )
        : undefined) ??
      pages.find((p) => !p.description && same(p, norm)) ??
      null;
    const s = best ? await wikiSummary(best.title) : null;
    const patch: { synopsis: string; year?: number; genres?: string[] } = {
      synopsis: s?.extract ? trimSynopsis(s.extract) : MISSING,
    };
    if (s && !t.year) {
      const y = yearFrom(s.description, s.extract.split(". ")[0]);
      if (y) patch.year = y;
    }
    if (s && t.genres.length === 0) patch.genres = genresFrom(`${s.description}. ${s.extract}`);
    await supabaseAdmin.from("titles").update(patch).eq("id", t.id);
    return { updated: true };
  });
