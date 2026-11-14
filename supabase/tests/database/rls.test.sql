-- Tests du schéma et de la Row Level Security (pgTAP), lancés par `npm run db:test`.
-- Tout se passe dans une transaction annulée à la fin : la base reste propre.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Deux utilisateurs fictifs.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.fr');

-- Structure
select has_table('public', 'collections', 'table collections');
select has_table('public', 'items', 'table items');
select has_view('public', 'collection_stats', 'vue collection_stats');
select ok((select relrowsecurity from pg_class where oid = 'public.collections'::regclass), 'RLS active sur collections');
select ok((select relrowsecurity from pg_class where oid = 'public.items'::regclass), 'RLS active sur items');

-- Alice, connectée, crée une collection de 3 items dont 2 possédés.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

insert into public.collections (id, name) values ('10000000-0000-0000-0000-000000000001', 'Cartes DBZ');
insert into public.items (collection_id, title, position, owned) values
  ('10000000-0000-0000-0000-000000000001', 'N°1', 1, true),
  ('10000000-0000-0000-0000-000000000001', 'N°2', 2, true),
  ('10000000-0000-0000-0000-000000000001', 'N°3', 3, false);

select is((select user_id from public.collections), '00000000-0000-0000-0000-00000000000a'::uuid,
  'user_id rempli automatiquement avec l''utilisateur connecté');
select results_eq(
  'select total, owned, percent from public.collection_stats',
  $$values (3, 2, 67)$$,
  'collection_stats : 2 / 3 · 67 %'
);
-- La contrainte d'unicité est contrôlée en fin de transaction ; on force le contrôle immédiat pour le test.
set constraints items_position_unique immediate;
select throws_ok(
  $$insert into public.items (collection_id, title, position) values ('10000000-0000-0000-0000-000000000001', 'Doublon', 1)$$,
  '23505', null, 'deux items ne peuvent pas avoir la même position'
);

-- Bruno, connecté, ne voit ni ne modifie rien d'Alice.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select is_empty('select * from public.collections', 'Bruno ne voit pas les collections d''Alice');
select is_empty('select * from public.items', 'Bruno ne voit pas les items d''Alice');
select is_empty('select * from public.collection_stats', 'Bruno ne voit pas les statistiques d''Alice');
select is_empty(
  $$update public.collections set name = 'Piraté' returning id$$,
  'Bruno ne peut pas renommer la collection d''Alice'
);
select throws_ok(
  $$insert into public.items (collection_id, title, position) values ('10000000-0000-0000-0000-000000000001', 'Intrus', 99)$$,
  '42501', null, 'Bruno ne peut pas ajouter d''item dans la collection d''Alice'
);
select throws_ok(
  $$insert into public.collections (name, user_id) values ('Faux', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'Bruno ne peut pas créer une collection au nom d''Alice'
);

-- Un visiteur non connecté ne voit rien.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is_empty('select * from public.collections', 'un visiteur non connecté ne voit aucune collection');

-- Supprimer une collection supprime ses items (Alice).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.collections where id = '10000000-0000-0000-0000-000000000001';
select is_empty('select * from public.items', 'les items sont supprimés avec leur collection');
select is((select count(*)::int from public.collection_stats), 0, 'plus de statistiques après suppression');

select * from finish();
rollback;
