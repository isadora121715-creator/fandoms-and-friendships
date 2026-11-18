import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EyeOff, Film } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { titlesQuery, type Profile, type Title } from "@/lib/db";
import { Avatar } from "./bits";

export function Composer({
  me,
  titleOptions,
  placeholder = "O que você está jogando ou assistindo?",
}: {
  me: Profile;
  titleOptions?: Title[];
  placeholder?: string;
}) {
  const qc = useQueryClient();
  const { data: all } = useQuery(titlesQuery);
  const titles = titleOptions ?? all;
  const [body, setBody] = useState("");
  const [titleId, setTitleId] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .insert({ user_id: me.id, body: body.trim(), title_id: titleId || null, spoiler });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setTitleId("");
      setSpoiler(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Publicado!");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) m.mutate();
      }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex gap-3">
        <Avatar name={me.display_name} hue={me.avatar_hue} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder={placeholder}
          className="min-h-16 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
        <label className="flex items-center gap-1.5">
          <Film className="h-4 w-4" />
          <select
            value={titleId}
            onChange={(e) => setTitleId(e.target.value)}
            className="max-w-40 rounded-md border border-input bg-muted px-2 py-1 text-xs"
          >
            <option value="">Marcar título</option>
            {titles?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setSpoiler(!spoiler)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${spoiler ? "border-primary text-primary" : "border-border"}`}
        >
          <EyeOff className="h-3 w-3" />
          Spoiler
        </button>
        <button
          disabled={!body.trim() || m.isPending}
          className="ml-auto rounded-lg bg-brand px-4 py-1.5 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Publicar
        </button>
      </div>
    </form>
  );
}
