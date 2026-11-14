-- Schéma initial (docs/DESIGN.md §3) : collections, items, statistiques calculées.

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  -- Rempli automatiquement avec l'utilisateur connecté.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 200),
  source_url  text,
  cover_path  text,
  created_at  timestamptz not null default now()
);

create index collections_user_id_idx on public.collections (user_id);

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 500),
  image_path    text,     -- chemin dans Storage, NULL si pas d'image
  source_image  text,     -- URL d'origine (information)
  position      integer not null,
  owned         boolean not null default false,
  created_at    timestamptz not null default now(),
  -- Deux items ne partagent jamais une position. Contrôle en fin de transaction (DEFERRABLE)
  -- pour permettre l'échange de deux positions (ADR-04). Sert aussi d'index (collection_id, position).
  constraint items_position_unique unique (collection_id, position) deferrable initially deferred
);

-- Possédés / total / % par collection : calculés à la lecture, jamais stockés.
-- security_invoker : la vue applique la RLS de l'utilisateur qui la lit.
create view public.collection_stats
with (security_invoker = true) as
select
  c.id                                          as collection_id,
  count(i.id)::integer                          as total,
  (count(i.id) filter (where i.owned))::integer as owned,
  case
    when count(i.id) = 0 then 0
    else round(100.0 * count(i.id) filter (where i.owned) / count(i.id))::integer
  end                                           as percent
from public.collections c
left join public.items i on i.collection_id = c.id
group by c.id;
