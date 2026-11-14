-- Tests de move_item (ADR-04, US-10).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.fr');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

insert into public.collections (id, name) values ('10000000-0000-0000-0000-000000000001', 'Cartes');
-- Positions avec des « trous » (items supprimés entre-temps) : l'échange doit viser le vrai voisin.
insert into public.items (id, collection_id, title, position) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'B', 4),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'C', 9);

create temporary view ordre as
  select string_agg(title, '' order by position) as titres from public.items
  where collection_id = '10000000-0000-0000-0000-000000000001';

select lives_ok($$select public.move_item('20000000-0000-0000-0000-000000000002', 'up')$$, 'monter B');
select is((select titres from ordre), 'BAC', 'B échange sa place avec A');

select lives_ok($$select public.move_item('20000000-0000-0000-0000-000000000002', 'down')$$, 'redescendre B');
select is((select titres from ordre), 'ABC', 'retour à l''ordre de départ');

select public.move_item('20000000-0000-0000-0000-000000000001', 'up');
select public.move_item('20000000-0000-0000-0000-000000000003', 'down');
select is((select titres from ordre), 'ABC', 'le premier ne monte pas, le dernier ne descend pas');

select throws_ok(
  $$select public.move_item('20000000-0000-0000-0000-000000000001', 'gauche')$$,
  '22023', null, 'direction inconnue refusée'
);

-- Bruno ne peut pas déplacer les items d'Alice (RLS : l'item lui est invisible).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select throws_ok(
  $$select public.move_item('20000000-0000-0000-0000-000000000002', 'up')$$,
  'P0002', null, 'Bruno ne peut pas déplacer un item d''Alice'
);

-- Un visiteur non connecté ne peut même pas appeler la fonction.
set local role anon;
select throws_ok(
  $$select public.move_item('20000000-0000-0000-0000-000000000002', 'up')$$,
  '42501', null, 'fonction interdite aux visiteurs non connectés'
);

select * from finish();
rollback;
