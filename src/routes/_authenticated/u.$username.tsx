import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Shell } from "@/components/app/Shell";
import { ProfileView } from "@/components/app/ProfileView";
import { meQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({ meta: [
    { title: `@${params.username} — Lorebox` }, { name: "description", content: `Perfil de @${params.username} no Lorebox.` },
    { property: "og:title", content: `@${params.username} — Lorebox` }, { property: "og:description", content: `Perfil de @${params.username} no Lorebox.` },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: UserPage,
});

function UserPage() {
  const { username } = Route.useParams();
  const { data: me } = useSuspenseQuery(meQuery);
  return <Shell><ProfileView username={username} me={me} /></Shell>;
}
