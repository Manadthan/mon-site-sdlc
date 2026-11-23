-- Tests de la catégorie d'une collection (US-19, migration 0008).
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.fr');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$insert into public.collections (id, name, category) values ('10000000-0000-0000-0000-000000000001', 'Cartes DBZ', 'Cartes')$$,
  'une catégorie est acceptée'
);
select lives_ok(
  $$insert into public.collections (id, name) values ('10000000-0000-0000-0000-000000000002', 'Divers')$$,
  'la catégorie est facultative'
);
select throws_ok(
  $$insert into public.collections (name, category) values ('X', '')$$,
  '23514', null, 'une catégorie vide est refusée (NULL = sans catégorie)'
);
select throws_ok(
  $$insert into public.collections (name, category) values ('X', ' Cartes')$$,
  '23514', null, 'les espaces au début ou à la fin sont refusés'
);
select throws_ok(
  $$insert into public.collections (name, category) values ('X', 'Cartes  DBZ')$$,
  '23514', null, 'les espaces en double sont refusés'
);
select throws_ok(
  $$insert into public.collections (name, category) values ('X', repeat('a', 41))$$,
  '23514', null, 'plus de 40 caractères est refusé'
);

-- La liste partagée (US-17) donne la catégorie.
insert into public.partages (token) values ('jeton-alice-0123456789abcdefghijklmnopqrstu');
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is(
  (select jsonb_agg(e -> 'category' order by e ->> 'name') from jsonb_array_elements(
    public.shared_collections('jeton-alice-0123456789abcdefghijklmnopqrstu')) e),
  '["Cartes", null]'::jsonb, 'shared_collections renvoie la catégorie'
);

select * from finish();
rollback;
