-- Couverture d'une collection (migration 0005, issue #59).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.fr');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

insert into public.collections (id, name) values ('10000000-0000-0000-0000-000000000001', 'Cartes');

create temporary view couverture as
  select cover_path from public.collection_stats where collection_id = '10000000-0000-0000-0000-000000000001';

select is((select cover_path from couverture), null, 'collection vide : pas de couverture');

insert into public.items (id, collection_id, title, position, image_path) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sans image', 1, null),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'B', 2, 'a/c/b.webp'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'C', 3, 'a/c/c.webp');

select is((select cover_path from couverture), 'a/c/b.webp', 'image du premier item qui en a une');

select public.move_item('20000000-0000-0000-0000-000000000003', 'up');
select is((select cover_path from couverture), 'a/c/c.webp', 'suit l''ordre de la collection');

update public.collections set cover_path = 'a/c/choisie.webp' where id = '10000000-0000-0000-0000-000000000001';
select is((select cover_path from couverture), 'a/c/choisie.webp', 'cover_path renseignée : prioritaire');

-- Bruno ne voit pas la couverture d'Alice (security_invoker : RLS de celui qui lit).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty('select * from public.collection_stats', 'Bruno ne voit rien');

select * from finish();
rollback;
