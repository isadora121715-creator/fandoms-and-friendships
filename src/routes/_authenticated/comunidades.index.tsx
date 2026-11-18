import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { communitiesFrom, titlesQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/comunidades/")({
  head: () => ({
    meta: [
      { title: "Comunidades — Lorebox" },
      { name: "description", content: "Comunidades temáticas para discutir gêneros e franquias." },
      { property: "og:title", content: "Comunidades — Lorebox" },
      {
        property: "og:description",
        content: "Comunidades temáticas para discutir gêneros e franquias.",
      },
    ],
  }),
  component: Communities,
});

function Communities() {
  const { data: titles, isLoading } = useQuery(titlesQuery);
  const list = communitiesFrom(titles ?? []);
  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Comunidade</p>
      <h1 className="mt-1 text-2xl font-bold">Comunidades temáticas</h1>
      <p className="text-sm text-muted-foreground">
        Cada comunidade reúne as publicações e resenhas sobre os títulos de um gênero.
      </p>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const hue = c.titles[0]?.hue ?? 270;
          return (
            <Link
              key={c.slug}
              to="/comunidades/$slug"
              params={{ slug: c.slug }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `radial-gradient(circle at 90% 10%, oklch(0.55 0.18 ${hue}), transparent 60%)`,
                }}
              />
              <div className="relative">
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  <Users className="h-4 w-4 text-primary" />
                  {c.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.titles.length} {c.titles.length === 1 ? "título" : "títulos"} ·{" "}
                  {c.titles
                    .slice(0, 3)
                    .map((t) => t.name)
                    .join(", ")}
                  {c.titles.length > 3 ? "…" : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
