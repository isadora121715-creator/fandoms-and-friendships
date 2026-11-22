alter table public.profiles add column avatar_url text;

create table public.episode_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  season int not null check (season > 0),
  episode int not null check (episode > 0),
  rating numeric(2,1) null check (rating between 0.5 and 5),
  best_character text null check (char_length(best_character) <= 120),
  updated_at timestamptz not null default now(),
  unique (user_id, title_id, season, episode)
);
grant select, insert, update, delete on public.episode_ratings to authenticated;
grant all on public.episode_ratings to service_role;
alter table public.episode_ratings enable row level security;
create policy "episode ratings read" on public.episode_ratings for select to authenticated using (true);
create policy "episode ratings insert own" on public.episode_ratings for insert to authenticated with check (auth.uid() = user_id);
create policy "episode ratings update own" on public.episode_ratings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "episode ratings delete own" on public.episode_ratings for delete to authenticated using (auth.uid() = user_id);

create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars insert own folder" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own folder" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own folder" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);