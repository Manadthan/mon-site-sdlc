-- Couverture d'une collection sur l'accueil (US-02, issue #59) : cover_path si elle est renseignée,
-- sinon l'image du premier item (dans l'ordre de la collection) qui en a une.
-- Calculée à la lecture, comme les statistiques : elle suit les suppressions et les changements d'ordre.
-- La colonne est ajoutée à la fin de la vue (create or replace view ne permet pas d'en insérer au milieu).
create or replace view public.collection_stats
with (security_invoker = true) as
select
  c.id                                          as collection_id,
  count(i.id)::integer                          as total,
  (count(i.id) filter (where i.owned))::integer as owned,
  case
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
