-- Tests du partage en lecture seule de toutes les collections (ADR-06 révisé, US-17).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.fr');

-- Bruno a une collection, non partagée.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.collections (id, name) values ('10000000-0000-0000-0000-00000000000b', 'De Bruno');

-- Alice partage ses collections.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.collections (id, name, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'Cartes', '2026-01-01'),
  ('10000000-0000-0000-0000-000000000002', 'Mangas', '2026-01-02');
insert into public.items (collection_id, title, position, owned) values
  ('10000000-0000-0000-0000-000000000001', 'B', 2, false),
  ('10000000-0000-0000-0000-000000000001', 'A', 1, true);

select throws_ok(
  $$insert into public.partages (token) values ('trop-court')$$,
  '23514', null, 'un jeton mal formé est refusé'
);
insert into public.partages (token) values ('jeton-alice-0123456789abcdefghijklmnopqrstu');
select is((select user_id from public.partages), '00000000-0000-0000-0000-00000000000a'::uuid, 'le jeton appartient à Alice');

-- Bruno ne voit pas le jeton d'Alice et ne peut pas le remplacer.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is((select count(*) from public.partages), 0::bigint, 'Bruno ne voit pas le jeton d''Alice');
select throws_ok(
  $$insert into public.partages (user_id, token) values ('00000000-0000-0000-0000-00000000000a', 'jeton-pirate-0123456789abcdefghijklmnopqrst')$$,
  '42501', null, 'Bruno ne peut pas créer un jeton pour Alice'
);

-- Visiteur sans compte.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(
  (select jsonb_agg(e -> 'name') from jsonb_array_elements(public.shared_collections('jeton-alice-0123456789abcdefghijklmnopqrstu')) e),
  '["Cartes", "Mangas"]'::jsonb, 'le jeton donne toutes les collections d''Alice, et seulement elles'
);
select is(
  public.shared_collections('jeton-alice-0123456789abcdefghijklmnopqrstu') -> 0 -> 'owned',
  '1'::jsonb, 'avec leurs statistiques'
);
select ok(
  not (public.shared_collections('jeton-alice-0123456789abcdefghijklmnopqrstu') -> 0 ? 'user_id'),
  'le propriétaire n''est pas exposé'
);
select is(
  (select jsonb_agg(e -> 'title') from jsonb_array_elements(
    public.shared_collection('jeton-alice-0123456789abcdefghijklmnopqrstu', '10000000-0000-0000-0000-000000000001') -> 'items') e),
  '["A", "B"]'::jsonb, 'une collection et ses items, dans l''ordre'
);
select is(
  public.shared_collection('jeton-alice-0123456789abcdefghijklmnopqrstu', '10000000-0000-0000-0000-00000000000b'),
  null, 'la collection d''un autre compte reste invisible avec ce jeton'
);
select is(public.shared_collections('jeton-inconnu-00000000000000000000000000000'), null, 'un jeton inconnu ne donne rien');
select is(public.shared_collections(null), null, 'sans jeton : rien');
select is((select count(*) from public.collections), 0::bigint, 'le visiteur ne voit aucune collection directement');
select is((select count(*) from public.partages), 0::bigint, 'le visiteur ne voit aucun jeton');
select is_empty($$update public.items set owned = true returning id$$, 'le visiteur ne peut rien modifier');

-- Arrêter le partage : l'ancien lien ne marche plus.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.partages;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is(public.shared_collections('jeton-alice-0123456789abcdefghijklmnopqrstu'), null, 'lien désactivé');

select * from finish();
rollback;
