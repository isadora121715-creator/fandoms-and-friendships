import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";
import { Logo } from "@/components/app/Shell";
import { Footer } from "@/components/app/Footer";
import { Poster } from "@/components/app/bits";
import { titles } from "@/lib/mock";
// Landing poster strip uses static sample titles so the public page needs no sign-in.

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lorebox — sua rede social geek" },
      {
        name: "description",
        content:
          "Registre, avalie e compartilhe jogos, séries e filmes e encontre pessoas com os mesmos gostos.",
      },
      { property: "og:title", content: "Lorebox — sua rede social geek" },
      {
        property: "og:description",
        content: "Registre, avalie e compartilhe jogos, séries e filmes.",
      },
    ],
  }),
  component: Index,
});

const names = [
  ["Lorebox", "Uma caixa para todo o seu lore pessoal."],
  ["Sidequest", "Toda amizade começa como uma missão secundária."],
  ["Critiverso", "O universo das suas críticas e descobertas."],
  ["Nexo", "Onde gostos em comum viram conexões."],
  ["Maratona", "Para quem vive de binge, campanha e sessão dupla."],
];
const screens = [
  "Cadastro e escolha de gostos",
  "Feed",
  "Explorar e busca",
  "Página do título",
  "Perfil e biblioteca",
  "Listas (próxima etapa)",
  "Recomendar a um amigo",
  "Descobrir pessoas",
  "Comunidades",
  "Privacidade e segurança",
];
const journey = [
  "Cria a conta e escolhe gêneros favoritos",
  "Marca 5 títulos que já viu ou jogou",
  "Recebe sugestões de pessoas para seguir",
  "Avalia e escreve a primeira resenha",
  "Recomenda um título a um amigo",
  "Ativa, se quiser, a descoberta de pessoas",
];
const v1 = [
  "Cadastro e perfil com foto, bio e gêneros",
  "Catálogo com 360+ jogos, séries e filmes",
  "Busca automática de novos títulos na web",
  "Biblioteca com status, plataforma e episódio",
  "Notas, resenhas e favoritos",
  "Feed com curtidas, comentários, salvos e spoilers",
  "Seguir pessoas e recomendar títulos",
  "Comunidades por gênero",
  "Descoberta de pessoas por compatibilidade (opcional)",
];

function Index() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={hero}
          alt=""
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-fade" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6">
          <Logo />
          <div className="max-w-2xl pt-24 md:pt-36">
            <h1 className="text-4xl font-extrabold md:text-6xl">
              Seu lore. <span className="text-brand">Sua gente.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Registre e avalie jogos, séries e filmes, compartilhe opiniões e encontre pessoas que
              vibram com as mesmas histórias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ redirect: undefined }}
                className="rounded-lg bg-brand px-6 py-3 font-semibold text-primary-foreground shadow-glow"
              >
                Criar conta grátis
              </Link>
              <Link
                to="/feed"
                className="rounded-lg border border-border bg-card/60 px-6 py-3 font-semibold"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {titles.map((t) => (
            <Poster key={t.id} t={t} className="w-32 shrink-0" />
          ))}
        </div>

        <section>
          <h2 className="text-2xl font-bold">Cinco nomes propostos</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {names.map(([n, d], i) => (
              <div
                key={n}
                className={`rounded-xl border p-4 ${i === 0 ? "border-primary bg-accent" : "border-border bg-card"}`}
              >
                <p className="font-display text-lg font-bold">{n}</p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                {i === 0 && <p className="mt-2 text-xs text-primary">Nome escolhido</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Principais telas</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {screens.map((s) => (
                <li key={s} className="rounded-lg border border-border bg-card px-3 py-2">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Jornada de um novo usuário</h2>
            <ol className="mt-4 space-y-2">
              {journey.map((j, i) => (
                <li key={j} className="flex items-center gap-3 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {j}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-primary/50 bg-card p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Primeira versão
            </p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {v1.map((v) => (
                <li key={v}>✓ {v}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Próximas etapas
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Listas personalizadas públicas ou privadas</li>
              <li>Bloquear, denunciar e controle de privacidade</li>
              <li>Mensagens diretas e relacionamento 18+ com verificação</li>
            </ul>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
