import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster } from "@/components/app/bits";
import { PostCard } from "@/components/app/PostCard";
import { Composer } from "@/components/app/Composer";
import { toast } from "sonner";
import {
  feedQuery,
  GENRES,
  libraryQuery,
  meQuery,
  recommendFor,
  recsQuery,
  suggestionsQuery,
  titlesQuery,
  type Profile,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Lorebox" },
      { name: "description", content: "Resenhas e atualizações de quem você segue." },
      { property: "og:title", content: "Feed — Lorebox" },
      { property: "og:description", content: "Resenhas e atualizações de quem você segue." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Feed,
});

function Feed() {
  const { data: me } = useSuspenseQuery(meQuery);
  const [scope, setScope] = useState<"seguindo" | "todos">("todos");
  const { data: posts, isLoading } = useQuery(feedQuery(scope, me.id));
  const { data: sugg } = useQuery(suggestionsQuery(me.id));
  const { data: titles } = useQuery(titlesQuery);
  const { data: lib } = useQuery(libraryQuery(me.id));
  const { data: recs } = useQuery(recsQuery(me.id));
  const forYou = titles && lib ? recommendFor(titles, lib, me.genres).slice(0, 3) : [];
  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {me.genres.length === 0 && <Welcome me={me} libCount={lib?.length ?? 0} />}
          <Composer me={me} />
          <div className="flex gap-2">
            {(["todos", "seguindo"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize ${scope === s ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}
              >
                {s === "todos" ? "Todos" : "Seguindo"}
              </button>
            ))}
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {posts?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nada por aqui ainda. Publique algo ou{" "}
              <Link to="/explorar" className="text-primary">
                avalie um título
              </Link>
              .
            </div>
          )}
          {posts?.map((p) => (
            <PostCard key={p.id} p={p} meId={me.id} />
          ))}
        </div>
        <aside className="space-y-4">
          {recs && recs.length > 0 && (
            <div className="rounded-xl border border-primary/40 bg-accent p-4 text-sm">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Send className="h-4 w-4 text-primary" />
                Recomendados para você
              </h3>
              {recs.map((r) => (
                <Link
                  key={r.id}
                  to="/titulo/$id"
                  params={{ id: r.titles.id }}
                  className="mt-2 block rounded-lg bg-card/60 p-2"
                >
                  <b>{r.from.display_name}</b> recomendou{" "}
                  <span className="text-primary">{r.titles.name}</span>
                  {r.message && <p className="text-muted-foreground">“{r.message}”</p>}
                </Link>
              ))}
            </div>
          )}
          {sugg && sugg.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-bold">Quem seguir</h3>
              {sugg.map((u) => (
                <FollowRow key={u.id} u={u} meId={me.id} />
              ))}
            </div>
          )}
          {forYou.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-bold">Para você</h3>
              <p className="text-xs text-muted-foreground">
                Com base nos seus gêneros e avaliações
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {forYou.map((t) => (
                  <Poster key={t.id} t={t} showName={false} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function FollowRow({ u, meId }: { u: Profile; meId: string }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      await supabase.from("follows").insert({ follower_id: meId, following_id: u.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  return (
    <div className="mt-3 flex items-center gap-3">
      <Link
        to="/u/$username"
        params={{ username: u.username }}
        className="flex flex-1 items-center gap-3"
      >
        <Avatar name={u.display_name} hue={u.avatar_hue} size={32} />
        <div className="text-sm">
          <b>{u.display_name}</b>
          <p className="text-xs text-muted-foreground">@{u.username}</p>
        </div>
      </Link>
      <button
        onClick={() => m.mutate()}
        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
      >
        Seguir
      </button>
    </div>
  );
}

/** First-run journey: pick favorite genres, then log a few titles. */
function Welcome({ me, libCount }: { me: Profile; libCount: number }) {
  const qc = useQueryClient();
  const [genres, setGenres] = useState<string[]>([]);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ genres }).eq("id", me.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Gêneros salvos! Agora marque alguns títulos.");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="rounded-xl border border-primary/50 bg-accent p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Boas-vindas</p>
      <h2 className="mt-1 text-lg font-bold">Olá, {me.display_name}! Do que você gosta?</h2>
      <p className="text-sm text-muted-foreground">
        Escolha seus gêneros favoritos para recebermos boas recomendações e pessoas para seguir.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() =>
              setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])
            }
            className={`rounded-full px-3 py-1 text-xs ${genres.includes(g) ? "bg-brand text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => m.mutate()}
          disabled={genres.length === 0 || m.isPending}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Salvar gêneros
        </button>
        <Link to="/explorar" className="text-sm text-primary">
          {libCount < 5
            ? `Marcar títulos que já viu ou jogou (${libCount}/5)`
            : "Explorar catálogo"}
        </Link>
      </div>
    </div>
  );
}
