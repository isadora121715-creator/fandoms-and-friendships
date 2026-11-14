create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  genres text[] not null default '{}',
  avatar_hue int not null default 270,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' then base := 'user'; end if;
  if exists (select 1 from public.profiles where username = base) then base := base || substr(md5(new.id::text),1,4); end if;
  insert into public.profiles (id, username, display_name, avatar_hue)
  values (new.id, base, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', base), (floor(random()*360))::int);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.titles (
  id text primary key,
  kind text not null check (kind in ('jogo','serie','filme')),
  name text not null, year int not null, genres text[] not null default '{}',
  synopsis text not null default '', info text not null default '', hue int not null default 270
);
grant select on public.titles to anon, authenticated;
grant all on public.titles to service_role;
alter table public.titles enable row level security;
create policy "titles public" on public.titles for select to anon, authenticated using (true);

insert into public.titles (id,kind,name,year,genres,synopsis,info,hue) values
('elden-ring','jogo','Elden Ring',2022,'{RPG,"Fantasia sombria"}','Erga-se, Maculado, e seja guiado pela graça para portar o poder do Anel Prístino.','FromSoftware · PC, PS5, Xbox',75),
('hades','jogo','Hades',2020,'{Roguelike,Ação}','Zagreus tenta escapar do submundo enfrentando o próprio pai, Hades.','Supergiant · PC, Switch, PS',20),
('baldurs-gate-3','jogo','Baldur''s Gate 3',2023,'{RPG,Co-op}','Reúna seu grupo e volte aos Reinos Esquecidos numa história de amizade e traição.','Larian · PC, PS5, Xbox',300),
('stardew','jogo','Stardew Valley',2016,'{Simulação,Co-op}','Herde a fazenda do avô e comece uma nova vida no Vale do Orvalho.','ConcernedApe · Todas',140),
('hollow-knight','jogo','Hollow Knight',2017,'{Metroidvania,Ação}','Explore o reino arruinado de Hallownest e desvende seus segredos.','Team Cherry · PC, Switch, PS, Xbox',210),
('dark','serie','Dark',2017,'{"Ficção científica",Mistério}','O desaparecimento de duas crianças expõe os laços entre quatro famílias e o tempo.','Netflix · 3 temporadas',230),
('arcane','serie','Arcane',2021,'{Animação,Fantasia}','Duas irmãs em lados opostos de uma guerra entre Piltover e Zaun.','Netflix · 2 temporadas',330),
('the-bear','serie','The Bear',2022,'{Drama}','Um chef premiado volta a Chicago para salvar o restaurante da família.','FX · 3 temporadas',45),
('severance','serie','Ruptura',2022,'{Suspense,"Ficção científica"}','Funcionários têm as memórias do trabalho separadas da vida pessoal.','Apple TV+ · 2 temporadas',200),
('the-last-of-us','serie','The Last of Us',2023,'{Drama,Pós-apocalíptico}','Joel e Ellie atravessam um país devastado por uma infecção.','HBO · 2 temporadas',100),
('duna-2','filme','Duna: Parte 2',2024,'{"Ficção científica"}','Paul Atreides se une aos Fremen em busca de vingança.','Denis Villeneuve · 166 min',60),
('aranhaverso','filme','Através do Aranhaverso',2023,'{Animação,Ação}','Miles Morales atravessa o Multiverso e encontra a Sociedade Aranha.','Sony · 140 min',350),
('interestelar','filme','Interestelar',2014,'{"Ficção científica",Drama}','Exploradores atravessam um buraco de minhoca para salvar a humanidade.','Christopher Nolan · 169 min',250),
('spirited','filme','A Viagem de Chihiro',2001,'{Animação,Fantasia}','Uma menina entra num mundo de espíritos para salvar os pais.','Studio Ghibli · 125 min',170),
('matrix','filme','Matrix',1999,'{"Ficção científica",Ação}','Um hacker descobre que a realidade é uma simulação.','Wachowski · 136 min',150);

create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title_id text not null references public.titles(id) on delete cascade,
  status text, rating numeric(2,1) check (rating between 0.5 and 5), favorite boolean not null default false,
  platform text, season int, episode int, updated_at timestamptz not null default now(),
  unique (user_id, title_id)
);
grant select, insert, update, delete on public.library_entries to authenticated;
grant all on public.library_entries to service_role;
alter table public.library_entries enable row level security;
create policy "library readable" on public.library_entries for select to authenticated using (true);
create policy "own library write" on public.library_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id text references public.titles(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  rating numeric(2,1), spoiler boolean not null default false, is_review boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "own posts insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "own posts delete" on public.posts for delete to authenticated using (auth.uid() = user_id);

create table public.post_likes (post_id uuid not null references public.posts(id) on delete cascade, user_id uuid not null, primary key (post_id,user_id));
create table public.post_saves (post_id uuid not null references public.posts(id) on delete cascade, user_id uuid not null, primary key (post_id,user_id));
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000), created_at timestamptz not null default now()
);
create table public.follows (follower_id uuid not null references public.profiles(id) on delete cascade, following_id uuid not null references public.profiles(id) on delete cascade, primary key (follower_id, following_id), check (follower_id <> following_id));
grant select, insert, delete on public.post_likes, public.post_saves, public.comments, public.follows to authenticated;
grant all on public.post_likes, public.post_saves, public.comments, public.follows to service_role;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
create policy "likes read" on public.post_likes for select to authenticated using (true);
create policy "likes own" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "likes del" on public.post_likes for delete to authenticated using (auth.uid() = user_id);
create policy "saves read own" on public.post_saves for select to authenticated using (auth.uid() = user_id);
create policy "saves own" on public.post_saves for insert to authenticated with check (auth.uid() = user_id);
create policy "saves del" on public.post_saves for delete to authenticated using (auth.uid() = user_id);
create policy "comments read" on public.comments for select to authenticated using (true);
create policy "comments own" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments del" on public.comments for delete to authenticated using (auth.uid() = user_id);
create policy "follows read" on public.follows for select to authenticated using (true);
create policy "follows own" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "follows del" on public.follows for delete to authenticated using (auth.uid() = follower_id);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  message text not null default '' check (length(message) <= 500),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.recommendations to authenticated;
grant all on public.recommendations to service_role;
alter table public.recommendations enable row level security;
create policy "recs read" on public.recommendations for select to authenticated using (auth.uid() = from_user or auth.uid() = to_user);
create policy "recs send" on public.recommendations for insert to authenticated with check (auth.uid() = from_user);
create policy "recs del" on public.recommendations for delete to authenticated using (auth.uid() = to_user);