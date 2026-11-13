import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Bookmark, EyeOff, Send, ImagePlus } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster, Stars } from "@/components/app/bits";
import { posts, users, byId, titles, me, type Post } from "@/lib/mock";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [
    { title: "Feed — Lorebox" }, { name: "description", content: "Resenhas e atualizações de quem você segue." },
    { property: "og:title", content: "Feed — Lorebox" }, { property: "og:description", content: "Resenhas e atualizações de quem você segue." },
  ] }),
  component: Feed,
});

const label = { review: "avaliou", update: "atualizou", post: "publicou sobre" };

function PostCard({ p }: { p: Post }) {
  const u = users.find((x) => x.handle === p.user)!;
  const t = p.titleId ? byId(p.titleId) : undefined;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reveal, setReveal] = useState(!p.spoiler);
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} hue={u.hue} />
        <div className="text-sm"><b>{u.name}</b> <span className="text-muted-foreground">{label[p.kind]}</span> {t && <Link to="/titulo/$id" params={{ id: t.id }} className="font-semibold text-primary">{t.name}</Link>}
          <p className="text-xs text-muted-foreground">@{u.handle} · {p.time}</p></div>
      </div>
      <div className="mt-3 flex gap-4">
        {t && <Poster t={t} showName={false} className="w-20 shrink-0" />}
        <div className="min-w-0 flex-1">
          {p.rating && <Stars value={p.rating} />}
          {reveal ? <p className="mt-2 text-sm leading-relaxed">{p.text}</p> : (
            <button onClick={() => setReveal(true)} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-accent/50 p-3 text-left text-sm">
              <EyeOff className="h-4 w-4 text-primary" /> Contém spoiler — toque para ver
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
        <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 ${liked ? "text-primary" : ""}`}><Heart className={`h-4 w-4 ${liked ? "fill-primary" : ""}`} />{p.likes + (liked ? 1 : 0)}</button>
        <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />{p.comments}</span>
        <span className="flex items-center gap-1.5"><Repeat2 className="h-4 w-4" />Compartilhar</span>
        <button onClick={() => setSaved(!saved)} className={`ml-auto ${saved ? "text-secondary" : ""}`} aria-label="Salvar"><Bookmark className={`h-4 w-4 ${saved ? "fill-secondary" : ""}`} /></button>
      </div>
    </article>
  );
}

function Feed() {
  const [spoiler, setSpoiler] = useState(false);
  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex gap-3"><Avatar name={me.name} hue={me.hue} />
              <textarea placeholder="O que você está jogando ou assistindo?" className="min-h-16 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
            <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
              <ImagePlus className="h-4 w-4" /><span>Marcar título</span>
              <button onClick={() => setSpoiler(!spoiler)} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${spoiler ? "border-primary text-primary" : "border-border"}`}><EyeOff className="h-3 w-3" />Spoiler</button>
              <button className="ml-auto rounded-lg bg-brand px-4 py-1.5 font-semibold text-primary-foreground">Publicar</button>
            </div>
          </div>
          {posts.map((p) => <PostCard key={p.id} p={p} />)}
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-bold">Quem seguir</h3>
            {users.map((u) => <FollowRow key={u.handle} {...u} />)}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-bold">Para você</h3>
            <p className="text-xs text-muted-foreground">Porque você curte RPG e Ficção científica</p>
            <div className="mt-3 grid grid-cols-3 gap-2">{titles.filter((t) => ["severance", "elden-ring", "duna-2"].includes(t.id)).map((t) => <Poster key={t.id} t={t} showName={false} />)}</div>
          </div>
          <div className="rounded-xl border border-primary/40 bg-accent p-4 text-sm">
            <Send className="mb-2 h-4 w-4 text-primary" /><b>Caio te recomendou Stardew Valley</b>
            <p className="mt-1 text-muted-foreground">"Bora fazer uma fazenda juntos no fim de semana?"</p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function FollowRow({ name, handle, hue }: { name: string; handle: string; hue: number }) {
  const [f, setF] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-3"><Avatar name={name} hue={hue} size={32} />
      <div className="flex-1 text-sm"><b>{name}</b><p className="text-xs text-muted-foreground">@{handle}</p></div>
      <button onClick={() => setF(!f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${f ? "border border-border" : "bg-primary text-primary-foreground"}`}>{f ? "Seguindo" : "Seguir"}</button>
    </div>
  );
}
