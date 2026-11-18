import { createFileRoute } from "@tanstack/react-router";
import { KindCatalog } from "@/components/app/KindCatalog";

export const Route = createFileRoute("/_authenticated/series")({
  head: () => ({
    meta: [
      { title: "Séries — Lorebox" },
      { name: "description", content: "Acompanhe temporadas, episódios e descubra novas séries." },
      { property: "og:title", content: "Séries — Lorebox" },
      {
        property: "og:description",
        content: "Acompanhe temporadas, episódios e descubra novas séries.",
      },
    ],
  }),
  component: () => <KindCatalog kind="serie" />,
});
