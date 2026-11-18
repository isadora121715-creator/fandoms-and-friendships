import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type FeedPost, savedIdsQuery, timeAgo } from "@/lib/db";
import { Avatar, Poster, Stars } from "./bits";

export function PostCard({ p, meId }: { p: FeedPost; meId: string }) {
  const qc = useQueryClient();
  const { data: saved } = useQuery(savedIdsQuery);
  const liked = p.post_likes.some((l) => l.user_id === meId);
  const isSaved = saved?.has(p.id) ?? false;
  const [reveal, setReveal] = useState(!p.spoiler || p.user_id === meId);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const u = p.profiles;
  const t = p.titles;

  const comments = useQuery({
    queryKey: ["comments", p.id],
    enabled: open,
    queryFn: async () =>
      (
        await supabase
          .from("comments")
          .select("*, profiles(username,display_name,avatar_hue)")
          .eq("post_id", p.id)
          .order("created_at")
      ).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["feed"] });
  const like = useMutation({
    mutationFn: async () => {
      if (liked) await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", meId);
      else await supabase.from("post_likes").insert({ post_id: p.id, user_id: meId });
    },
    onSuccess: refresh,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (isSaved)
        await supabase.from("post_saves").delete().eq("post_id", p.id).eq("user_id", meId);
      else await supabase.from("post_saves").insert({ post_id: p.id, user_id: meId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved"] });
      toast(isSaved ? "Removido dos salvos" : "Publicação salva");
    },
  });
  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: p.id, user_id: meId, body: comment.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["comments", p.id] });
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async () => {
      await supabase.from("posts").delete().eq("id", p.id);
    },
    onSuccess: () => {
      refresh();
      toast("Publicação apagada");
    },
  });
  function share() {
    const url = t ? `${window.location.origin}/titulo/${t.id}` : window.location.href;
    navigator.clipboard?.writeText(url);
    toast("Link copiado para compartilhar");
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {u && (
          <Link to="/u/$username" params={{ username: u.username }}>
            <Avatar name={u.display_name} hue={u.avatar_hue} />
          </Link>
        )}
        <div className="flex-1 text-sm">
          {u && (
            <Link to="/u/$username" params={{ username: u.username }} className="font-bold">
              {u.display_name}
            </Link>
          )}{" "}
          <span className="text-muted-foreground">
            {p.is_review ? "avaliou" : t ? "publicou sobre" : "publicou"}
          </span>{" "}
          {t && (
            <Link to="/titulo/$id" params={{ id: t.id }} className="font-semibold text-primary">
              {t.name}
            </Link>
          )}
          <p className="text-xs text-muted-foreground">
            @{u?.username} · {timeAgo(p.created_at)}
          </p>
        </div>
        {p.user_id === meId && (
          <button
            onClick={() => del.mutate()}
            aria-label="Apagar"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-4">
        {t && <Poster t={t} showName={false} className="w-20 shrink-0" />}
        <div className="min-w-0 flex-1">
          {p.rating != null && <Stars value={Number(p.rating)} />}
          {reveal ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
          ) : (
            <button
              onClick={() => setReveal(true)}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-accent/50 p-3 text-left text-sm"
            >
              <EyeOff className="h-4 w-4 text-primary" /> Contém spoiler — toque para ver
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
        <button
          onClick={() => like.mutate()}
          className={`flex items-center gap-1.5 ${liked ? "text-primary" : ""}`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-primary" : ""}`} />
          {p.post_likes.length}
        </button>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          {p.comments[0]?.count ?? 0}
        </button>
        <button onClick={share} className="flex items-center gap-1.5">
          <Share2 className="h-4 w-4" />
          Compartilhar
        </button>
        <button
          onClick={() => save.mutate()}
          className={`ml-auto ${isSaved ? "text-secondary" : ""}`}
          aria-label="Salvar"
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-secondary" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {comments.data?.map((c) => {
            const cu = c.profiles as unknown as { display_name: string; avatar_hue: number } | null;
            return (
              <div key={c.id} className="flex gap-2 text-sm">
                <Avatar name={cu?.display_name ?? "?"} hue={cu?.avatar_hue ?? 270} size={24} />
                <p>
                  <b>{cu?.display_name}</b> {c.body}
                </p>
              </div>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (comment.trim()) addComment.mutate();
            }}
            className="flex gap-2"
          >
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Comente…"
              className="flex-1 rounded-md border border-input bg-muted px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button className="rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
              Enviar
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
