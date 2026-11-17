import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster, Stars } from "@/components/app/bits";
import { PostCard } from "@/components/app/PostCard";
import { followingQuery, kindLabel, meQuery, myEntryQuery, statuses, titlePostsQuery, titleQuery, type Kind } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/titulo/$id")({
  head: () => ({ meta: [
    { title: "Título — Lorebox" }, { name: "description", content: "Sinopse, avaliações e publicações da comunidade." },
    { property: "og:title", content: "Título — Lorebox" }, { property: "og:description", content: "Sinopse, avaliações e publicações da comunidade." },
  ] }),
  loader: async ({ context, params }) => {
    await Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(titleQuery(params.id))]);
  },
  component: TitlePage,
});

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
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  useEffect(() => { setSeason(entry?.season?.toString() ?? ""); setEpisode(entry?.episode?.toString() ?? ""); }, [entry]);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("library_entries").upsert({ user_id: me.id, title_id: id, ...entry, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id,title_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); qc.invalidateQueries({ queryKey: ["title", id] }); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => { await supabase.from("library_entries").delete().eq("user_id", me.id).eq("title_id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); qc.invalidateQueries({ queryKey: ["title", id] }); toast("Removido da biblioteca"); },
  });
  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").insert({ user_id: me.id, title_id: id, body: review.trim(), rating: entry?.rating ?? null, spoiler, is_review: true });
      if (error) throw error;
    },
    onSuccess: () => { setReview(""); setSpoiler(false); qc.invalidateQueries({ queryKey: ["feed"] }); toast.success("Resenha publicada"); },
    onError: (e) => toast.error(e.message),
  });

  if (!t) return <Shell><p className="py-20 text-center text-muted-foreground">Título não encontrado. <Link to="/explorar" className="text-primary">Voltar ao catálogo</Link></p></Shell>;
  const kind = t.kind as Kind;

  return (
    <Shell>
      <div className="relative -mx-4 -mt-6 h-56 overflow-hidden md:h-72" style={{ background: `radial-gradient(circle at 70% 30%, oklch(0.5 0.18 ${t.hue}), transparent 70%)` }}><div className="absolute inset-0 bg-fade" /></div>
      <div className="relative -mt-40 grid gap-6 md:grid-cols-[200px_1fr]">
        <Poster t={t} showName={false} className="w-36 md:w-full" />
        <div>
          <p className="text-sm text-primary">{kindLabel[kind]} · {t.year}</p>
          <h1 className="text-3xl font-extrabold md:text-5xl">{t.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.info} · {t.genres.join(", ")}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {info.avg != null ? <><Stars value={info.avg} /><span>{info.avg.toFixed(1)} · {info.count} {info.count === 1 ? "avaliação" : "avaliações"}</span></> : <span className="text-muted-foreground">Ainda sem notas</span>}
          </div>
          <p className="mt-4 max-w-2xl leading-relaxed">{t.synopsis}</p>

          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Na sua biblioteca</p>
              {entry && <button onClick={() => remove.mutate()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" />Remover</button>}</div>
            <div className="mt-3 flex flex-wrap gap-2">{statuses[kind].map((s) => (
              <button key={s} onClick={() => save.mutate({ status: s })} className={`rounded-full px-3 py-1 text-sm ${entry?.status === s ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}>{s}</button>
            ))}</div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Stars value={Number(entry?.rating ?? 0)} size={22} onChange={(v) => save.mutate({ rating: v })} />
              {kind === "jogo" && (
                <select value={entry?.platform ?? ""} onChange={(e) => save.mutate({ platform: e.target.value || null })} className="rounded-md border border-input bg-muted px-2 py-1 text-sm">
                  <option value="">Plataforma</option>{["PC", "PS5", "PS4", "Xbox", "Switch", "Mobile"].map((p) => <option key={p}>{p}</option>)}
                </select>
              )}
              {kind === "serie" && (
                <span className="flex items-center gap-1 text-sm">T <input type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} onBlur={() => save.mutate({ season: season ? Number(season) : null })} className="w-14 rounded-md border border-input bg-muted px-1" />
                  E <input type="number" min={1} value={episode} onChange={(e) => setEpisode(e.target.value)} onBlur={() => save.mutate({ episode: episode ? Number(episode) : null })} className="w-14 rounded-md border border-input bg-muted px-1" /></span>
              )}
              <button onClick={() => save.mutate({ favorite: !entry?.favorite })} className={`flex items-center gap-1 text-sm ${entry?.favorite ? "text-primary" : "text-muted-foreground"}`}><Heart className={`h-4 w-4 ${entry?.favorite ? "fill-primary" : ""}`} />Favorito</button>
              <button onClick={() => setRec(!rec)} className="flex items-center gap-1 text-sm text-secondary"><Send className="h-4 w-4" />Recomendar</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (review.trim()) publish.mutate(); }}>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={2000} placeholder="Escreva sua resenha…" className="mt-4 min-h-20 w-full rounded-lg border border-input bg-muted p-3 text-sm outline-none focus:border-primary" />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} /> Contém spoiler</label>
                <button disabled={!review.trim() || publish.isPending} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Publicar resenha</button>
              </div>
            </form>
            {rec && <Recommend meId={me.id} titleId={id} onDone={() => setRec(false)} />}
          </div>

          <h2 className="mt-8 text-xl font-bold">Da comunidade</h2>
          {posts?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Seja a primeira pessoa a publicar sobre {t.name}.</p>}
          <div className="mt-3 space-y-3">{posts?.map((p) => <PostCard key={p.id} p={p} meId={me.id} />)}</div>
        </div>
      </div>
    </Shell>
  );
}

function Recommend({ meId, titleId, onDone }: { meId: string; titleId: string; onDone: () => void }) {
  const { data: friends } = useQuery(followingQuery(meId));
  const [to, setTo] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const m = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("recommendations").insert({ from_user: meId, to_user: to!, title_id: titleId, message: msg.trim() }); if (error) throw error; },
    onSuccess: () => { toast.success("Recomendação enviada"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="mt-4 rounded-lg border border-secondary/50 bg-accent p-3">
      <p className="text-sm font-semibold">Recomendar para quem você segue</p>
      {friends?.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Siga alguém primeiro para poder recomendar.</p>}
      <div className="mt-2 flex flex-wrap gap-2">{friends?.map((f) => (
        <button key={f.id} onClick={() => setTo(f.id)} className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-3 text-xs ${to === f.id ? "border-secondary bg-secondary/20" : "border-border"}`}><Avatar name={f.display_name} hue={f.avatar_hue} size={24} />{f.display_name}</button>
      ))}</div>
      {to && <>
        <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} placeholder="Escreva uma mensagem…" className="mt-2 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
        <button onClick={() => m.mutate()} disabled={m.isPending} className="mt-2 rounded-md bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">Enviar</button>
      </>}
    </div>
  );
}
