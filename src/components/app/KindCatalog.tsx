import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Gamepad2, Tv, Film } from "lucide-react";
import { titlesQuery, kindPlural, type Kind } from "@/lib/db";
import { Shell } from "./Shell";
import { Poster } from "./bits";
import { WebSearch } from "./WebSearch";

const ICON = { jogo: Gamepad2, serie: Tv, filme: Film } as const;
const INTRO: Record<Kind, string> = {
  jogo: "Registre o que você joga, em qual plataforma, e descubra o próximo.",
  serie: "Acompanhe temporadas e episódios e encontre a próxima maratona.",
  filme: "Avalie o que assistiu e monte sua fila de filmes.",
};
const PLACEHOLDER: Record<Kind, string> = {
  jogo: "Busque um jogo pelo nome ou gênero",
  serie: "Busque uma série pelo nome ou gênero",
  filme: "Busque um filme pelo nome ou gênero",
};

/** Catalog page for a single kind (Jogos / Séries / Filmes) with filters and web search. */
export function KindCatalog({ kind }: { kind: Kind }) {
  const { data: titles, isLoading } = useQuery(titlesQuery);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [extra, setExtra] = useState<string | null>(null);
  const Icon = ICON[kind];

  const ofKind = useMemo(() => (titles ?? []).filter((t) => t.kind === kind), [titles, kind]);
  const genres = useMemo(() => {
    const count = new Map<string, number>();
    ofKind.forEach((t) => t.genres.forEach((g) => count.set(g, (count.get(g) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [ofKind]);
  // Second filter row: platform for games, streaming service for series, Brazilian cinema for films.
  const extras = useMemo(() => {
    if (kind === "filme")
      return ofKind.some((t) => t.info === "Filme brasileiro") ? ["Filme brasileiro"] : [];
    const prefix = kind === "jogo" ? "Plataforma de referência: " : "Onde assistir: ";
    return [
      ...new Set(
        ofKind.filter((t) => t.info.startsWith(prefix)).map((t) => t.info.slice(prefix.length)),
      ),
    ].sort();
  }, [ofKind, kind]);

  const ql = q.trim().toLowerCase();
  const res = ofKind.filter(
    (t) =>
      (!genre || t.genres.includes(genre)) &&
      (!extra || t.info.endsWith(extra)) &&
      (!ql ||
        t.name.toLowerCase().includes(ql) ||
        t.genres.some((g) => g.toLowerCase().includes(ql))),
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-xs ${active ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`;

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{kindPlural[kind]}</h1>
          <p className="text-sm text-muted-foreground">{INTRO[kind]}</p>
        </div>
        <span className="ml-auto hidden text-sm text-muted-foreground sm:block">
          {ofKind.length} no catálogo
        </span>
      </div>

      <div className="relative mt-5">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={PLACEHOLDER[kind]}
          className="w-full rounded-xl border border-input bg-card py-3.5 pl-12 pr-4 outline-none focus:border-primary"
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setGenre(null)} className={chip(!genre)}>
          Todos
        </button>
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(genre === g ? null : g)}
            className={chip(genre === g)}
          >
            {g}
          </button>
        ))}
      </div>
      {extras.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {extras.map((x) => (
            <button
              key={x}
              onClick={() => setExtra(extra === x ? null : x)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${extra === x ? "bg-secondary font-semibold text-secondary-foreground" : "border border-dashed border-border text-muted-foreground"}`}
            >
              {x}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {res.map((t) => (
          <Poster key={t.id} t={t} />
        ))}
      </div>
      {titles && res.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          Nada encontrado{q ? ` para “${q}”` : ""} com esses filtros.
        </p>
      )}
      {titles && <WebSearch q={q} kind={kind} catalog={titles} />}
    </Shell>
  );
}
