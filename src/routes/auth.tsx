import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import hero from "@/assets/hero.jpg";
import { Logo } from "@/components/app/Shell";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") ? s.redirect : undefined }),
  head: () => ({ meta: [
    { title: "Entrar — Lorebox" }, { name: "description", content: "Entre ou crie sua conta no Lorebox." },
    { property: "og:title", content: "Entrar — Lorebox" }, { property: "og:description", content: "Entre ou crie sua conta no Lorebox." },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const dest = redirect ?? "/feed";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "criar") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/feed", data: { username } } });
      if (error) toast.error(error.message); else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha incorretos"); else navigate({ to: dest });
    }
    setBusy(false);
  }
  async function google() {
    if (redirect) sessionStorage.setItem("lorebox_redirect", redirect);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error("Não foi possível entrar com Google"); return; }
    if (r.redirected) return;
    navigate({ to: dest });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block">
        <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-fade" />
        <div className="absolute bottom-10 left-10 max-w-sm"><h2 className="text-3xl font-extrabold">Seu lore. <span className="text-brand">Sua gente.</span></h2></div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo />
          {sent ? (
            <div className="mt-8 rounded-xl border border-primary/50 bg-card p-5">
              <h1 className="text-xl font-bold">Confira seu e-mail</h1>
              <p className="mt-2 text-sm text-muted-foreground">Enviamos um link de confirmação para {email}. Depois de confirmar, você já cai no seu feed.</p>
            </div>
          ) : (<>
            <h1 className="mt-8 text-2xl font-bold">{mode === "entrar" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
            <button onClick={google} className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#8E918F] bg-[#131314] px-3 py-2.5 text-sm font-medium text-[#E3E3E3]">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.480-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.560-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.950-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.310 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              Continuar com Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "criar" && <input required value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24))} placeholder="Nome de usuário" className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />}
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <button disabled={busy} className="w-full rounded-lg bg-brand py-2.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">{mode === "entrar" ? "Entrar" : "Criar conta"}</button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "entrar" ? "Ainda não tem conta? " : "Já tem conta? "}
              <button onClick={() => setMode(mode === "entrar" ? "criar" : "entrar")} className="font-semibold text-primary">{mode === "entrar" ? "Criar conta" : "Entrar"}</button>
            </p>
          </>)}
        </div>
      </div>
    </div>
  );
}
