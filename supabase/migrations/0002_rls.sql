-- Row Level Security (docs/DESIGN.md §3) : chacun ne voit et ne modifie que ses propres données.
-- Sans politique, rien n'est accessible : les visiteurs non connectés (rôle anon) ne voient rien.

alter table public.collections enable row level security;
alter table public.items enable row level security;

create policy "collections : propriétaire uniquement"
  on public.collections
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- items n'a pas de user_id : l'accès passe par la collection parente.
create policy "items : via la collection du propriétaire"
  on public.items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );
