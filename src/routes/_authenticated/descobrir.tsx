import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { X, Heart, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster } from "@/components/app/bits";
import { discoverQuery, meQuery, type Match } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/descobrir")({
  head: () => ({
    meta: [
      { title: "Descobrir pessoas — Lorebox" },
      { name: "description", content: "Encontre pessoas com gostos em comum." },
      { property: "og:title", content: "Descobrir pessoas — Lorebox" },
      { property: "og:description", content: "Encontre pessoas com gostos em comum." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Discover,
});

type Goal = "amizade" | "jogar" | "conversar" | "relacionamento";
const goals: { k: Goal; l: string }[] = [
  { k: "amizade", l: "Fazer amizades" },
  { k: "jogar", l: "Companhia para jogar" },
  { k: "conversar", l: "Conversar sobre conteúdos" },
  { k: "relacionamento", l: "Relacionamento (18+)" },
];
const OPT_IN = "lorebox_discover_opt_in";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Concrete, human explanation of why two people match. */
function reason(m: Match, goal: Goal) {
  const games = m.commonTitles.filter((t) => t.kind === "jogo");
  const shows = m.commonTitles.filter((t) => t.kind !== "jogo");
  if (goal === "jogar" && games.length)
    return `Vocês têm ${plural(games.length, "jogo", "jogos")} em comum na biblioteca.`;
  if (goal === "conversar" && shows.length)
    return `Vocês acompanharam ${plural(shows.length, "série ou filme", "séries e filmes")} em comum.`;
  const parts = [];
  if (m.commonFavs.length) parts.push(plural(m.commonFavs.length, "favorito", "favoritos"));
  if (m.commonTitles.length) parts.push(plural(m.commonTitles.length, "título", "títulos"));
  if (m.commonGenres.length) parts.push(plural(m.commonGenres.length, "gênero", "gêneros"));
  return parts.length
    ? `Vocês têm ${parts.join(", ")} em comum.`
    : "Ainda não há títulos em comum — registre mais coisas na sua biblioteca!";
}

function Discover() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const [optIn, setOptIn] = useState(false);
  useEffect(() => {
    try {
      setOptIn(localStorage.getItem(OPT_IN) === "1");
    } catch {
      /* storage unavailable: stays opted out */
    }
  }, []);
  function toggleOptIn(v: boolean) {
    setOptIn(v);
    try {
      localStorage.setItem(OPT_IN, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const [goal, setGoal] = useState<Goal>("amizade");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [match, setMatch] = useState<Match | null>(null);
  const { data: matches, isLoading } = useQuery({ ...discoverQuery(me.id), enabled: optIn });
  const { data: graph } = useQuery({
    queryKey: ["follow-graph", me.id],
    enabled: optIn,
    queryFn: async () => {
      const [out, inc] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", me.id),
        supabase.from("follows").select("follower_id").eq("following_id", me.id),
      ]);
      return {
        following: new Set((out.data ?? []).map((r) => r.following_id)),
        followers: new Set((inc.data ?? []).map((r) => r.follower_id)),
      };
    },
  });

  const queue = useMemo(() => {
    const list = (matches ?? []).filter(
      (m) => !skipped.has(m.profile.id) && !graph?.following.has(m.profile.id),
    );
    if (goal === "jogar")
      return [...list].sort(
        (a, b) =>
          b.commonTitles.filter((t) => t.kind === "jogo").length -
          a.commonTitles.filter((t) => t.kind === "jogo").length,
      );
    if (goal === "conversar")
      return [...list].sort(
        (a, b) =>
          b.commonTitles.filter((t) => t.kind !== "jogo").length -
          a.commonTitles.filter((t) => t.kind !== "jogo").length,
      );
    return list;
  }, [matches, skipped, graph, goal]);
  const current = queue[0];

  const like = useMutation({
    mutationFn: async (m: Match) => {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: me.id, following_id: m.profile.id });
      if (error) throw error;
      return m;
    },
    onSuccess: (m) => {
      if (graph?.followers.has(m.profile.id)) setMatch(m);
      else toast(`Você demonstrou interesse em ${m.profile.display_name}`);
      qc.invalidateQueries({ queryKey: ["follow-graph"] });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-2xl font-bold">Descobrir pessoas</h1>
        <p className="text-center text-sm text-muted-foreground">
          Encontre gente com gostos parecidos com os seus.
        </p>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
          <span>
            <b>Participar da descoberta</b>
            <span className="block text-xs text-muted-foreground">
              Opcional. Sua localização exata nunca é exibida.
            </span>
          </span>
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => toggleOptIn(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-primary)]"
          />
        </label>

        {!optIn ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
            Ative a participação para ver cartões de perfis compatíveis.
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {goals.map((g) => (
                <button
                  key={g.k}
                  onClick={() => setGoal(g.k)}
                  className={`rounded-full px-3 py-1 text-xs ${goal === g.k ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}
                >
                  {g.l}
                </button>
              ))}
            </div>

            {match && (
              <div className="mt-4 rounded-xl border border-primary bg-accent p-3 text-center text-sm">
                É recíproco! Você e <b>{match.profile.display_name}</b> se seguem.{" "}
                <Link
                  to="/u/$username"
                  params={{ username: match.profile.username }}
                  className="ml-1 text-primary underline"
                >
                  Ver perfil e recomendar algo
                </Link>
                <button onClick={() => setMatch(null)} className="ml-2 text-muted-foreground">
                  <X className="inline h-3 w-3" />
                </button>
              </div>
            )}

            {goal === "relacionamento" ? (
              <div className="mt-5 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                <Lock className="mx-auto mb-2 h-6 w-6 text-secondary" />
                Recursos de relacionamento são exclusivos para maiores de 18 anos e exigem
                verificação de idade, que chega numa próxima etapa.
              </div>
            ) : isLoading ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">Procurando pessoas…</p>
            ) : !current ? (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Você já viu todo mundo por enquanto. Volte mais tarde!
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-glow">
                <Link
                  to="/u/$username"
                  params={{ username: current.profile.username }}
                  className="flex items-center gap-3"
                >
                  <Avatar
                    name={current.profile.display_name}
                    hue={current.profile.avatar_hue}
                    size={64}
                  />
                  <div>
                    <p className="text-lg font-bold">{current.profile.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{current.profile.username}</p>
                    {current.profile.bio && (
                      <p className="text-sm text-muted-foreground">{current.profile.bio}</p>
                    )}
                  </div>
                </Link>
                <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-sm">
                  {reason(current, goal)}
                </p>
                {current.commonGenres.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {current.commonGenres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                {(current.commonFavs.length > 0 || current.commonTitles.length > 0) && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(current.commonFavs.length ? current.commonFavs : current.commonTitles)
                      .slice(0, 3)
                      .map((t) => (
                        <Poster key={t.id} t={t} />
                      ))}
                  </div>
                )}
                <div className="mt-5 flex justify-center gap-6">
                  <button
                    onClick={() => setSkipped(new Set(skipped).add(current.profile.id))}
                    aria-label="Passar"
                    className="grid h-14 w-14 place-items-center rounded-full border border-border"
                  >
                    <X />
                  </button>
                  <button
                    onClick={() => like.mutate(current)}
                    disabled={like.isPending}
                    aria-label="Demonstrar interesse"
                    className="grid h-14 w-14 place-items-center rounded-full bg-brand text-primary-foreground disabled:opacity-60"
                  >
                    <Heart />
                  </button>
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Demonstrar interesse = seguir. Quando for recíproco, vocês podem se conectar.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
