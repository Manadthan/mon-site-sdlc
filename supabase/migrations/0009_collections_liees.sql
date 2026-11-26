-- Collections liées à un site compagnon (ex. Nintendo DB, Dragon Ball DB) via le contrat GET /api/suivi.
-- Les compteurs et la couverture sont mis en cache sur la ligne `collections` (repli transparent si le site distant
-- est injoignable) et reflétés par `collection_stats` et `shared_collections`.
alter table public.collections
  add column external_url text
    constraint collections_external_url_format check (external_url is null or external_url ~ '^https?://'),
  add column external_source text,
  add column external_owned integer
    constraint collections_external_owned_non_negative check (external_owned is null or external_owned >= 0),
  add column external_total integer
    constraint collections_external_total_non_negative check (external_total is null or external_total >= 0),
  add column external_cover_url text
    constraint collections_external_cover_url_format check (external_cover_url is null or external_cover_url ~ '^https?://'),
  add column external_synced_at timestamptz;

-- Vue des statistiques : une collection liée utilise son cache synchronisé ; une collection locale garde le calcul sur items.
create or replace view public.collection_stats
with (security_invoker = true) as
select
  c.id                                          as collection_id,
  case
    when c.external_url is not null then coalesce(c.external_total, 0)
    else count(i.id)::integer
  end                                           as total,
  case
    when c.external_url is not null then coalesce(c.external_owned, 0)
    else (count(i.id) filter (where i.owned))::integer
  end                                           as owned,
  case
    when c.external_url is not null then
      case
        when coalesce(c.external_total, 0) = 0 then 0
        else round(100.0 * coalesce(c.external_owned, 0) / c.external_total)::integer
      end
    when count(i.id) = 0 then 0
    else round(100.0 * count(i.id) filter (where i.owned) / count(i.id))::integer
  end                                           as percent,
  coalesce(
    c.cover_path,
    (
      select premier.image_path
      from public.items premier
      where premier.collection_id = c.id and premier.image_path is not null
      order by premier.position
      limit 1
    )
  )                                             as cover_path
from public.collections c
left join public.items i on i.collection_id = c.id
group by c.id;

-- Liste partagée (US-17) : expose aussi les métadonnées des collections liées (URL, source, couverture externe).
create or replace function public.shared_collections(p_token text)
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
          'category', c.category,
          'created_at', c.created_at,
          'cover_path', s.cover_path,
          'owned', s.owned,
          'total', s.total,
          'external_url', c.external_url,
          'external_source', c.external_source,
          'external_cover_url', c.external_cover_url
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
