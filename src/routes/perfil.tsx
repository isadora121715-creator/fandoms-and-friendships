import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Globe, Heart, Shield } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster, Stars } from "@/components/app/bits";
import { me, library, lists, byId, type Kind } from "@/lib/mock";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [
    { title: "Seu perfil — Lorebox" }, { name: "description", content: "Biblioteca, listas e favoritos." },
    { property: "og:title", content: "Seu perfil — Lorebox" }, { property: "og:description", content: "Biblioteca, listas e favoritos." },
  ] }),
  component: Profile,
});

const tabs: { k: Kind | "listas" | "privacidade"; l: string }[] = [{ k: "jogo", l: "Jogos" }, { k: "serie", l: "Séries" }, { k: "filme", l: "Filmes" }, { k: "listas", l: "Listas" }, { k: "privacidade", l: "Privacidade" }];

function Profile() {
  const [tab, setTab] = useState<(typeof tabs)[number]["k"]>("jogo");
  const favs = library.filter((l) => l.fav).map((l) => byId(l.id)!);
  return (
    <Shell>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar name={me.name} hue={me.hue} size={96} />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{me.name} <span className="text-base font-normal text-muted-foreground">@{me.handle}</span></h1>
          <p className="mt-1 text-muted-foreground">{me.bio}</p>
          <div className="mt-2 flex flex-wrap gap-2">{me.genres.map((g) => <span key={g} className="rounded-full bg-accent px-3 py-0.5 text-xs">{g}</span>)}</div>
        </div>
        <div className="flex gap-6 text-center text-sm"><div><b className="block text-xl">{library.length}</b>títulos</div><div><b className="block text-xl">248</b>seguidores</div><div><b className="block text-xl">180</b>seguindo</div></div>
      </div>

      <h2 className="mt-8 flex items-center gap-2 font-bold"><Heart className="h-4 w-4 text-primary" />Favoritos</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{favs.map((t) => <Poster key={t.id} t={t} />)}</div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-border">{tabs.map((t) => (
        <button key={t.k} onClick={() => setTab(t.k)} className={`border-b-2 px-4 py-2 text-sm ${tab === t.k ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{t.l}</button>
      ))}</div>

      {(tab === "jogo" || tab === "serie" || tab === "filme") && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {library.filter((l) => byId(l.id)!.kind === tab).map((l) => { const t = byId(l.id)!; return (
            <div key={l.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <Poster t={t} showName={false} className="w-14 shrink-0" />
              <div className="text-sm"><b>{t.name}</b>
                <p className="mt-1"><span className="rounded-full bg-accent px-2 py-0.5 text-xs text-primary">{l.status}</span> {l.extra && <span className="text-xs text-muted-foreground">· {l.extra}</span>}</p>
                {l.rating && <div className="mt-1"><Stars value={l.rating} size={12} /></div>}
              </div>
            </div>
          ); })}
        </div>
      )}
      {tab === "listas" && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">{lists.map((l) => (
          <div key={l.name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex -space-x-6">{l.ids.map((id) => <Poster key={id} t={byId(id)!} showName={false} className="w-16 ring-2 ring-card" />)}</div>
            <p className="mt-3 font-semibold">{l.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">{l.public ? <><Globe className="h-3 w-3" />Pública</> : <><Lock className="h-3 w-3" />Privada</>} · {l.ids.length} títulos</p>
          </div>
        ))}</div>
      )}
      {tab === "privacidade" && (
        <div className="mt-4 max-w-xl space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          {[["Perfil visível para", "Todos"], ["Atividades visíveis para", "Seguidores"], ["Quem pode enviar mensagens", "Pessoas que eu sigo"], ["Participar da descoberta de pessoas", "Desativado"], ["Localização exibida", "Apenas país"]].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-border pb-2 last:border-0"><span>{a}</span><span className="text-primary">{b}</span></div>
          ))}
          <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"><Shield className="h-3.5 w-3.5" />Usuários bloqueados e denúncias ficam aqui.</p>
        </div>
      )}
    </Shell>
  );
}
