export type Kind = "jogo" | "serie" | "filme";
export type Title = {
  id: string; kind: Kind; name: string; year: number; genres: string[];
  synopsis: string; rating: number; hue: number; info: string;
};
export const titles: Title[] = [
  { id: "elden-ring", kind: "jogo", name: "Elden Ring", year: 2022, genres: ["RPG", "Fantasia sombria"], synopsis: "Erga-se, Maculado, e seja guiado pela graça para portar o poder do Anel Prístino.", rating: 4.7, hue: 75, info: "FromSoftware · PC, PS5, Xbox" },
  { id: "hades", kind: "jogo", name: "Hades", year: 2020, genres: ["Roguelike", "Ação"], synopsis: "Zagreus tenta escapar do submundo enfrentando o próprio pai, Hades.", rating: 4.8, hue: 20, info: "Supergiant · PC, Switch, PS" },
  { id: "baldurs-gate-3", kind: "jogo", name: "Baldur's Gate 3", year: 2023, genres: ["RPG", "Co-op"], synopsis: "Reúna seu grupo e volte aos Reinos Esquecidos numa história de amizade e traição.", rating: 4.9, hue: 300, info: "Larian · PC, PS5, Xbox" },
  { id: "stardew", kind: "jogo", name: "Stardew Valley", year: 2016, genres: ["Simulação", "Co-op"], synopsis: "Herde a fazenda do avô e comece uma nova vida no Vale do Orvalho.", rating: 4.6, hue: 140, info: "ConcernedApe · Todas" },
  { id: "dark", kind: "serie", name: "Dark", year: 2017, genres: ["Ficção científica", "Mistério"], synopsis: "O desaparecimento de duas crianças expõe os laços entre quatro famílias e o tempo.", rating: 4.8, hue: 230, info: "Netflix · 3 temporadas" },
  { id: "arcane", kind: "serie", name: "Arcane", year: 2021, genres: ["Animação", "Fantasia"], synopsis: "Duas irmãs em lados opostos de uma guerra entre Piltover e Zaun.", rating: 4.9, hue: 330, info: "Netflix · 2 temporadas" },
  { id: "the-bear", kind: "serie", name: "The Bear", year: 2022, genres: ["Drama"], synopsis: "Um chef premiado volta a Chicago para salvar o restaurante da família.", rating: 4.5, hue: 45, info: "FX · 3 temporadas" },
  { id: "severance", kind: "serie", name: "Ruptura", year: 2022, genres: ["Suspense", "Ficção científica"], synopsis: "Funcionários têm as memórias do trabalho separadas da vida pessoal.", rating: 4.7, hue: 200, info: "Apple TV+ · 2 temporadas" },
  { id: "duna-2", kind: "filme", name: "Duna: Parte 2", year: 2024, genres: ["Ficção científica"], synopsis: "Paul Atreides se une aos Fremen em busca de vingança.", rating: 4.6, hue: 60, info: "Denis Villeneuve · 166 min" },
  { id: "aranhaverso", kind: "filme", name: "Através do Aranhaverso", year: 2023, genres: ["Animação", "Ação"], synopsis: "Miles Morales atravessa o Multiverso e encontra a Sociedade Aranha.", rating: 4.8, hue: 350, info: "Sony · 140 min" },
  { id: "interestelar", kind: "filme", name: "Interestelar", year: 2014, genres: ["Ficção científica", "Drama"], synopsis: "Exploradores atravessam um buraco de minhoca para salvar a humanidade.", rating: 4.7, hue: 250, info: "Christopher Nolan · 169 min" },
  { id: "spirited", kind: "filme", name: "A Viagem de Chihiro", year: 2001, genres: ["Animação", "Fantasia"], synopsis: "Uma menina entra num mundo de espíritos para salvar os pais.", rating: 4.9, hue: 170, info: "Studio Ghibli · 125 min" },
];
export const byId = (id: string) => titles.find((t) => t.id === id);
export const kindLabel: Record<Kind, string> = { jogo: "Jogo", serie: "Série", filme: "Filme" };
export const statuses: Record<Kind, string[]> = {
  jogo: ["Quero jogar", "Jogando", "Concluído", "Abandonado"],
  serie: ["Quero assistir", "Assistindo", "Assistido", "Abandonado"],
  filme: ["Quero assistir", "Assistido", "Abandonado"],
};
export type User = { handle: string; name: string; hue: number; bio: string };
export const users: User[] = [
  { handle: "lunavex", name: "Luna Vex", hue: 300, bio: "RPGs longos, animação e trilhas sonoras." },
  { handle: "caiopixel", name: "Caio Pixel", hue: 220, bio: "Co-op de sofá é minha religião." },
  { handle: "biacinefila", name: "Bia Cinéfila", hue: 30, bio: "Sci-fi lento e cinema japonês." },
  { handle: "rafa_dm", name: "Rafa Mestre", hue: 150, bio: "Mestre de D&D nas horas vagas." },
];
export const me = {
  handle: "voce", name: "Você", hue: 270, bio: "Jogando tudo da Larian e revendo Dark pela 3ª vez.",
  genres: ["RPG", "Ficção científica", "Animação", "Co-op"],
};
export type Post = {
  id: string; user: string; time: string; text: string; titleId?: string;
  rating?: number; spoiler?: boolean; likes: number; comments: number; kind: "post" | "review" | "update";
};
export const posts: Post[] = [
  { id: "p1", user: "lunavex", time: "2h", kind: "review", titleId: "arcane", rating: 5, text: "A segunda temporada fecha o arco da Jinx de um jeito que eu não esperava. Animação de outro planeta.", likes: 128, comments: 14 },
  { id: "p2", user: "caiopixel", time: "4h", kind: "update", titleId: "baldurs-gate-3", text: "Começou o Ato 3 com a galera (PC). Alguém tem dica pra Cidade Baixa?", likes: 42, comments: 9 },
  { id: "p3", user: "biacinefila", time: "6h", kind: "review", titleId: "dark", rating: 5, spoiler: true, text: "Quando descobri que o Jonas e o Adam são a mesma pessoa, precisei pausar e respirar por 10 minutos.", likes: 210, comments: 33 },
  { id: "p4", user: "rafa_dm", time: "1d", kind: "post", titleId: "hades", text: "Finalmente 30 de Calor. Hades é o jogo perfeito pra sessões curtas antes de dormir.", likes: 77, comments: 5 },
];
export const lists = [
  { name: "Jogos para jogar com amigos", public: true, ids: ["baldurs-gate-3", "stardew", "hades"] },
  { name: "Filmes que me marcaram", public: true, ids: ["interestelar", "spirited", "aranhaverso"] },
  { name: "Guilty pleasures", public: false, ids: ["the-bear", "duna-2"] },
];
export type LibEntry = { id: string; status: string; rating?: number; fav?: boolean; extra?: string };
export const library: LibEntry[] = [
  { id: "baldurs-gate-3", status: "Jogando", rating: 5, fav: true, extra: "PC" },
  { id: "elden-ring", status: "Abandonado", rating: 4, extra: "PS5" },
  { id: "hades", status: "Concluído", rating: 5, fav: true, extra: "Switch" },
  { id: "stardew", status: "Quero jogar" },
  { id: "dark", status: "Assistindo", rating: 5, fav: true, extra: "T2 · E5" },
  { id: "arcane", status: "Assistido", rating: 5, fav: true },
  { id: "severance", status: "Quero assistir" },
  { id: "interestelar", status: "Assistido", rating: 5, fav: true },
  { id: "spirited", status: "Assistido", rating: 4.5 },
  { id: "duna-2", status: "Quero assistir" },
];
