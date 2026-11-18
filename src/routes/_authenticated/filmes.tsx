import { createFileRoute } from "@tanstack/react-router";
import { KindCatalog } from "@/components/app/KindCatalog";

export const Route = createFileRoute("/_authenticated/filmes")({
  head: () => ({
    meta: [
      { title: "Filmes — Lorebox" },
      { name: "description", content: "Avalie filmes e monte sua lista para assistir." },
      { property: "og:title", content: "Filmes — Lorebox" },
      { property: "og:description", content: "Avalie filmes e monte sua lista para assistir." },
    ],
  }),
  component: () => <KindCatalog kind="filme" />,
});
