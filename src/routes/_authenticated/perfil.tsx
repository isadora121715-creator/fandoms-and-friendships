import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Shell } from "@/components/app/Shell";
import { ProfileView } from "@/components/app/ProfileView";
import { meQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Seu perfil — Lorebox" },
      { name: "description", content: "Sua biblioteca, favoritos e publicações." },
      { property: "og:title", content: "Seu perfil — Lorebox" },
      { property: "og:description", content: "Sua biblioteca, favoritos e publicações." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: MyProfile,
});

function MyProfile() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <Shell>
      <ProfileView username={me.username} me={me} />
    </Shell>
  );
}
