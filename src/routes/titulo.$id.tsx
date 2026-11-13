import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Send, Plus } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster, Stars } from "@/components/app/bits";
import { byId, kindLabel, statuses, posts, users, library } from "@/lib/mock";

export const Route = createFileRoute("/titulo/$id")({
  loader: ({ params }) => { const t = byId(params.id); if (!t) throw notFound(); return t; },
  head: ({ loaderData }) => {
    const n = loaderData ? `${loaderData.name} — Lorebox` : "Título — Lorebox";
    const d = loaderData?.synopsis ?? "Página de título";
    return { meta: [{ title: n }, { name: "description", content: d }, { property: "og:title", content: n }, { property: "og:description", content: d }] };
  },
  component: TitlePage,
});

function TitlePage() {
  const t = Route.useLoaderData();
  const entry = library.find((l) => l.id === t.id);
  const [status, setStatus] = useState(entry?.status ?? "");
  const [rating, setRating] = useState(entry?.rating ?? 0);
  const [fav, setFav] = useState(!!entry?.fav);
  const [rec, setRec] = useState(false);
  const [sent, setSent] = useState(false);
  const community = posts.filter((p) => p.titleId === t.id);
  return (
    <Shell>
      <div className="relative -mx-4 -mt-6 h-56 overflow-hidden md:h-72" style={{ background: `radial-gradient(circle at 70% 30%, oklch(0.5 0.18 ${t.hue}), transparent 70%)` }}><div className="absolute inset-0 bg-fade" /></div>
      <div className="relative -mt-40 grid gap-6 md:grid-cols-[200px_1fr]">
        <Poster t={t} showName={false} className="w-36 md:w-full" />
        <div>
          <p className="text-sm text-primary">{kindLabel[t.kind]} · {t.year}</p>
          <h1 className="text-3xl font-extrabold md:text-5xl">{t.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.info} · {t.genres.join(", ")}</p>
          <div className="mt-2 flex items-center gap-2"><Stars value={t.rating} /><span className="text-sm">{t.rating} média da comunidade</span></div>
          <p className="mt-4 max-w-2xl leading-relaxed">{t.synopsis}</p>

          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Na sua biblioteca</p>
            <div className="mt-3 flex flex-wrap gap-2">{statuses[t.kind].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-sm ${status === s ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}>{s}</button>
            ))}</div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Stars value={rating} size={22} onChange={setRating} />
              {t.kind === "jogo" && <select className="rounded-md border border-input bg-muted px-2 py-1 text-sm" defaultValue={entry?.extra}>{["PC", "PS5", "Xbox", "Switch"].map((p) => <option key={p}>{p}</option>)}</select>}
              {t.kind === "serie" && <span className="flex items-center gap-1 text-sm">T <input type="number" defaultValue={2} className="w-12 rounded-md border border-input bg-muted px-1" /> E <input type="number" defaultValue={5} className="w-12 rounded-md border border-input bg-muted px-1" /></span>}
              <button onClick={() => setFav(!fav)} className={`flex items-center gap-1 text-sm ${fav ? "text-primary" : "text-muted-foreground"}`}><Heart className={`h-4 w-4 ${fav ? "fill-primary" : ""}`} />Favorito</button>
              <button className="flex items-center gap-1 text-sm text-muted-foreground"><Plus className="h-4 w-4" />Lista</button>
              <button onClick={() => setRec(!rec)} className="flex items-center gap-1 text-sm text-secondary"><Send className="h-4 w-4" />Recomendar</button>
            </div>
            <textarea placeholder="Escreva sua resenha…" className="mt-4 min-h-20 w-full rounded-lg border border-input bg-muted p-3 text-sm outline-none focus:border-primary" />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" /> Contém spoiler</label>
            {rec && (
              <div className="mt-4 rounded-lg border border-secondary/50 bg-accent p-3">
                {sent ? <p className="text-sm">Recomendação enviada para Luna ✨</p> : <>
                  <p className="text-sm font-semibold">Recomendar para um amigo</p>
                  <div className="mt-2 flex gap-2">{users.map((u) => <Avatar key={u.handle} name={u.name} hue={u.hue} size={32} />)}</div>
                  <input placeholder="Escreva uma mensagem…" className="mt-2 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
                  <button onClick={() => setSent(true)} className="mt-2 rounded-md bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">Enviar</button>
                </>}
              </div>
            )}
          </div>

          <h2 className="mt-8 text-xl font-bold">Da comunidade</h2>
          {community.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Seja a primeira pessoa a avaliar.</p>}
          {community.map((p) => { const u = users.find((x) => x.handle === p.user)!; return (
            <div key={p.id} className="mt-3 flex gap-3 rounded-xl border border-border bg-card p-4"><Avatar name={u.name} hue={u.hue} size={32} />
              <div className="text-sm"><b>{u.name}</b>{p.rating && <Stars value={p.rating} size={12} />}<p className="mt-1">{p.spoiler ? "⚠️ Resenha com spoiler oculta" : p.text}</p></div></div>
          ); })}
        </div>
      </div>
    </Shell>
  );
}
