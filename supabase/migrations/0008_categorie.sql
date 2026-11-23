-- US-19 : catégorie libre et facultative d'une collection (cartes, mangas, DVD…). NULL = sans catégorie.
-- Mêmes règles que le nom : pas d'espace au début, à la fin ni en double ; 40 caractères au plus.
-- Pas de table « categories » : une catégorie n'existe que tant qu'une collection la porte.
alter table public.collections
  add column category text
  constraint collections_category_format check (
    category is null
    or (char_length(category) between 1 and 40 and category = btrim(category) and category !~ '\s{2,}')
  );

-- Liste partagée (US-17) : même regroupement par catégorie que l'accueil, donc la catégorie en plus.
-- create or replace : même signature, les droits d'exécution donnés en 0007 sont conservés.
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
