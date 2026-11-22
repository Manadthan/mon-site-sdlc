-- Tests du partage en lecture seule (ADR-06, US-17).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.fr');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

insert into public.collections (id, name, share_token) values
  ('10000000-0000-0000-0000-000000000001', 'Cartes', 'jeton-partage-cartes-0123456789abcdefghijkl'),
  ('10000000-0000-0000-0000-000000000002', 'Secrète', null);
insert into public.items (collection_id, title, position, owned) values
  ('10000000-0000-0000-0000-000000000001', 'B', 2, false),
  ('10000000-0000-0000-0000-000000000001', 'A', 1, true),
  ('10000000-0000-0000-0000-000000000002', 'Caché', 1, false);

select throws_ok(
  $$update public.collections set share_token = 'trop-court' where id = '10000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'un jeton mal formé est refusé'
);

-- Visiteur sans compte.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(
  public.shared_collection('jeton-partage-cartes-0123456789abcdefghijkl') -> 'name',
  '"Cartes"'::jsonb, 'le bon jeton donne la collection'
);
select is(
  (select jsonb_agg(e -> 'title') from jsonb_array_elements(
    public.shared_collection('jeton-partage-cartes-0123456789abcdefghijkl') -> 'items') e),
  '["A", "B"]'::jsonb, 'items dans l''ordre de la collection'
);
select is(
  public.shared_collection('jeton-partage-cartes-0123456789abcdefghijkl') -> 'items' -> 0 -> 'owned',
  'true'::jsonb, 'l''état possédé est visible'
);
select ok(
  not (public.shared_collection('jeton-partage-cartes-0123456789abcdefghijkl') ? 'user_id'),
  'le propriétaire n''est pas exposé'
);
select is(public.shared_collection('jeton-inconnu-00000000000000000000000000000'), null, 'un jeton inconnu ne donne rien');
select is(public.shared_collection(null), null, 'sans jeton : rien (une collection non partagée reste invisible)');
select is((select count(*) from public.collections), 0::bigint, 'le visiteur ne voit aucune collection directement');
select is_empty(
  $$update public.items set owned = true returning id$$,
  'le visiteur ne peut rien modifier'
);

-- Arrêter le partage : l'ancien lien ne marche plus.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
update public.collections set share_token = null where id = '10000000-0000-0000-0000-000000000001';
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is(public.shared_collection('jeton-partage-cartes-0123456789abcdefghijkl'), null, 'lien désactivé');

select * from finish();
rollback;
