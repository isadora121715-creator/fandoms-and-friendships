import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Gamepad2, Tv } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { libraryQuery, type LibEntry } from "@/lib/db";
import { Poster } from "./bits";

/**
 * "Continuar assistindo": what the user is currently watching or playing, with a one-tap
 * "next episode" check-off for series — the core loop of TV-tracking apps.
 */
export function ContinueWatching({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: lib } = useQuery(libraryQuery(userId));
  const current = (lib ?? []).filter(
    (l) => l.titles && (l.status === "Assistindo" || l.status === "Jogando"),
  );

  const next = useMutation({
    mutationFn: async (l: LibEntry) => {
      const episode = (l.episode ?? 0) + 1;
      const { error } = await supabase
        .from("library_entries")
        .update({ season: l.season ?? 1, episode, updated_at: new Date().toISOString() })
        .eq("id", l.id);
      if (error) throw error;
      return { name: l.titles!.name, season: l.season ?? 1, episode };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      toast.success(`${r.name}: T${r.season} · E${r.episode} assistido`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (current.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Continuar assistindo</h2>
        <Link to="/perfil" className="text-xs font-semibold text-primary">
          Ver biblioteca
        </Link>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {current.map((l) => {
          const t = l.titles!;
          const isSeries = t.kind === "serie";
          return (
            <div key={l.id} className="w-32 shrink-0">
              <Poster t={t} showName={false} className="w-32" />
              <p className="mt-2 truncate text-sm font-semibold" title={t.name}>
                {t.name}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {isSeries ? <Tv className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
                {isSeries
                  ? l.episode
                    ? `T${l.season ?? 1} · E${l.episode}`
                    : "Ainda não começou"
                  : (l.platform ?? "Jogando")}
              </p>
              {isSeries && (
                <button
                  type="button"
                  onClick={() => next.mutate(l)}
                  disabled={next.isPending}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-primary py-1 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Próximo episódio
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
