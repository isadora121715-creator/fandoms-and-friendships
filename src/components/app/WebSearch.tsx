import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Globe, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importTitle, searchWeb, type WebResult } from "@/lib/catalog.functions";
import { kindLabel, slugify, type Kind, type Title } from "@/lib/db";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Searches Wikipedia for titles that aren't in the catalog yet; picking one imports it
 * (name, year, genres and synopsis are pulled automatically) and opens its page.
 */
export function WebSearch({ q, kind, catalog }: { q: string; kind?: Kind; catalog: Title[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const dq = useDebounced(q.trim(), 450);
  const { data, isFetching, isError } = useQuery({
    queryKey: ["web-search", kind ?? "all", dq],
    enabled: dq.length >= 2,
    staleTime: 10 * 60_000,
    queryFn: () => searchWeb({ data: kind ? { q: dq, kind } : { q: dq } }),
  });
  const known = new Set(catalog.map((t) => `${t.kind}:${slugify(t.name)}`));
  const results = (data ?? []).filter((r) => !known.has(`${r.kind}:${slugify(r.name)}`));

  const add = useMutation({
    mutationFn: (r: WebResult) => importTitle({ data: { pageTitle: r.pageTitle, kind: r.kind } }),
    onSuccess: ({ id }, r) => {
      qc.invalidateQueries({ queryKey: ["titles"] });
      toast.success(`${r.name} adicionado ao catálogo`);
      navigate({ to: "/titulo/$id", params: { id } });
    },
    onError: (e) => toast.error(e.message),
  });

  if (dq.length < 2) return null;
  return (
    <section className="mt-8 rounded-xl border border-border bg-card/60 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Globe className="h-4 w-4 text-secondary" />
        Não achou? Buscar “{dq}” na web
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </h2>
      {isError && (
        <p className="mt-2 text-sm text-muted-foreground">
          A busca na web não está disponível agora. Tente de novo em instantes.
        </p>
      )}
      {!isFetching && data && results.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum resultado novo — o que encontramos já está no catálogo.
        </p>
      )}
      <ul className="mt-3 divide-y divide-border">
        {results.map((r) => (
          <li key={r.pageTitle} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {kindLabel[r.kind]}
                {r.description ? ` · ${r.description}` : ""}
              </p>
            </div>
            <button
              onClick={() => add.mutate(r)}
              disabled={add.isPending}
              className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
            >
              {add.isPending && add.variables?.pageTitle === r.pageTitle ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Adicionar
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">Informações da Wikipédia.</p>
    </section>
  );
}
