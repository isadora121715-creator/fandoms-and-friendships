import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  GENRES,
  libraryQuery,
  profileByUsernameQuery,
  savedPostsQuery,
  userPostsQuery,
  type Kind,
  type Profile,
} from "@/lib/db";
import { Avatar, Poster, Stars } from "./bits";
import { PostCard } from "./PostCard";

type Tab = Kind | "posts" | "salvos";
const tabs: { k: Tab; l: string; own?: boolean }[] = [
  { k: "jogo", l: "Jogos" },
  { k: "serie", l: "Séries" },
  { k: "filme", l: "Filmes" },
  { k: "posts", l: "Publicações" },
  { k: "salvos", l: "Salvos", own: true },
];

export function ProfileView({ username, me }: { username: string; me: Profile }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(profileByUsernameQuery(username));
  const p = data?.profile;
  const { data: lib } = useQuery({ ...libraryQuery(p?.id ?? ""), enabled: !!p });
  const { data: posts } = useQuery({ ...userPostsQuery(p?.id ?? ""), enabled: !!p });
  const [tab, setTab] = useState<Tab>("jogo");
  const [editing, setEditing] = useState(false);
  const isMe = p?.id === me.id;
  const { data: saved } = useQuery({
    ...savedPostsQuery(me.id),
    enabled: isMe && tab === "salvos",
  });
  const following = !!data?.followerIds.includes(me.id);

  const follow = useMutation({
    mutationFn: async () => {
      if (following)
        await supabase.from("follows").delete().eq("follower_id", me.id).eq("following_id", p!.id);
      else await supabase.from("follows").insert({ follower_id: me.id, following_id: p!.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["following"] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!p) return <p className="py-20 text-center text-muted-foreground">Perfil não encontrado.</p>;
  const favs = (lib ?? []).filter((l) => l.favorite && l.titles);

  return (
    <div>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar name={p.display_name} hue={p.avatar_hue} size={96} />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">
            {p.display_name}{" "}
            <span className="text-base font-normal text-muted-foreground">@{p.username}</span>
          </h1>
          {p.bio && <p className="mt-1 text-muted-foreground">{p.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {p.genres.map((g) => (
              <span key={g} className="rounded-full bg-accent px-3 py-0.5 text-xs">
                {g}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6 text-center text-sm">
          <div>
            <b className="block text-xl">{lib?.length ?? 0}</b>títulos
          </div>
          <div>
            <b className="block text-xl">{data.followerIds.length}</b>seguidores
          </div>
          <div>
            <b className="block text-xl">{data.following}</b>seguindo
          </div>
          {isMe ? (
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          ) : (
            <button
              onClick={() => follow.mutate()}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${following ? "border border-border" : "bg-primary text-primary-foreground"}`}
            >
              {following ? "Seguindo" : "Seguir"}
            </button>
          )}
        </div>
      </div>
      {editing && isMe && <EditProfile p={p} onDone={() => setEditing(false)} />}

      {favs.length > 0 && (
        <>
          <h2 className="mt-8 flex items-center gap-2 font-bold">
            <Heart className="h-4 w-4 text-primary" />
            Favoritos
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {favs.map((l) => (
              <Poster key={l.id} t={l.titles!} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {tabs
          .filter((t) => !t.own || isMe)
          .map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`border-b-2 px-4 py-2 text-sm ${tab === t.k ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {t.l}
            </button>
          ))}
      </div>
      {tab === "salvos" ? (
        <div className="mt-4 max-w-2xl space-y-3">
          {saved?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Você ainda não salvou nenhuma publicação. Toque no marcador de um post para guardá-lo
              aqui.
            </p>
          )}
          {saved?.map((x) => (
            <PostCard key={x.id} p={x} meId={me.id} />
          ))}
        </div>
      ) : tab === "posts" ? (
        <div className="mt-4 max-w-2xl space-y-3">
          {posts?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma publicação ainda.</p>
          )}
          {posts?.map((x) => (
            <PostCard key={x.id} p={x} meId={me.id} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(lib ?? []).filter((l) => l.titles?.kind === tab).length === 0 && (
            <p className="text-sm text-muted-foreground">Nada nesta coleção ainda.</p>
          )}
          {(lib ?? [])
            .filter((l) => l.titles?.kind === tab)
            .map((l) => {
              const t = l.titles!;
              const extra =
                l.platform ??
                (l.season ? `T${l.season}${l.episode ? ` · E${l.episode}` : ""}` : null);
              return (
                <div key={l.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                  <Poster t={t} showName={false} className="w-14 shrink-0" />
                  <div className="text-sm">
                    <b>{t.name}</b>
                    <p className="mt-1">
                      {l.status && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-primary">
                          {l.status}
                        </span>
                      )}{" "}
                      {extra && <span className="text-xs text-muted-foreground">· {extra}</span>}
                    </p>
                    {l.rating != null && (
                      <div className="mt-1">
                        <Stars value={Number(l.rating)} size={12} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function EditProfile({ p, onDone }: { p: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(p.display_name);
  const [bio, setBio] = useState(p.bio);
  const [genres, setGenres] = useState<string[]>(p.genres);
  const [hue, setHue] = useState(p.avatar_hue);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim() || p.username,
          bio: bio.slice(0, 300),
          genres,
          avatar_hue: hue,
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Perfil atualizado");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="mt-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={name || p.username} hue={hue} size={48} />
        <label className="flex-1 text-xs text-muted-foreground">
          Cor do avatar
          <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        placeholder="Nome"
        className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={300}
        placeholder="Biografia"
        className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
      />
      <p className="text-xs text-muted-foreground">Gêneros favoritos</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() =>
              setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])
            }
            className={`rounded-full px-3 py-1 text-xs ${genres.includes(g) ? "bg-brand text-primary-foreground" : "border border-border text-muted-foreground"}`}
          >
            {g}
          </button>
        ))}
      </div>
      <button
        onClick={() => m.mutate()}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Salvar
      </button>
    </div>
  );
}
