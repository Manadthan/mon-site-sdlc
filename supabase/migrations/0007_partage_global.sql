-- ADR-06 révisé (US-17, v1.11) : un seul lien secret pour TOUTES les collections d'un compte,
-- au lieu d'un lien par collection (migration 0006, retirée ici : les anciens liens ne marchent plus).
drop function public.shared_collection(text);
alter table public.collections drop column share_token;

-- Pas de ligne = rien n'est partagé. Le jeton est tiré au hasard par le serveur (32 octets, base64url).
create table public.partages (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token      text not null unique constraint partages_token_format check (token ~ '^[A-Za-z0-9_-]{43}$'),
  created_at timestamptz not null default now()
);

alter table public.partages enable row level security;
create policy "partages : le propriétaire seulement" on public.partages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Lecture pour un visiteur SANS compte : aucune politique RLS pour anon, seulement ces deux fonctions
-- (security definer) qui ne renvoient que les données du propriétaire du jeton, ou NULL.
-- Ni user_id ni adresse source dans les réponses.

-- Liste des collections partagées, avec statistiques et couverture (comme l'accueil).
create function public.shared_collections(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'created_at', c.created_at,
          'cover_path', s.cover_path,
          'owned', s.owned,
          'total', s.total
        )
        order by c.created_at
      )
      from public.collections c
      join public.collection_stats s on s.collection_id = c.id
      where c.user_id = p.user_id
    ),
    '[]'::jsonb
  )
  from public.partages p
  where p.token = p_token;
$$;

-- Une collection partagée et ses items, seulement si elle appartient au propriétaire du jeton.
create function public.shared_collection(p_token text, p_collection_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', c.name,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', i.id, 'title', i.title, 'image_path', i.image_path, 'owned', i.owned)
          order by i.position
        )
        from public.items i
        where i.collection_id = c.id
      ),
      '[]'::jsonb
    )
  )
  from public.partages p
  join public.collections c on c.user_id = p.user_id
  where p.token = p_token and c.id = p_collection_id;
$$;

revoke execute on function public.shared_collections(text) from public;
revoke execute on function public.shared_collection(text, uuid) from public;
grant execute on function public.shared_collections(text) to anon, authenticated;
grant execute on function public.shared_collection(text, uuid) to anon, authenticated;
