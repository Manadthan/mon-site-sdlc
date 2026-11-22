-- ADR-06 (US-17) : partager une collection en lecture seule par un lien secret.
-- share_token NULL = collection non partagée. Le jeton est tiré au hasard par le serveur (32 octets, base64url).
alter table public.collections
  add column share_token text unique
  constraint collections_share_token_format check (share_token ~ '^[A-Za-z0-9_-]{43}$');

-- Lecture d'une collection partagée, pour un visiteur SANS compte.
-- On n'ouvre aucune politique RLS au rôle anon (il ne pourrait alors rien lister d'autre) :
-- cette fonction s'exécute avec les droits de son propriétaire (security definer) et ne renvoie
-- que la collection dont le jeton correspond exactement, ou NULL. Pas d'user_id ni d'adresse source.
create function public.shared_collection(p_token text)
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
  from public.collections c
  where c.share_token = p_token;
$$;

revoke execute on function public.shared_collection(text) from public;
grant execute on function public.shared_collection(text) to anon, authenticated;
