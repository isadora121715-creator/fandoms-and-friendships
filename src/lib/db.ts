import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Title = Database["public"]["Tables"]["titles"]["Row"];
export type Kind = "jogo" | "serie" | "filme";
export type LibEntry = Database["public"]["Tables"]["library_entries"]["Row"] & { titles: Title | null };
export type FeedPost = Database["public"]["Tables"]["posts"]["Row"] & {
  profiles: Pick<Profile, "id" | "username" | "display_name" | "avatar_hue"> | null;
  titles: Title | null;
  post_likes: { user_id: string }[];
  comments: { count: number }[];
};

export const kindLabel: Record<Kind, string> = { jogo: "Jogo", serie: "Série", filme: "Filme" };
export const statuses: Record<Kind, string[]> = {
  jogo: ["Quero jogar", "Jogando", "Concluído", "Abandonado"],
  serie: ["Quero assistir", "Assistindo", "Assistido", "Abandonado"],
  filme: ["Quero assistir", "Assistido", "Abandonado"],
};
export const GENRES = ["RPG", "Ação", "Co-op", "Roguelike", "Simulação", "Metroidvania", "Ficção científica", "Fantasia", "Animação", "Drama", "Suspense", "Mistério", "Terror", "Comédia"];

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Sessão expirada");
    return must(await supabase.from("profiles").select("*").eq("id", data.user.id).single());
  },
});

export const titlesQuery = queryOptions({
  queryKey: ["titles"],
  queryFn: async () => must(await supabase.from("titles").select("*").order("name")),
  staleTime: 5 * 60_000,
});

export const titleQuery = (id: string) => queryOptions({
  queryKey: ["title", id],
  queryFn: async () => {
    const t = must(await supabase.from("titles").select("*").eq("id", id).maybeSingle());
    const ratings = must(await supabase.from("library_entries").select("rating").eq("title_id", id).not("rating", "is", null));
    const avg = ratings.length ? ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length : null;
    return { title: t, avg, count: ratings.length };
  },
});

const POST_SELECT = "*, profiles(id,username,display_name,avatar_hue), titles(*), post_likes(user_id), comments(count)";

export const feedQuery = (scope: "seguindo" | "todos", userId: string) => queryOptions({
  queryKey: ["feed", scope, userId],
  queryFn: async () => {
    let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(50);
    if (scope === "seguindo") {
      const f = must(await supabase.from("follows").select("following_id").eq("follower_id", userId));
      q = q.in("user_id", [userId, ...f.map((x) => x.following_id)]);
    }
    return must(await q) as unknown as FeedPost[];
  },
});

export const titlePostsQuery = (titleId: string) => queryOptions({
  queryKey: ["feed", "title", titleId],
  queryFn: async () => must(await supabase.from("posts").select(POST_SELECT).eq("title_id", titleId).order("created_at", { ascending: false })) as unknown as FeedPost[],
});

export const userPostsQuery = (userId: string) => queryOptions({
  queryKey: ["feed", "user", userId],
  queryFn: async () => must(await supabase.from("posts").select(POST_SELECT).eq("user_id", userId).order("created_at", { ascending: false })) as unknown as FeedPost[],
});

export const savedIdsQuery = queryOptions({
  queryKey: ["saved"],
  queryFn: async () => new Set(must(await supabase.from("post_saves").select("post_id")).map((r) => r.post_id)),
});

export const profileByUsernameQuery = (username: string) => queryOptions({
  queryKey: ["profile", username],
  queryFn: async () => {
    const p = must(await supabase.from("profiles").select("*").eq("username", username).maybeSingle());
    if (!p) return null;
    const [followers, following] = await Promise.all([
      supabase.from("follows").select("follower_id", { count: "exact" }).eq("following_id", p.id),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", p.id),
    ]);
    return { profile: p, followerIds: (followers.data ?? []).map((f) => f.follower_id), following: following.count ?? 0 };
  },
});

export const libraryQuery = (userId: string) => queryOptions({
  queryKey: ["library", userId],
  queryFn: async () => must(await supabase.from("library_entries").select("*, titles(*)").eq("user_id", userId).order("updated_at", { ascending: false })) as unknown as LibEntry[],
});

export const myEntryQuery = (userId: string, titleId: string) => queryOptions({
  queryKey: ["library", userId, titleId],
  queryFn: async () => must(await supabase.from("library_entries").select("*").eq("user_id", userId).eq("title_id", titleId).maybeSingle()),
});

export const suggestionsQuery = (userId: string) => queryOptions({
  queryKey: ["suggestions", userId],
  queryFn: async () => {
    const f = must(await supabase.from("follows").select("following_id").eq("follower_id", userId));
    const ex = [userId, ...f.map((x) => x.following_id)];
    return must(await supabase.from("profiles").select("*").not("id", "in", `(${ex.join(",")})`).limit(5));
  },
});

export const followingQuery = (userId: string) => queryOptions({
  queryKey: ["following", userId],
  queryFn: async () => must(await supabase.from("follows").select("profiles!follows_following_id_fkey(*)").eq("follower_id", userId)).map((r) => (r as unknown as { profiles: Profile }).profiles),
});

export const recsQuery = (userId: string) => queryOptions({
  queryKey: ["recs", userId],
  queryFn: async () => must(await supabase.from("recommendations").select("*, titles(*), from:profiles!recommendations_from_user_fkey(username,display_name,avatar_hue)").eq("to_user", userId).order("created_at", { ascending: false }).limit(10)) as unknown as {
    id: string; message: string; titles: Title; from: Pick<Profile, "username" | "display_name" | "avatar_hue">;
  }[],
});

/** Titles the user hasn't logged yet whose genres overlap the user's favorite genres and logged titles. */
export function recommendFor(all: Title[], lib: LibEntry[], favGenres: string[]): Title[] {
  const seen = new Set(lib.map((l) => l.title_id));
  const weight = new Map<string, number>();
  favGenres.forEach((g) => weight.set(g, (weight.get(g) ?? 0) + 2));
  lib.forEach((l) => l.titles?.genres.forEach((g) => weight.set(g, (weight.get(g) ?? 0) + (Number(l.rating ?? 3) >= 4 ? 2 : 1))));
  return all
    .filter((t) => !seen.has(t.id))
    .map((t) => ({ t, s: t.genres.reduce((s, g) => s + (weight.get(g) ?? 0), 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
