import { createFileRoute } from "@tanstack/react-router";
import { KindCatalog } from "@/components/app/KindCatalog";

export const Route = createFileRoute("/_authenticated/jogos")({
  head: () => ({
    meta: [
      { title: "Jogos — Lorebox" },
      { name: "description", content: "Registre, avalie e descubra jogos para PC e consoles." },
      { property: "og:title", content: "Jogos — Lorebox" },
      {
        property: "og:description",
        content: "Registre, avalie e descubra jogos para PC e consoles.",
      },
    ],
  }),
  component: () => <KindCatalog kind="jogo" />,
});
