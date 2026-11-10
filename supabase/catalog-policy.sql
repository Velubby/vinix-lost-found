drop policy if exists "Authenticated users can browse found items" on public.items;
drop policy if exists "Anyone can browse found items" on public.items;

create policy "Anyone can browse found items"
  on public.items for select to anon, authenticated using (true);
