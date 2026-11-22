import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, Send, Trash2, Wallpaper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/app/Shell";
import { Avatar, CoverImage, Poster, Stars } from "@/components/app/bits";
import { PostCard } from "@/components/app/PostCard";
import { SeriesCharacters, SeriesEpisodes } from "@/components/app/Series";
import { enrichTitle } from "@/lib/catalog.functions";
import { setWallpaper, useWallpaper } from "@/lib/prefs";
import {
  followingQuery,
  kindLabel,
  meQuery,
  myEntryQuery,
  statuses,
  titlePostsQuery,
  titleQuery,
  type Kind,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/titulo/$id")({
  head: () => ({
    meta: [
      { title: "Título — Lorebox" },
      { name: "description", content: "Sinopse, avaliações e publicações da comunidade." },
      { property: "og:title", content: "Título — Lorebox" },
      { property: "og:description", content: "Sinopse, avaliações e publicações da comunidade." },
    ],
  }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(titleQuery(params.id)),
    ]);
  },
  component: TitlePage,
});

type Tab = "sobre" | "episodios" | "resenha" | "comunidade";

function TitlePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: info } = useSuspenseQuery(titleQuery(id));
  const { data: entry } = useQuery(myEntryQuery(me.id, id));
  const { data: posts } = useQuery(titlePostsQuery(id));
  const t = info.title;
  const [review, setReview] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [rec, setRec] = useState(false);
  const wallpaper = useWallpaper();
  const [tab, setTab] = useState<Tab>("sobre");

  // Titles imported from the spreadsheets start without a synopsis: fetch it automatically.
  const needsInfo = !!t && !t.synopsis;
  useEffect(() => {
    if (!needsInfo) return;
    enrichTitle({ data: { id } })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["title", id] });
        qc.invalidateQueries({ queryKey: ["titles"] });
      })
      .catch(() => {
        /* keeps the placeholder; will retry on the next visit */
      });
  }, [needsInfo, id, qc]);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("library_entries").upsert(
        {
          user_id: me.id,
          title_id: id,
          ...entry,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,title_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["title", id] });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => {
      await supabase.from("library_entries").delete().eq("user_id", me.id).eq("title_id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["title", id] });
      toast("Removido da biblioteca");
    },
  });
  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").insert({
        user_id: me.id,
        title_id: id,
        body: review.trim(),
        rating: entry?.rating ?? null,
        spoiler,
        is_review: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReview("");
      setSpoiler(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Resenha publicada");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!t)
    return (
      <Shell>
        <p className="py-20 text-center text-muted-foreground">
          Título não encontrado.{" "}
          <Link to="/explorar" className="text-primary">
            Voltar ao catálogo
          </Link>
        </p>
      </Shell>
    );
  const kind = t.kind as Kind;
  const tabs: { k: Tab; l: string }[] = [
    { k: "sobre", l: "Sobre" },
    ...(kind === "serie" ? [{ k: "episodios" as const, l: "Episódios" }] : []),
    { k: "resenha", l: "Sua resenha" },
    { k: "comunidade", l: `Comunidade${posts?.length ? ` (${posts.length})` : ""}` },
  ];
  const details: [string, string][] = [
    ["Tipo", kindLabel[kind]],
    ...(t.year > 0 ? [["Ano", String(t.year)] as [string, string]] : []),
    ...(t.genres.length ? [["Gêneros", t.genres.join(", ")] as [string, string]] : []),
    ...(t.info ? [["Informações", t.info] as [string, string]] : []),
  ];

  return (
    <Shell>
      <div
        className="relative -mx-4 -mt-6 h-48 overflow-hidden md:h-64"
        style={{
          background: `radial-gradient(circle at 70% 30%, oklch(0.5 0.18 ${t.hue}), transparent 70%)`,
        }}
      >
        <CoverImage id={t.id} alt="" className="scale-110 opacity-40 blur-2xl" />
        <div className="absolute inset-0 bg-fade" />
      </div>

      {/* Header: poster, name, key facts and the library card */}
      <div className="relative -mt-32 grid gap-6 md:grid-cols-[180px_1fr]">
        <Poster t={t} showName={false} className="w-32 md:w-full" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {kindLabel[kind]}
            {t.year > 0 ? ` · ${t.year}` : ""}
          </p>
          <h1 className="text-3xl font-extrabold md:text-5xl">{t.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {info.avg != null ? (
              <span className="flex items-center gap-2">
                <Stars value={info.avg} />
                <b>{info.avg.toFixed(1)}</b>
                <span className="text-muted-foreground">
                  {info.count} {info.count === 1 ? "avaliação" : "avaliações"}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Ainda sem notas</span>
            )}
            {t.genres.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {g}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Na sua biblioteca
              </p>
              {entry && (
                <button
                  onClick={() => remove.mutate()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {statuses[kind].map((s) => (
                <button
                  key={s}
                  onClick={() => save.mutate({ status: s })}
                  className={`rounded-full px-3 py-1 text-sm ${entry?.status === s ? "bg-primary font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-4">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                Sua nota
                <Stars
                  value={Number(entry?.rating ?? 0)}
                  size={20}
                  onChange={(v) => save.mutate({ rating: v })}
                />
              </span>
              {kind === "jogo" && (
                <select
                  value={entry?.platform ?? ""}
                  onChange={(e) => save.mutate({ platform: e.target.value || null })}
                  className="rounded-md border border-input bg-muted px-2 py-1 text-sm"
                >
                  <option value="">Plataforma</option>
                  {["PC", "PS5", "PS4", "Xbox", "Switch", "Mobile"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              )}
              {kind === "serie" && (
                <button
                  onClick={() => setTab("episodios")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {entry?.season && entry?.episode
                    ? `T${entry.season} · E${entry.episode}`
                    : "Escolher episódio"}{" "}
                  <span className="text-primary">›</span>
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <button
                onClick={() => save.mutate({ favorite: !entry?.favorite })}
                className={`flex items-center gap-1 ${entry?.favorite ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Heart className={`h-4 w-4 ${entry?.favorite ? "fill-primary" : ""}`} />
                Favorito
              </button>
              <button
                onClick={() => setRec(!rec)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Send className="h-4 w-4" />
                Recomendar
              </button>
              <button
                onClick={() => {
                  const on = wallpaper === id;
                  setWallpaper(on ? null : id);
                  toast(on ? "Papel de parede removido" : `${t.name} agora é seu papel de parede`);
                }}
                className={`flex items-center gap-1 ${wallpaper === id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Wallpaper className="h-4 w-4" />
                {wallpaper === id ? "Remover papel de parede" : "Papel de parede"}
              </button>
            </div>
            {rec && <Recommend meId={me.id} titleId={id} onDone={() => setRec(false)} />}
          </div>
        </div>
      </div>

      {/* Tabs keep each kind of information in its own place */}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((x) => (
          <button
            key={x.k}
            onClick={() => setTab(x.k)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm ${tab === x.k ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {x.l}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl">
        {tab === "sobre" && (
          <>
            <h2 className="font-bold">Sinopse</h2>
            <p className="mt-2 leading-relaxed">
              {t.synopsis || (
                <span className="text-muted-foreground">Buscando sinopse na Wikipédia…</span>
              )}
            </p>
            <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
            {kind === "serie" && <SeriesCharacters titleId={id} />}
          </>
        )}

        {tab === "episodios" && kind === "serie" && (
          <SeriesEpisodes
            titleId={id}
            progress={{ season: entry?.season ?? null, episode: entry?.episode ?? null }}
            saving={save.isPending}
            onProgress={(season, episode) =>
              save.mutate({
                season,
                episode,
                status:
                  entry?.status && entry.status !== "Quero assistir" ? entry.status : "Assistindo",
              })
            }
          />
        )}

        {tab === "resenha" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (review.trim()) publish.mutate();
            }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">
              A resenha vai para o seu perfil e para o feed, com a sua nota (
              {entry?.rating ? `${Number(entry.rating)} estrelas` : "sem nota ainda"}).
            </p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              maxLength={2000}
              placeholder={`O que você achou de ${t.name}?`}
              className="mt-3 min-h-32 w-full rounded-lg border border-input bg-muted p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={spoiler}
                  onChange={(e) => setSpoiler(e.target.checked)}
                />
                Contém spoiler
              </label>
              <button
                disabled={!review.trim() || publish.isPending}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Publicar resenha
              </button>
            </div>
          </form>
        )}

        {tab === "comunidade" && (
          <div className="space-y-3">
            {posts?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Seja a primeira pessoa a publicar sobre {t.name}.{" "}
                <button onClick={() => setTab("resenha")} className="text-primary">
                  Escrever resenha
                </button>
              </p>
            )}
            {posts?.map((p) => (
              <PostCard key={p.id} p={p} meId={me.id} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Recommend({
  meId,
  titleId,
  onDone,
}: {
  meId: string;
  titleId: string;
  onDone: () => void;
}) {
  const { data: friends } = useQuery(followingQuery(meId));
  const [to, setTo] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("recommendations")
        .insert({ from_user: meId, to_user: to!, title_id: titleId, message: msg.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recomendação enviada");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="mt-4 rounded-lg border border-secondary/50 bg-accent p-3">
      <p className="text-sm font-semibold">Recomendar para quem você segue</p>
      {friends?.length === 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          Siga alguém primeiro para poder recomendar.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {friends?.map((f) => (
          <button
            key={f.id}
            onClick={() => setTo(f.id)}
            className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-3 text-xs ${to === f.id ? "border-secondary bg-secondary/20" : "border-border"}`}
          >
            <Avatar name={f.display_name} hue={f.avatar_hue} size={24} />
            {f.display_name}
          </button>
        ))}
      </div>
      {to && (
        <>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            maxLength={500}
            placeholder="Escreva uma mensagem…"
            className="mt-2 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
          />
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="mt-2 rounded-md bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground"
          >
            Enviar
          </button>
        </>
      )}
    </div>
  );
}
