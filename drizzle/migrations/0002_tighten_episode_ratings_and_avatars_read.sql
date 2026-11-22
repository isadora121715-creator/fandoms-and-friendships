drop policy "episode ratings read" on public.episode_ratings;
create policy "episode ratings read own" on public.episode_ratings for select to authenticated using (auth.uid() = user_id);
drop policy "avatars public read" on storage.objects;
create policy "avatars read own folder" on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);