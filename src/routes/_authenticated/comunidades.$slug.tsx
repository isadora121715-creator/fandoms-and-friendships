import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Shell } from "@/components/app/Shell";
import { Poster } from "@/components/app/bits";
import { PostCard } from "@/components/app/PostCard";
import { Composer } from "@/components/app/Composer";
import { communitiesFrom, meQuery, postsForTitlesQuery, titlesQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/comunidades/$slug")({
  head: () => ({
    meta: [
      { title: "Comunidade — Lorebox" },
      {
        name: "description",
        content: "Discussões, resenhas e títulos de uma comunidade temática.",
      },
      { property: "og:title", content: "Comunidade — Lorebox" },
      {
        property: "og:description",
        content: "Discussões, resenhas e títulos de uma comunidade temática.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(titlesQuery),
    ]);
  },
  component: Community,
});

function Community() {
  const { slug } = Route.useParams();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: titles } = useSuspenseQuery(titlesQuery);
  const c = communitiesFrom(titles).find((x) => x.slug === slug);
  const ids = c?.titles.map((t) => t.id) ?? [];
  const { data: posts, isLoading } = useQuery(postsForTitlesQuery(slug, ids));

  if (!c)
    return (
      <Shell>
        <p className="py-20 text-center text-muted-foreground">
          Comunidade não encontrada.{" "}
          <Link to="/comunidades" className="text-primary">
            Ver todas
          </Link>
        </p>
      </Shell>
    );

  return (
    <Shell>
      <Link
        to="/comunidades"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Comunidades
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold">{c.name}</h1>
      <p className="text-sm text-muted-foreground">
        {c.titles.length} {c.titles.length === 1 ? "título" : "títulos"} · {posts?.length ?? 0}{" "}
        {posts?.length === 1 ? "publicação" : "publicações"}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Composer
            me={me}
            titleOptions={c.titles}
            placeholder={`Puxe um assunto sobre ${c.name}…`}
          />
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {posts?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Ninguém falou sobre {c.name} ainda. Comece a conversa marcando um título!
            </div>
          )}
          {posts?.map((p) => (
            <PostCard key={p.id} p={p} meId={me.id} />
          ))}
        </div>
        <aside>
          <h2 className="font-bold">Títulos da comunidade</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {c.titles.map((t) => (
              <Poster key={t.id} t={t} />
            ))}
          </div>
        </aside>
      </div>
    </Shell>
  );
}
