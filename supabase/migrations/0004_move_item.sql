-- ADR-04 : monter / descendre un item = échanger sa position avec celle de son voisin, d'un seul bloc.
-- Une fonction SQL s'exécute en une transaction : jamais d'ordre à moitié modifié.
-- security invoker : la RLS de l'appelant s'applique (on ne peut déplacer que ses propres items).

create function public.move_item(p_item_id uuid, p_direction text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.items;
  v_voisin public.items;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'Direction invalide : %', p_direction using errcode = '22023';
  end if;

  select * into v_item from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Item introuvable' using errcode = 'P0002';
  end if;

  if p_direction = 'up' then
    select * into v_voisin from public.items
      where collection_id = v_item.collection_id and position < v_item.position
      order by position desc limit 1 for update;
  else
    select * into v_voisin from public.items
      where collection_id = v_item.collection_id and position > v_item.position
      order by position asc limit 1 for update;
  end if;

  -- Déjà premier (ou dernier) : rien à faire.
  if not found then
    return;
  end if;

  -- La contrainte d'unicité des positions est contrôlée en fin de transaction (DEFERRABLE, 0001_schema.sql).
  update public.items set position = v_voisin.position where id = v_item.id;
  update public.items set position = v_item.position where id = v_voisin.id;
end;
$$;

revoke execute on function public.move_item(uuid, text) from public, anon;
grant execute on function public.move_item(uuid, text) to authenticated;
