import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X, Heart } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster } from "@/components/app/bits";
import { users, titles } from "@/lib/mock";
// Preview only: compatibility matching is a planned next stage, so this screen uses sample people.

export const Route = createFileRoute("/_authenticated/descobrir")({
  head: () => ({ meta: [
    { title: "Descobrir pessoas — Lorebox" }, { name: "description", content: "Prévia: encontre pessoas com gostos em comum." },
    { property: "og:title", content: "Descobrir pessoas — Lorebox" }, { property: "og:description", content: "Prévia: encontre pessoas com gostos em comum." },
  ] }),
  component: Discover,
});

const goals = ["Amizades", "Companhia para jogar", "Conversar sobre conteúdos", "Relacionamento (18+)"];
const common = [12, 8, 5, 3];

function Discover() {
  const [i, setI] = useState(0);
  const [goal, setGoal] = useState(goals[1]);
  const [match, setMatch] = useState<string | null>(null);
  const u = users[i % users.length]!;
  const shared = titles.slice(i % 4, (i % 4) + 3);
  const next = (like: boolean) => { if (like && i % 2 === 0) setMatch(u.name); setI(i + 1); };
  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-secondary">Próxima etapa · prévia</p>
        <h1 className="mt-1 text-center text-2xl font-bold">Descobrir pessoas</h1>
        <p className="text-center text-sm text-muted-foreground">Opcional — ative nas configurações de privacidade.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">{goals.map((g) => (
          <button key={g} onClick={() => setGoal(g)} className={`rounded-full px-3 py-1 text-xs ${goal === g ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}>{g}</button>
        ))}</div>
        {match && <div className="mt-4 rounded-xl border border-primary bg-accent p-3 text-center text-sm">É recíproco! Você e {match} podem conversar agora. <button onClick={() => setMatch(null)} className="ml-1 text-primary underline">Abrir conversa</button></div>}
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-glow">
          <div className="flex items-center gap-3"><Avatar name={u.name} hue={u.hue} size={64} />
            <div><p className="text-lg font-bold">{u.name}</p><p className="text-sm text-muted-foreground">{u.bio}</p><p className="text-xs text-muted-foreground">São Paulo, BR (aproximado)</p></div></div>
          <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-sm">Vocês têm <b className="text-primary">{common[i % 4]} favoritos em comum</b> e ambos jogam co-op no PC.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">{shared.map((t) => <Poster key={t.id} t={t} />)}</div>
          <div className="mt-5 flex justify-center gap-6">
            <button onClick={() => next(false)} aria-label="Passar" className="grid h-14 w-14 place-items-center rounded-full border border-border"><X /></button>
            <button onClick={() => next(true)} aria-label="Demonstrar interesse" className="grid h-14 w-14 place-items-center rounded-full bg-brand text-primary-foreground"><Heart /></button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
