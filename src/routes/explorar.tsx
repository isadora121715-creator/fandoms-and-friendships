import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster } from "@/components/app/bits";
import { titles, users, lists, type Kind } from "@/lib/mock";

export const Route = createFileRoute("/explorar")({
  head: () => ({ meta: [
    { title: "Explorar — Lorebox" }, { name: "description", content: "Busque jogos, séries, filmes, pessoas e listas." },
    { property: "og:title", content: "Explorar — Lorebox" }, { property: "og:description", content: "Busque jogos, séries, filmes, pessoas e listas." },
  ] }),
  component: Explore,
});

const tabs: { k: Kind | "all"; l: string }[] = [{ k: "all", l: "Tudo" }, { k: "jogo", l: "Jogos" }, { k: "serie", l: "Séries" }, { k: "filme", l: "Filmes" }];

function Explore() {
  const [q, setQ] = useState("");
  const [k, setK] = useState<Kind | "all">("all");
  const ql = q.toLowerCase();
  const res = titles.filter((t) => (k === "all" || t.kind === k) && (t.name.toLowerCase().includes(ql) || t.genres.some((g) => g.toLowerCase().includes(ql))));
  const people = q ? users.filter((u) => (u.name + u.handle).toLowerCase().includes(ql)) : [];
  const ls = q ? lists.filter((l) => l.public && l.name.toLowerCase().includes(ql)) : [];
  return (
    <Shell>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque títulos, gêneros, pessoas ou listas" className="w-full rounded-xl border border-input bg-card py-3.5 pl-12 pr-4 outline-none focus:border-primary" />
      </div>
      <div className="mt-4 flex gap-2">{tabs.map((t) => (
        <button key={t.k} onClick={() => setK(t.k)} className={`rounded-full px-4 py-1.5 text-sm ${k === t.k ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}>{t.l}</button>
      ))}</div>
      {people.length > 0 && <div className="mt-6 flex flex-wrap gap-3">{people.map((u) => <div key={u.handle} className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-4 text-sm"><Avatar name={u.name} hue={u.hue} size={28} />{u.name}</div>)}</div>}
      {ls.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{ls.map((l) => <span key={l.name} className="rounded-lg bg-accent px-3 py-1.5 text-sm">📜 {l.name}</span>)}</div>}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{res.map((t) => <Poster key={t.id} t={t} />)}</div>
      {res.length === 0 && <p className="mt-10 text-center text-muted-foreground">Nada encontrado para “{q}”.</p>}
    </Shell>
  );
}
