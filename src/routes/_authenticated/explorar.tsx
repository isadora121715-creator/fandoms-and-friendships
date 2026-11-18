import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/app/Shell";
import { Avatar, Poster } from "@/components/app/bits";
import { WebSearch } from "@/components/app/WebSearch";
import { titlesQuery, type Kind } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/explorar")({
  head: () => ({
    meta: [
      { title: "Explorar — Lorebox" },
      { name: "description", content: "Busque jogos, séries, filmes e pessoas." },
      { property: "og:title", content: "Explorar — Lorebox" },
      { property: "og:description", content: "Busque jogos, séries, filmes e pessoas." },
    ],
  }),
  component: Explore,
});

const tabs: { k: Kind | "all"; l: string }[] = [
  { k: "all", l: "Tudo" },
  { k: "jogo", l: "Jogos" },
  { k: "serie", l: "Séries" },
  { k: "filme", l: "Filmes" },
];

function Explore() {
  const [q, setQ] = useState("");
  const [k, setK] = useState<Kind | "all">("all");
  const { data: titles } = useQuery(titlesQuery);
  const ql = q.trim().toLowerCase();
  const { data: people } = useQuery({
    queryKey: ["people", ql],
    enabled: ql.length >= 2,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("*")
          .or(
            `username.ilike.%${ql.replace(/[%,()]/g, "")}%,display_name.ilike.%${ql.replace(/[%,()]/g, "")}%`,
          )
          .limit(8)
      ).data ?? [],
  });
  const res = (titles ?? []).filter(
    (t) =>
      (k === "all" || t.kind === k) &&
      (t.name.toLowerCase().includes(ql) || t.genres.some((g) => g.toLowerCase().includes(ql))),
  );
  return (
    <Shell>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque títulos, gêneros ou pessoas"
          className="w-full rounded-xl border border-input bg-card py-3.5 pl-12 pr-4 outline-none focus:border-primary"
        />
      </div>
      <div className="mt-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setK(t.k)}
            className={`rounded-full px-4 py-1.5 text-sm ${k === t.k ? "bg-brand font-semibold text-primary-foreground" : "border border-border text-muted-foreground"}`}
          >
            {t.l}
          </button>
        ))}
      </div>
      {people && people.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {people.map((u) => (
            <Link
              key={u.id}
              to="/u/$username"
              params={{ username: u.username }}
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-4 text-sm"
            >
              <Avatar name={u.display_name} hue={u.avatar_hue} size={28} />
              {u.display_name} <span className="text-muted-foreground">@{u.username}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {res.map((t) => (
          <Poster key={t.id} t={t} />
        ))}
      </div>
      {titles && res.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          Nenhum título encontrado para “{q}”.
        </p>
      )}
      {titles && <WebSearch q={q} catalog={titles} {...(k === "all" ? {} : { kind: k })} />}
    </Shell>
  );
}
